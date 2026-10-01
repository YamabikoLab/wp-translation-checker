/**
 * WTC のトップ画面として、1件の直接入力確認と PO ファイル確認を並べ、確認結果を利用者へ表示する責任を持つ。
 *
 * 直接入力の状態は QuickCheck に委ね、PO ファイル確認の File API と画面状態だけをこの Presentation 境界に閉じる。
 * 個別ルールやロケール判定は再実装せず、Validation の公開入口を利用する。
 */

import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { checkPo } from '@/check/check'
import {
  createFindings,
  createPaginationModel,
  createRuleFilterOptions,
  DEFAULT_PAGE_SIZE,
  filterFindingsByRule,
  PAGE_SIZE_OPTIONS,
  getCompletionFocusTarget,
  presentationReducer,
  summarizeFindings,
} from './presentation-model'
import { CheckScopeGuide } from './CheckScopeGuide'
import { Feedback } from './Feedback'
import { FindingCard } from './FindingCard'
import { PaginationControls } from './PaginationControls'
import { QuickCheck } from './QuickCheck'
import { serializeCsv, serializeJson, serializeMarkdown } from './result-export'
import styles from './TranslationChecker.module.css'

const STYLE_GUIDE_LAST_UPDATED = '2026年8月28日'

/** ブラウザー内で読み込み・解析を開始する PO ファイルの最大サイズ。 */
const MAX_PO_FILE_SIZE_BYTES = 20 * 1024 * 1024

/** Markdown コピー操作の結果として利用者へ通知する状態。 */
type CopyFeedback = 'success' | 'failure' | null

/**
 * WTC v1 の直接入力確認、PO ファイル確認、PO 確認結果表示を構成する Presentation コンポーネント。
 *
 * @returns 直接入力と PO ファイル確認の双方をブラウザー内で完結して利用できる翻訳確認画面。
 */
export function TranslationChecker() {
  const [state, dispatch] = useReducer(presentationReducer, {
    status: 'no-file',
  })
  const activeFileRef = useRef<File | null>(null)
  const feedbackRef = useRef<HTMLElement>(null)
  const summaryRef = useRef<HTMLElement>(null)
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>(null)
  const [selectedRule, setSelectedRule] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const focusTarget = getCompletionFocusTarget(state)

  useEffect(() => {
    // 確認不能時だけ重要なフィードバック領域へフォーカスを移し、通常操作中のフォーカスは奪わない。
    if (focusTarget === 'feedback') {
      feedbackRef.current?.focus()
    }

    // 正常完了時だけ結果概要へフォーカスを移し、確認完了をキーボード利用者へ到達させる。
    if (focusTarget === 'summary') {
      summaryRef.current?.focus()
    }
  }, [focusTarget])

  /**
   * 利用者が選択した File を現在入力として採用し、以前の結果を画面状態から外す。
   *
   * @param event ファイル入力の変更イベント。
   */
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    // ブラウザーから実ファイルが選択されていない変更イベントは現在入力を変更しない。
    if (file === undefined) {
      return
    }

    activeFileRef.current = null
    setCopyFeedback(null)
    setSelectedRule(null)
    setPage(1)
    dispatch({ type: 'select-file', file })
  }

  /**
   * 現在選択中の File を文字列として読み取り、Check Orchestration の公開入口へ渡す。
   *
   * 同じ File の確認が進行中なら重複実行せず、入力差し替え後の古い完了結果は reducer が適用しない。
   */
  const handleCheck = async () => {
    // 入力がない状態と確認進行中は、新しい確認要求を開始できない。
    if (state.status === 'no-file' || state.status === 'checking') {
      return
    }

    const file = state.file

    // 過大なファイルはブラウザーへ全体を読み込む前に拒否し、メモリ消費と同期処理負荷を抑える。
    if (file.size > MAX_PO_FILE_SIZE_BYTES) {
      activeFileRef.current = null
      setCopyFeedback(null)
      setSelectedRule(null)
      setPage(1)
      dispatch({ type: 'file-too-large', file })
      return
    }

    // 同一 File の確認がすでに進行中なら、重複した非同期処理を開始しない。
    if (activeFileRef.current === file) {
      return
    }

    activeFileRef.current = file
    setCopyFeedback(null)
    setSelectedRule(null)
    setPage(1)
    dispatch({ type: 'start-check' })

    let source: string

    try {
      source = await file.text()
    } catch {
      // この File が現在も進行中の入力である場合だけ進行中マーカーを解除する。
      if (activeFileRef.current === file) {
        activeFileRef.current = null
      }

      dispatch({ type: 'file-read-failure', file })
      return
    }

    const result = checkPo(source)

    if (activeFileRef.current === file) {
      activeFileRef.current = null
    }

    dispatch({ type: 'check-completed', file, result })
  }

  /**
   * 正常完了した現在の確認結果を、指定形式のローカルファイルとして保存する。
   *
   * @param content 保存する出力文字列。
   * @param extension 出力形式を表す拡張子。
   * @param mediaType 出力形式に対応する MIME type。
   */
  const downloadResult = (
    content: string,
    extension: 'csv' | 'json',
    mediaType: string,
  ) => {
    // 正常完了結果がない状態では、過去または途中のデータを保存対象にしない。
    if (state.status !== 'success') {
      return
    }

    const baseName = state.file.name.replace(/\.po$/i, '')
    const blob = new Blob([content], { type: mediaType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${baseName}-wtc-results.${extension}`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  /**
   * 現在の確認結果全体を CSV として保存する。
   */
  const handleCsvDownload = () => {
    downloadResult(serializeCsv(findings), 'csv', 'text/csv;charset=utf-8')
  }

  /**
   * 現在の確認結果全体を JSON として保存する。
   */
  const handleJsonDownload = () => {
    // 正常完了結果がない状態では JSON 出力を開始しない。
    if (state.status !== 'success') {
      return
    }

    downloadResult(
      serializeJson(state.file.name, findings),
      'json',
      'application/json;charset=utf-8',
    )
  }

  /**
   * 現在の確認結果全体を Markdown としてクリップボードへコピーする。
   *
   * Clipboard API を利用できない場合や書き込みに失敗した場合は、成功扱いにせず利用者へ通知する。
   */
  const handleMarkdownCopy = async () => {
    // 正常完了結果がない状態では Markdown コピーを開始しない。
    if (state.status !== 'success') {
      return
    }

    // Clipboard API を利用できない環境はコピー失敗として利用者へ通知する。
    if (navigator.clipboard?.writeText === undefined) {
      setCopyFeedback('failure')
      return
    }

    try {
      await navigator.clipboard.writeText(
        serializeMarkdown(state.file.name, findings),
      )
      setCopyFeedback('success')
    } catch {
      setCopyFeedback('failure')
    }
  }

  // ファイル未選択状態だけ現在入力を持たないものとして表示用状態へ変換する。
  const selectedFile = state.status === 'no-file' ? null : state.file
  // 正常完了結果だけを Style Guide / Glossary 共通の表示モデルへ変換し、途中状態や確認不能結果は一覧化しない。
  const findings =
    state.status === 'success' ? createFindings(state.result) : []
  const summary = summarizeFindings(findings)
  const ruleFilterOptions = createRuleFilterOptions(findings)
  const filteredFindings = filterFindingsByRule(findings, selectedRule)
  const pagination = createPaginationModel(filteredFindings, page, pageSize)

  /**
   * 表示件数を変更し、新しいページ構成を1ページ目から表示する。
   *
   * @param nextPageSize 新しい1ページあたりの表示件数。
   */
  const handlePageSizeChange = (nextPageSize: number) => {
    // 画面で提供していない表示件数は Presentation 状態へ取り込まない。
    if (
      !PAGE_SIZE_OPTIONS.includes(
        nextPageSize as (typeof PAGE_SIZE_OPTIONS)[number],
      )
    ) {
      return
    }

    setPageSize(nextPageSize)
    setPage(1)
  }

  return (
    <main className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>YamabikoLab</p>
        <h1>WP 翻訳チェッカー</h1>
        <p className={styles.version}>v{__APP_VERSION__}</p>
        <p className={styles.lead}>
          WordPress 日本語翻訳スタイルガイド（{STYLE_GUIDE_LAST_UPDATED}
          最終更新）の対象ルールと、日本語 Glossary
          の登録訳語をブラウザー内で確認します。
        </p>
        <p className={styles.privacy}>
          入力・選択した翻訳内容は外部の確認サービスへ送信しません。
        </p>
      </header>

      <QuickCheck />

      <section className={styles.inputCard} aria-labelledby="file-input-title">
        <div>
          <h2 id="file-input-title">PO ファイルを選択</h2>
          <p className={styles.secondaryText}>
            ファイルを選択しただけでは確認を開始しません。
          </p>
        </div>

        <label className={styles.fileInput}>
          <span>.po ファイル</span>
          <input
            type="file"
            accept=".po,text/x-gettext-translation"
            onChange={handleFileChange}
          />
        </label>

        {/* 実ファイルが選択済みの場合だけ、現在の確認対象を利用者へ示す。 */}
        {selectedFile !== null && (
          <p className={styles.selectedFile}>
            選択中: <strong>{selectedFile.name}</strong>
          </p>
        )}

        {/* 入力未選択または確認進行中は、新しい確認を開始できない状態として操作を無効化する。 */}
        <button
          type="button"
          className={styles.checkButton}
          disabled={selectedFile === null || state.status === 'checking'}
          onClick={handleCheck}
        >
          {/* 進行中は操作名ではなく現在状態を示し、重複操作を促さない。 */}
          {state.status === 'checking' ? '確認中…' : '確認する'}
        </button>

        {/* 確認処理の進行中だけ状態通知を表示する。 */}
        {state.status === 'checking' && (
          <p className={styles.checking} role="status">
            {state.file.name} を確認しています。
          </p>
        )}
      </section>

      {/* 確認不能状態だけ、原因に応じたフィードバック領域を表示する。 */}
      {state.status === 'feedback' && (
        <section
          ref={feedbackRef}
          className={styles.feedback}
          tabIndex={-1}
          aria-live="polite"
        >
          <Feedback state={state} />
        </section>
      )}

      {/* 正常完了後だけ、結果概要と各指摘を表示する。 */}
      {state.status === 'success' && (
        <>
          <section
            ref={summaryRef}
            className={styles.summary}
            tabIndex={-1}
            aria-labelledby="result-summary-title"
          >
            <div>
              <p className={styles.eyebrow}>確認完了</p>
              <h2 id="result-summary-title">確認が正常に完了しました</h2>
            </div>

            <dl className={styles.counts}>
              <div className={styles.errorCount}>
                <dt>Error</dt>
                <dd>{summary.errorCount}件</dd>
              </div>
              <div className={styles.warningCount}>
                <dt>Warning</dt>
                <dd>{summary.warningCount}件</dd>
              </div>
            </dl>

            {/* Style Guide と Glossary の双方で指摘がない場合だけ、指摘なしの案内を表示する。 */}
            {summary.totalCount === 0 && (
              <div className={styles.noFindings}>
                <p>WTC の自動チェックでは問題が見つかりませんでした。</p>
                <p>手動で確認したい項目もあります。</p>
              </div>
            )}

            <CheckScopeGuide />

            <div className={styles.exportArea}>
              <div>
                <h3>確認結果を共有・保存</h3>
                <p>
                  CSV / JSON はファイルとして保存し、Markdown
                  はクリップボードへコピーします。
                </p>
              </div>
              <div className={styles.exportActions}>
                <button
                  type="button"
                  className={styles.exportButton}
                  onClick={handleCsvDownload}
                >
                  CSV をダウンロード
                </button>
                <button
                  type="button"
                  className={styles.exportButton}
                  onClick={handleJsonDownload}
                >
                  JSON をダウンロード
                </button>
                <button
                  type="button"
                  className={styles.exportButton}
                  onClick={handleMarkdownCopy}
                >
                  Markdown をコピー
                </button>
              </div>
              {/* コピー成功時だけ完了通知を表示する。 */}
              {copyFeedback === 'success' && (
                <p className={styles.copySuccess} role="status">
                  Markdown をクリップボードへコピーしました。
                </p>
              )}
              {/* コピー失敗時だけ、利用者が対処できるエラー通知を表示する。 */}
              {copyFeedback === 'failure' && (
                <p className={styles.copyFailure} role="alert">
                  Markdown
                  をコピーできませんでした。ブラウザーのクリップボード利用設定を確認してください。
                </p>
              )}
            </div>
          </section>

          {/* Style Guide と Glossary の共通指摘が存在する場合だけ、同じ一覧操作を表示する。 */}

          {findings.length > 0 && (
            <section
              className={styles.findingsSection}
              aria-labelledby="findings-title"
            >
              <div className={styles.findingsHeading}>
                <h2 id="findings-title">指摘一覧</h2>
                <p>{filteredFindings.length}件の指摘</p>
              </div>

              <label className={styles.ruleFilter}>
                <span>項目で絞り込む</span>
                <select
                  value={selectedRule ?? ''}
                  onChange={(event) => {
                    // 空の選択値は「すべてのルール」を表す null へ戻す。
                    setSelectedRule(event.target.value || null)
                    setPage(1)
                  }}
                >
                  <option value="">すべての項目</option>
                  {ruleFilterOptions.map((option) => (
                    <option
                      key={option.styleGuideItem}
                      value={option.styleGuideItem}
                    >
                      {option.styleGuideItem} ({option.count})
                    </option>
                  ))}
                </select>
              </label>

              <PaginationControls
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                pageSize={pageSize}
                totalCount={pagination.totalCount}
                rangeStart={pagination.rangeStart}
                rangeEnd={pagination.rangeEnd}
                items={pagination.items}
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
              />

              <div className={styles.findingsList}>
                {pagination.visibleFindings.map((finding) => (
                  <FindingCard key={finding.key} finding={finding} />
                ))}
              </div>

              <PaginationControls
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                pageSize={pageSize}
                totalCount={pagination.totalCount}
                rangeStart={pagination.rangeStart}
                rangeEnd={pagination.rangeEnd}
                items={pagination.items}
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
              />
            </section>
          )}
        </>
      )}
    </main>
  )
}
