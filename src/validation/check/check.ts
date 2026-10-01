/**
 * 1回の翻訳確認について、PO Interpretation、Locale Resolution、日本語 v1 Check を順に接続する責任を持つ。
 *
 * 正常完了と、入力解析不能・ロケール判定不能・未対応ロケールを意味上区別し、
 * Presentation が1つの公開入口から確認全体の結果を受け取れるようにする。
 */

import { checkJapaneseGlossary } from '@/glossary/ja/check'
import { JAPANESE_GLOSSARY } from '@/glossary/ja/glossary-data'
import type { GlossaryCheckResult } from '@/glossary/ja/glossary'
import { resolveLocale } from '@/locale/resolve-locale'
import { interpretPo } from '@/po/interpret-po'
import type { TranslationEntry } from '@/po/interpret-po'
import { check } from '@/rules/ja/check'
import type { TranslationCheckResult } from '@/rules/ja/check'

/**
 * Check Orchestration が Presentation へ返す1回の確認結果を表す。
 *
 * 正常完了では解釈済み entry と日本語チェック結果を返し、
 * 確認を正常完了できない状態は原因ごとの status で区別する。
 */
export type SuccessfulCheckResult = {
  status: 'success'
  entries: readonly TranslationEntry[]
  results: readonly TranslationCheckResult[]
  glossaryResults: readonly GlossaryCheckResult[]
}

export type CheckResult =
  | SuccessfulCheckResult
  | {
      status: 'invalid-po'
    }
  | {
      status: 'unresolved-locale'
    }
  | {
      status: 'unsupported-locale'
      locale: string
    }

/**
 * 正規化済みの翻訳 entry 1件を、日本語 Style Guide / Glossary の共通確認へ渡す。
 *
 * 1件確認では entryIndex を0へ正規化するが、原文の singular / plural と翻訳フォームの
 * index・文字列は保持し、PO 確認と同じ Validation Core の結果を返す。
 *
 * @param entry 確認対象となる正規化済みの翻訳 entry。
 * @returns 1件の entry と、日本語 Style Guide / Glossary の確認結果。
 */
export function checkEntry(entry: TranslationEntry): SuccessfulCheckResult {
  const normalizedEntry: TranslationEntry = {
    ...entry,
    entryIndex: 0,
    source: entry.source,
    translations: entry.translations,
  }
  const entries = [normalizedEntry]

  return {
    status: 'success',
    entries,
    results: check(entries),
    glossaryResults: checkJapaneseGlossary(entries, JAPANESE_GLOSSARY),
  }
}

/**
 * PO 文字列を1回の確認要求として処理し、確認全体の結果を返す。
 *
 * @param source 確認対象となる PO ファイル内容の文字列。
 * @returns 正常完了、入力解析不能、ロケール判定不能、未対応ロケールのいずれかを表す結果。
 */
export function checkPo(source: string): CheckResult {
  const interpretation = interpretPo(source)

  // PO として確認可能な入力でない場合は、後続の責務を適用せず確認不能として終了する。
  if (interpretation.status === 'invalid-po') {
    return { status: 'invalid-po' }
  }

  const { document } = interpretation
  const localeResolution = resolveLocale(document.metadata)

  // 対象ロケールを判定できない場合は、日本語チェックを適用せず確認不能として終了する。
  if (localeResolution.status === 'unresolved') {
    return { status: 'unresolved-locale' }
  }

  // v1 で対応しないロケールには日本語ルールを代替適用せず、解決済みロケールをそのまま返す。
  if (localeResolution.locale !== 'ja') {
    return {
      status: 'unsupported-locale',
      locale: localeResolution.locale,
    }
  }

  return {
    status: 'success',
    entries: document.entries,
    results: check(document.entries),
    glossaryResults: checkJapaneseGlossary(document.entries, JAPANESE_GLOSSARY),
  }
}
