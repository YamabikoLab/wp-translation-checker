/**
 * Style Guide / Glossary を共通の1指摘カードとして表示し、原文・翻訳比較、修正案の再チェック、一次情報参照を提供する。
 *
 * Markdown コピーは利用する画面の出力方針に応じて提供し、指摘種別ごとの差分は根拠情報の表示だけに閉じる。
 * 一覧操作や修正操作は共通 Finding の契約を利用する。
 */

import { useEffect, useState } from 'react'
import { useUiTranslation } from '../i18n/i18n'
import { ExpandableText } from './ExpandableText'
import { FindingCorrection } from './FindingCorrection'
import { copyFindingMarkdown } from './finding-markdown-copy'
import type { Finding } from './presentation-model'
import styles from './TranslationChecker.module.css'

const STYLE_GUIDE_URL =
  'https://ja.wordpress.org/team/handbook/translation/translation-style-guide/'
const GLOSSARY_URL =
  'https://translate.wordpress.org/locale/ja/default/glossary/'

/**
 * 1件の共通 Finding を表示する。
 *
 * @param props 指摘表示に必要な属性。
 * @param props.finding 表示対象の1指摘。
 * @param props.showMarkdownCopy Markdown コピーを提供する場合は true。省略時は既存の指摘一覧と同様に提供する。
 * @returns 共通の比較・修正操作と、指摘種別に応じた根拠情報を含むカード。
 */
export function FindingCard({
  finding,
  showMarkdownCopy = true,
}: {
  finding: Finding
  showMarkdownCopy?: boolean
}) {
  const { t } = useUiTranslation()
  const translation =
    finding.entry.translations.find(
      (form) => form.index === finding.translationFormIndex,
    )?.text ?? ''
  const singularMatches =
    finding.kind === 'glossary'
      ? finding.glossary.sourceMatches
          .filter((match) => match.source === 'singular')
          .map(({ start, end }) => ({ start, end }))
      : []
  const pluralMatches =
    finding.kind === 'glossary'
      ? finding.glossary.sourceMatches
          .filter((match) => match.source === 'plural')
          .map(({ start, end }) => ({ start, end }))
      : []
  const [copyFeedback, setCopyFeedback] = useState<
    'success' | 'failure' | null
  >(null)

  useEffect(() => {
    if (copyFeedback === null) {
      return
    }

    // コピー結果は操作直後の確認にだけ使い、次の操作を妨げない短時間のフィードバックとして自動解除する。
    const timeoutId = window.setTimeout(() => {
      setCopyFeedback(null)
    }, 2000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [copyFeedback])

  /** 表示中の1指摘をコピーし、その結果だけをカード内の一時フィードバックとして反映する。 */
  const handleMarkdownCopy = async () => {
    setCopyFeedback(await copyFindingMarkdown(finding))
  }

  return (
    <article className={styles.finding}>
      <div className={styles.findingHeader}>
        <span
          className={
            finding.severity === 'Error'
              ? styles.errorBadge
              : styles.warningBadge
          }
        >
          {finding.severity}
        </span>
        <p className={styles.findingMessage}>
          {finding.kind === 'glossary'
            ? t('finding.glossaryMessage', {
                term: finding.glossary.originalTerm,
              })
            : finding.message}
        </p>
      </div>

      <div className={styles.comparison}>
        <section className={styles.comparisonPanel}>
          <h3>{t('finding.source')}</h3>
          <ExpandableText
            text={finding.entry.source.singular}
            matches={singularMatches}
          />
          {finding.entry.source.plural !== undefined && (
            <div className={styles.pluralSource}>
              <h4>{t('finding.pluralSource')}</h4>
              <ExpandableText
                text={finding.entry.source.plural}
                matches={pluralMatches}
              />
            </div>
          )}
        </section>
        <section className={styles.comparisonPanel}>
          <h3>{t('finding.translation')}</h3>
          <ExpandableText text={translation} matches={finding.matches} />
        </section>
      </div>

      {finding.kind === 'glossary' && (
        <div className={styles.glossaryContent}>
          <div>
            <h3>{t('finding.glossaryCandidates')}</h3>
            <ul>
              {finding.glossary.candidates.map((candidate, index) => (
                <li
                  key={`${candidate.translation}-${candidate.partOfSpeech ?? ''}-${index}`}
                >
                  <strong>
                    {candidate.translation || t('finding.omittedTranslation')}
                  </strong>
                  {candidate.partOfSpeech !== undefined && (
                    <span> / {candidate.partOfSpeech}</span>
                  )}
                  {candidate.comment !== undefined && (
                    <p>{candidate.comment}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <FindingCorrection finding={finding} />

      <div className={styles.findingFooter}>
        <p className={styles.guideReference}>
          <span>
            {finding.kind === 'glossary'
              ? t('finding.glossaryItem')
              : t('finding.styleGuideItem', { item: finding.styleGuideItem })}
          </span>
          <a
            href={finding.kind === 'glossary' ? GLOSSARY_URL : STYLE_GUIDE_URL}
            target="_blank"
            rel="noreferrer"
          >
            {finding.kind === 'glossary'
              ? t('finding.glossaryLink')
              : t('finding.styleGuideLink')}
          </a>
        </p>
        {/* このカードを利用する画面がクリップボード出力を許可する場合だけ、Markdown コピー操作を提供する。 */}
        {showMarkdownCopy && (
          <button
            type="button"
            className={styles.findingCopyButton}
            onClick={handleMarkdownCopy}
          >
            <span aria-live="polite">
              {copyFeedback === 'success'
                ? t('finding.copied')
                : copyFeedback === 'failure'
                  ? t('finding.copyFailed')
                  : t('finding.copyMarkdown')}
            </span>
          </button>
        )}
      </div>
    </article>
  )
}
