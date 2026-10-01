/**
 * 原文と翻訳文を1件だけ直接入力し、PO ファイルを用意せず日本語 Style Guide / Glossary を確認する責任を持つ。
 *
 * 入力状態と結果はこのコンポーネント内だけで扱い、PO ファイル確認の状態管理や Export 機能へ混在させない。
 */

import { useState } from 'react'
import { checkEntry } from '@/check/check'
import { createFindings, summarizeFindings, type Finding } from './presentation-model'
import { FindingCard } from './FindingCard'
import styles from './TranslationChecker.module.css'

/** クイックチェックで Validation Core へ渡す各入力の最大文字数。 */
const MAX_QUICK_CHECK_LENGTH = 100_000

/** クイックチェックの確認結果または入力制限状態を表す。 */
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
  const [source, setSource] = useState('')
  const [translation, setTranslation] = useState('')
  const [result, setResult] = useState<QuickCheckResult>({ status: 'idle' })

  const canCheck = source.length > 0 && translation.length > 0
  const findings = result.status === 'checked' ? result.findings : []
  const summary = summarizeFindings(findings)

  /**
   * 現在の原文・翻訳文を1件の正規化済み entry として共通 Validation Core へ渡す。
   */
  const handleCheck = () => {
    if (!canCheck) {
      return
    }

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
        <h2 id="quick-check-title">1文をすぐ確認</h2>
        <p className={styles.secondaryText}>
          原文と翻訳文を入力すると、PO ファイルなしで確認できます。
        </p>
      </div>

      <label className={styles.quickCheckField}>
        <span>原文</span>
        <textarea
          value={source}
          rows={4}
          onChange={(event) => {
            setSource(event.target.value)
            setResult({ status: 'idle' })
          }}
        />
      </label>

      <label className={styles.quickCheckField}>
        <span>翻訳文</span>
        <textarea
          value={translation}
          rows={4}
          onChange={(event) => {
            setTranslation(event.target.value)
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
        確認する
      </button>

      <div className={styles.quickCheckStatus} role="status" aria-live="polite">
        {result.status === 'too-large' && (
          <p>
            原文または翻訳文が長すぎるため確認できません。各 100,000
            文字以下にしてください。
          </p>
        )}
        {result.status === 'checked' && (
          <p>
            確認完了。Error {summary.errorCount}件、Warning{' '}
            {summary.warningCount}件です。
          </p>
        )}
      </div>

      {result.status === 'checked' && summary.totalCount === 0 && (
        <div className={styles.noFindings}>
          <p>WTC の自動チェックでは問題が見つかりませんでした。</p>
        </div>
      )}

      {result.status === 'checked' && findings.length > 0 && (
        <div className={styles.quickCheckFindings}>
          {findings.map((finding) => (
            <FindingCard key={finding.key} finding={finding} />
          ))}
        </div>
      )}
    </section>
  )
}
