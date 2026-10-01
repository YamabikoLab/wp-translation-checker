/**
 * 原文と翻訳文を1件だけ直接入力し、PO ファイルを用意せず日本語翻訳スタイルガイドと Glossary を確認する責任を持つ。
 *
 * 入力、入力制限、確認結果はこのコンポーネント内だけで扱い、PO ファイル確認の状態管理や
 * ファイル・クリップボードへの出力機能へ混在させない。利用者が入力を変更した場合は、
 * 変更前の確認結果を現在の入力結果として残さない。
 */

import { useState } from 'react'
import { checkEntry } from '@/check/check'
import { useUiTranslation } from '@/i18n/i18n'
import {
  createFindings,
  summarizeFindings,
  type Finding,
} from './presentation-model'
import { FindingCard } from './FindingCard'
import styles from './TranslationChecker.module.css'

/** クイックチェックで検証処理へ渡せる原文・翻訳文それぞれの最大文字数。 */
const MAX_QUICK_CHECK_LENGTH = 100_000

/** クイックチェックについて、未確認・入力超過・確認済みを利用者から見た状態として表す。 */
type QuickCheckResult =
  | { status: 'idle' }
  | { status: 'too-large' }
  | { status: 'checked'; findings: readonly Finding[] }

/**
 * 原文と翻訳文を直接入力して1件だけ確認する UI を提供する。
 *
 * @returns PO ファイルを使わない1件確認フォームと結果表示。
 */
export function QuickCheck() {
  const { t } = useUiTranslation()
  const [source, setSource] = useState('')
  const [translation, setTranslation] = useState('')
  const [result, setResult] = useState<QuickCheckResult>({ status: 'idle' })

  // 原文と翻訳文の双方がそろうまで確認操作を開始できない仕様を、操作可否へ反映する。
  const canCheck = source.length > 0 && translation.length > 0
  // 確認済み結果だけを現在入力に対応する指摘として扱い、未確認・入力超過時は過去の指摘を表示しない。
  const findings = result.status === 'checked' ? result.findings : []
  const summary = summarizeFindings(findings)

  /**
   * 現在の原文・翻訳文を1件の翻訳情報として共通検証へ渡す。
   *
   * 入力上限を超える場合は検証処理を開始せず、利用者へ確認不能の理由を通知する。
   */
  const handleCheck = () => {
    // 必須入力がそろっていない状態では、表示状態を変更せず確認要求を開始しない。
    if (!canCheck) {
      return
    }

    // 過大な直接入力は検証前に拒否し、同期処理へ不要な負荷を渡さない。
    if (
      source.length > MAX_QUICK_CHECK_LENGTH ||
      translation.length > MAX_QUICK_CHECK_LENGTH
    ) {
      setResult({ status: 'too-large' })
      return
    }

    const checked = checkEntry({
      entryIndex: 0,
      source: { singular: source },
      translations: [{ index: 0, text: translation }],
    })

    setResult({
      status: 'checked',
      findings: createFindings(checked),
    })
  }

  return (
    <section
      className={`${styles.inputCard} ${styles.quickCheckCard}`}
      aria-labelledby="quick-check-title"
    >
      <div>
        <h2 id="quick-check-title">{t('quick.title')}</h2>
        <p className={styles.secondaryText}>{t('quick.hint')}</p>
      </div>

      <label className={styles.quickCheckField}>
        <span>{t('quick.source')}</span>
        <textarea
          value={source}
          rows={4}
          onChange={(event) => {
            setSource(event.target.value)
            // 入力が変わった時点で以前の確認結果との対応が切れるため、次の確認まで未確認状態へ戻す。
            setResult({ status: 'idle' })
          }}
        />
      </label>

      <label className={styles.quickCheckField}>
        <span>{t('quick.translation')}</span>
        <textarea
          value={translation}
          rows={4}
          onChange={(event) => {
            setTranslation(event.target.value)
            // 入力が変わった時点で以前の確認結果との対応が切れるため、次の確認まで未確認状態へ戻す。
            setResult({ status: 'idle' })
          }}
        />
      </label>

      <button
        type="button"
        className={styles.checkButton}
        disabled={!canCheck}
        onClick={handleCheck}
      >
        {t('quick.check')}
      </button>

      <div className={styles.quickCheckStatus} role="status" aria-live="polite">
        {/* 入力上限超過時は通常結果ではなく、確認を実行できない理由を通知する。 */}
        {result.status === 'too-large' && <p>{t('quick.tooLarge')}</p>}
        {/* 確認済みの場合だけ、現在入力に対応する Error / Warning 件数を通知する。 */}
        {result.status === 'checked' && (
          <p>
            {t('quick.completed', {
              errorCount: summary.errorCount,
              warningCount: summary.warningCount,
            })}
          </p>
        )}
      </div>

      {/* 確認済みで指摘が0件の場合だけ、現在入力に対する指摘なし案内を表示する。 */}
      {result.status === 'checked' && summary.totalCount === 0 && (
        <div className={styles.noFindings}>
          <p>{t('quick.noFindings')}</p>
        </div>
      )}

      {/* 確認済みで指摘がある場合だけ、既存の指摘カードを同じ判断材料として表示する。 */}
      {result.status === 'checked' && findings.length > 0 && (
        <div className={styles.quickCheckFindings}>
          {findings.map((finding) => (
            <FindingCard
              key={finding.key}
              finding={finding}
              showMarkdownCopy={false}
            />
          ))}
        </div>
      )}
    </section>
  )
}
