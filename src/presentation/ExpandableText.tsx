/**
 * 原文または翻訳を長文時に折りたたみ、翻訳の問題箇所を視覚的に強調して表示する責任を持つ。
 *
 * 展開状態と一致範囲の表示調整をこのコンポーネント内に閉じ、Style Guide の翻訳箇所と Glossary の原文箇所を同じ強調表示で扱う。
 */

import { useState } from 'react'
import { useUiTranslation } from '@/i18n/i18n'
import { getCollapsedText, type Finding } from './presentation-model'
import styles from './TranslationChecker.module.css'

/**
 * 200文字を超える原文または翻訳を、利用者が個別に展開・折りたたみできる形で表示する。
 *
 * @param props 文字列表示に必要な属性。
 * @param props.text 表示対象の文字列。
 * @param props.matches 表示文字列内で強調する一致範囲。強調不要の場合は省略可能。
 * @returns 長文時だけ展開操作を持つ文字列表示。
 */
export function ExpandableText({
  text,
  matches = [],
}: {
  text: string
  matches?: Finding['matches']
}) {
  const { t } = useUiTranslation()
  const [expanded, setExpanded] = useState(false)
  const { isLong, collapsed } = getCollapsedText(text)
  const displayedText = isLong && !expanded ? collapsed : text
  const originalVisibleEnd =
    isLong && !expanded ? collapsed.slice(0, -1).length : text.length
  const visibleMatches = matches
    .map(({ start, end }) => ({
      start: Math.max(0, start),
      end: Math.min(end, originalVisibleEnd),
    }))
    .filter(({ start, end }) => start < end)
    .sort((left, right) => left.start - right.start || left.end - right.end)
  const normalizedMatches: Array<Finding['matches'][number]> = []

  // 重複・隣接する範囲を1つへまとめ、同じ文字を欠落・重複させずに表示する。
  for (const match of visibleMatches) {
    const previous = normalizedMatches[normalizedMatches.length - 1]

    if (previous !== undefined && match.start <= previous.end) {
      normalizedMatches[normalizedMatches.length - 1] = {
        start: previous.start,
        end: Math.max(previous.end, match.end),
      }
    } else {
      normalizedMatches.push(match)
    }
  }

  const content = []
  let cursor = 0

  // 元の表示文字列を順番どおり保持し、指摘対象の一致範囲だけを視覚的な強調へ変換する。
  for (const [index, match] of normalizedMatches.entries()) {
    content.push(displayedText.slice(cursor, match.start))
    content.push(
      <mark
        className={styles.ngMatch}
        key={`${match.start}-${match.end}-${index}`}
      >
        {displayedText.slice(match.start, match.end)}
      </mark>,
    )
    cursor = match.end
  }
  content.push(displayedText.slice(cursor))

  if (!isLong) {
    return <p className={styles.translationText}>{content}</p>
  }

  return (
    <div>
      <p className={styles.translationText}>{content}</p>
      <button
        type="button"
        className={styles.textToggle}
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? t('expandable.collapse') : t('expandable.expand')}
      </button>
    </div>
  )
}
