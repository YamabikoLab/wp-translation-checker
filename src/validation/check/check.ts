/**
 * 翻訳確認の公開入口として、PO ファイル確認と正規化済み1件確認を既存の日本語検証へ接続する責任を持つ。
 *
 * PO ファイル確認では解析とロケール判定を含む確認全体を扱い、1件確認では既に正規化された翻訳情報を
 * 日本語翻訳スタイルガイドと Glossary の共通検証へ渡す。どちらも同じ正常完了結果を返し、
 * 画面表示層が個別ルールの呼び出し方を持たなくてよい境界を提供する。
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
 * 翻訳確認が正常完了した場合に画面表示層へ返す共通結果を表す。
 *
 * 確認対象の正規化済み翻訳情報と、日本語翻訳スタイルガイド・Glossary の確認結果を保持する。
 */
export type SuccessfulCheckResult = {
  status: 'success'
  entries: readonly TranslationEntry[]
  results: readonly TranslationCheckResult[]
  glossaryResults: readonly GlossaryCheckResult[]
}

/**
 * PO ファイルから開始する1回の翻訳確認結果を表す。
 *
 * 正常完了時は共通の確認結果を返し、解析不能・ロケール判定不能・未対応ロケールは
 * 画面表示層が利用者へ理由を示せるよう原因別の状態として返す。
 */
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
 * 正規化済みの翻訳1件を、日本語翻訳スタイルガイドと Glossary の共通確認へ渡す。
 *
 * 1件確認の結果内では対象を先頭の entry として扱う一方、singular / plural の原文情報と
 * 翻訳フォームの識別情報・文字列は保持し、PO ファイル確認と同じ検証結果契約を返す。
 *
 * @param entry 確認対象となる正規化済みの翻訳情報。
 * @returns 対象1件と、日本語翻訳スタイルガイド・Glossary の確認結果。
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
