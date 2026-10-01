/**
 * WTC のトップ画面として、1件の直接入力確認と PO ファイル確認を並べ、確認結果を利用者へ表示する責任を持つ。
 *
 * 直接入力の状態は QuickCheck に委ね、PO ファイル確認の File API と画面状態だけをこの画面表示境界に閉じる。
 * 個別ルールやロケール判定は再実装せず、検証処理の公開入口を利用する。
 */

import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { checkPo } from '@/check/check'
import { useUiTranslation } from '../i18n/i18n'
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
import { LanguageSwitcher } from './LanguageSwitcher'
import { QuickCheck } from './QuickCheck'
import { serializeCsv, serializeJson, serializeMarkdown } from './result-export'
import styles from './TranslationChecker.module.css'

/** ブラウザー内で読み込み・解析を開始する PO ファイルの最大サイズ。 */
const MAX_PO_FILE_SIZE_BYTES = 20 * 1024 * 1024

/** Markdown コピー操作の結果として利用者へ通知する状態。 */
type CopyFeedback = 'success' | 'failure' | null

/**
 * WTC v1 の直接入力確認、PO ファイル確認、PO 確認結果表示を構成する画面コンポーネント。
 *
 * @returns 直接入力と PO ファイル確認の双方をブラウザー内で完結して利用できる翻訳確認画面。
 */
export function TranslationChecker() {
  const { t } = useUiTranslation()
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
        <div className={styles.introTop}>
          <p className={styles.eyebrow}>YamabikoLab</p>
          <LanguageSwitcher />
        </div>
        <h1>{t('app.title')}</h1>
        <p className={styles.version}>v{__APP_VERSION__}</p>
        <p className={styles.lead}>{t('app.lead')}</p>
        <p className={styles.privacy}>{t('app.privacy')}</p>
      </header>

      <QuickCheck />

      <section className={styles.inputCard} aria-labelledby="file-input-title">
        <div>
          <h2 id="file-input-title">{t('app.fileTitle')}</h2>
          <p className={styles.secondaryText}>{t('app.fileHint')}</p>
        </div>

        <label className={styles.fileInput}>
          <span>{t('app.fileLabel')}</span>
          <input
            type="file"
            accept=".po,text/x-gettext-translation"
            onChange={handleFileChange}
          />
        </label>

        {/* 実ファイルが選択済みの場合だけ、現在の確認対象を利用者へ示す。 */}
        {selectedFile !== null && (
          <p className={styles.selectedFile}>
            {t('app.selectedFile', { fileName: selectedFile.name })}
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
          {state.status === 'checking' ? t('app.checking') : t('app.check')}
        </button>

        {/* 確認処理の進行中だけ状態通知を表示する。 */}
        {state.status === 'checking' && (
          <p className={styles.checking} role="status">
            {t('app.checkingFile', { fileName: state.file.name })}
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
              <p className={styles.eyebrow}>{t('app.completedEyebrow')}</p>
              <h2 id="result-summary-title">{t('app.completedTitle')}</h2>
            </div>

            <dl className={styles.counts}>
              <div className={styles.errorCount}>
                <dt>Error</dt>
                <dd>{t('app.errorCount', { count: summary.errorCount })}</dd>
              </div>
              <div className={styles.warningCount}>
                <dt>Warning</dt>
                <dd>
                  {t('app.warningCount', { count: summary.warningCount })}
                </dd>
              </div>
            </dl>

            {/* Style Guide と Glossary の双方で指摘がない場合だけ、指摘なしの案内を表示する。 */}
            {summary.totalCount === 0 && (
              <div className={styles.noFindings}>
                <p>{t('app.noFindings')}</p>
                <p>{t('app.manualAlso')}</p>
              </div>
            )}

            <CheckScopeGuide />

            <div className={styles.exportArea}>
              <div>
                <h3>{t('app.exportTitle')}</h3>
                <p>{t('app.exportHint')}</p>
              </div>
              <div className={styles.exportActions}>
                <button
                  type="button"
                  className={styles.exportButton}
                  onClick={handleCsvDownload}
                >
                  {t('app.csvDownload')}
                </button>
                <button
                  type="button"
                  className={styles.exportButton}
                  onClick={handleJsonDownload}
                >
                  {t('app.jsonDownload')}
                </button>
                <button
                  type="button"
                  className={styles.exportButton}
                  onClick={handleMarkdownCopy}
                >
                  {t('app.markdownCopy')}
                </button>
              </div>
              {/* コピー成功時だけ完了通知を表示する。 */}
              {copyFeedback === 'success' && (
                <p className={styles.copySuccess} role="status">
                  {t('app.markdownCopied')}
                </p>
              )}
              {/* コピー失敗時だけ、利用者が対処できるエラー通知を表示する。 */}
              {copyFeedback === 'failure' && (
                <p className={styles.copyFailure} role="alert">
                  {t('app.markdownCopyFailed')}
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
                <h2 id="findings-title">{t('app.findingsTitle')}</h2>
                <p>
                  {t('app.findingsCount', { count: filteredFindings.length })}
                </p>
              </div>

              <label className={styles.ruleFilter}>
                <span>{t('app.filterLabel')}</span>
                <select
                  value={selectedRule ?? ''}
                  onChange={(event) => {
                    // 空の選択値は「すべてのルール」を表す null へ戻す。
                    setSelectedRule(event.target.value || null)
                    setPage(1)
                  }}
                >
                  <option value="">{t('app.allItems')}</option>
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
