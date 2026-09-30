/**
 * Result Presentation が所有する画面状態と、確認結果の一覧表示に必要な表示モデルを定義する。
 *
 * Validation Core の結果を再判定せず、ルール絞り込み、ページネーション、長文表示など、利用者へ結果を提示するための導出値だけを扱う。
 */

import type { CheckResult } from '@/check/check'

/** Check Orchestration が正常完了した場合の公開結果。 */
type SuccessfulCheckResult = Extract<CheckResult, { status: 'success' }>

/** 確認を完了できなかった理由と、利用者へ提示するために必要な入力情報。 */
type FeedbackState =
  | {
      status: 'feedback'
      file: File
      reason:
        | 'file-too-large'
        | 'file-read-failure'
        | 'invalid-po'
        | 'unresolved-locale'
    }
  | {
      status: 'feedback'
      file: File
      reason: 'unsupported-locale'
      locale: string
    }

/**
 * Presentation が保持する、利用者から見た現在の確認状態を表す。
 */
export type PresentationState =
  | { status: 'no-file' }
  | { status: 'selected'; file: File }
  | { status: 'checking'; file: File }
  | FeedbackState
  | {
      status: 'success'
      file: File
      result: SuccessfulCheckResult
    }

/**
 * 画面状態へ適用できる利用者操作または確認完了イベントを表す。
 */
export type PresentationAction =
  | { type: 'select-file'; file: File }
  | { type: 'start-check' }
  | { type: 'file-too-large'; file: File }
  | { type: 'file-read-failure'; file: File }
  | { type: 'check-completed'; file: File; result: CheckResult }

/** Style Guide と Glossary の双方で共通して表示・操作する1件の指摘。 */
type FindingBase = {
  key: string
  severity: 'Error' | 'Warning'
  message: string
  styleGuideItem: string
  matches: SuccessfulCheckResult['results'][number]['errors'][number]['matches']
  entry: SuccessfulCheckResult['entries'][number]
  translationFormIndex: number
}

/** Style Guide の判定結果から生成する通常の指摘。 */
type StyleGuideFinding = FindingBase & {
  kind: 'style-guide'
}

/** Glossary の判定結果から生成し、候補情報と原文上の一致位置を保持する指摘。 */
type GlossaryFinding = FindingBase & {
  kind: 'glossary'
  glossary: SuccessfulCheckResult['glossaryResults'][number]
}

/** Result Presentation が一覧・絞り込み・ページング・修正確認で共通利用する指摘。 */
export type Finding = StyleGuideFinding | GlossaryFinding

/** Style Guide と Glossary を合わせた確認結果概要の件数を表す。 */
export type FindingSummary = {
  errorCount: number
  warningCount: number
  totalCount: number
}

/**
 * 項目フィルターで選択できる Style Guide 項目または Glossary と、現在の確認結果に含まれる指摘件数を表す。
 */
export type RuleFilterOption = {
  styleGuideItem: string
  count: number
}

/**
 * 指摘一覧で利用者が選択できる1ページあたりの表示件数。
 *
 * Result Presentation 内の表示量だけを変更し、確認結果そのものには影響しない。
 */
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const

/**
 * 新しい確認結果を表示するときの1ページあたりの初期表示件数。
 */
export const DEFAULT_PAGE_SIZE = 50

/** ページ番号の先頭・末尾に常時表示する件数。 */
const EDGE_PAGE_COUNT = 3

/** 現在ページの前後に表示するページ番号の件数。 */
const SIBLING_PAGE_COUNT = 1

/** ページ番号ナビゲーションに表示するページ番号または省略記号。 */
type PaginationItem = number | 'ellipsis'

/** 指摘一覧の現在ページを表示するために必要な導出値。 */
export type PaginationModel = {
  currentPage: number
  totalPages: number
  rangeStart: number
  rangeEnd: number
  totalCount: number
  visibleFindings: readonly Finding[]
  items: readonly PaginationItem[]
}

/**
 * 完了後にフォーカスを移す Presentation 上の意味領域を表す。
 */
export type CompletionFocusTarget = 'feedback' | 'summary' | null

/** v1 で長文として扱う文字数の上限。 */
const COLLAPSED_CHARACTER_LIMIT = 200

/**
 * 画面状態を次の有効な状態へ遷移させる。
 *
 * 確認開始時点の File と完了イベントの File が一致しない場合は、入力差し替え後の古い結果として無視する。
 *
 * @param state 現在の画面状態。
 * @param action 利用者操作または確認完了イベント。
 * @returns 次の画面状態。
 */
export function presentationReducer(
  state: PresentationState,
  action: PresentationAction,
): PresentationState {
  if (action.type === 'select-file') {
    return { status: 'selected', file: action.file }
  }

  if (action.type === 'start-check') {
    if (state.status === 'no-file' || state.status === 'checking') {
      return state
    }

    return { status: 'checking', file: state.file }
  }

  if (action.type === 'file-too-large') {
    if (state.status === 'no-file' || state.file !== action.file) {
      return state
    }

    return {
      status: 'feedback',
      file: action.file,
      reason: 'file-too-large',
    }
  }

  if (state.status !== 'checking' || state.file !== action.file) {
    return state
  }

  if (action.type === 'file-read-failure') {
    return {
      status: 'feedback',
      file: action.file,
      reason: 'file-read-failure',
    }
  }

  if (action.result.status === 'success') {
    return {
      status: 'success',
      file: action.file,
      result: action.result,
    }
  }

  if (action.result.status === 'unsupported-locale') {
    return {
      status: 'feedback',
      file: action.file,
      reason: 'unsupported-locale',
      locale: action.result.locale,
    }
  }

  return {
    status: 'feedback',
    file: action.file,
    reason: action.result.status,
  }
}

/**
 * 正常完了した Validation Core の Style Guide / Glossary 結果を、共通の指摘一覧へ変換する。
 *
 * @param result Check Orchestration が返した正常完了結果。
 * @returns Style Guide と Glossary を同じ表示・操作基盤で扱える指摘一覧。
 */
export function createFindings(
  result: SuccessfulCheckResult,
): readonly Finding[] {
  const findings: Finding[] = []

  for (const checkedEntry of result.results) {
    const entry = result.entries[checkedEntry.entryIndex]

    // PO Interpretation が保証する配列位置と entryIndex の対応が崩れている場合は、誤った翻訳を指摘へ結び付けない。
    if (entry === undefined || entry.entryIndex !== checkedEntry.entryIndex) {
      throw new Error(
        `確認結果の entryIndex ${checkedEntry.entryIndex} に対応する翻訳 entry がありません。`,
      )
    }

    // 1つの Error CheckMessage を利用者向けの1指摘として、元 entry の内容と結び付ける。
    for (const [messageIndex, message] of checkedEntry.errors.entries()) {
      findings.push({
        key: `${checkedEntry.entryIndex}-error-${messageIndex}`,
        kind: 'style-guide',
        severity: 'Error',
        message: message.message,
        styleGuideItem: message.styleGuideItem,
        matches: message.matches,
        entry,
        translationFormIndex: entry.translations[0]?.index ?? 0,
      })
    }

    // 1つの Warning CheckMessage を利用者向けの1指摘として、元 entry の内容と結び付ける。
    for (const [messageIndex, message] of checkedEntry.warnings.entries()) {
      findings.push({
        key: `${checkedEntry.entryIndex}-warning-${messageIndex}`,
        kind: 'style-guide',
        severity: 'Warning',
        message: message.message,
        styleGuideItem: message.styleGuideItem,
        matches: message.matches,
        entry,
        translationFormIndex: entry.translations[0]?.index ?? 0,
      })
    }
  }

  // Glossary Warning も同じ指摘一覧へ変換し、共通の絞り込み・ページング・修正操作へ流す。
  for (const [index, glossaryResult] of result.glossaryResults.entries()) {
    const entry = result.entries[glossaryResult.entryIndex]

    // Validation が返した entryIndex と解釈済み entry の対応が崩れている場合は、別の翻訳へ Warning を誤表示しない。
    if (entry === undefined || entry.entryIndex !== glossaryResult.entryIndex) {
      throw new Error(
        `Glossary 結果の entryIndex ${glossaryResult.entryIndex} に対応する翻訳 entry がありません。`,
      )
    }

    findings.push({
      key: `${glossaryResult.entryIndex}-glossary-${glossaryResult.translationFormIndex}-${index}`,
      kind: 'glossary',
      severity: 'Warning',
      message: `「${glossaryResult.originalTerm}」の Glossary 訳語を確認してください`,
      styleGuideItem: 'Glossary',
      matches: [],
      entry,
      translationFormIndex: glossaryResult.translationFormIndex,
      glossary: glossaryResult,
    })
  }

  return findings
}

/**
 * CheckMessage 単位の指摘一覧から結果概要の件数を導出する。
 *
 * @param findings 表示対象の Style Guide / Glossary 共通指摘一覧。
 * @returns Error、Warning、全指摘の件数。
 */
export function summarizeFindings(
  findings: readonly Finding[],
): FindingSummary {
  let errorCount = 0
  let warningCount = 0

  // 利用者向けの1指摘を単位として Severity ごとの件数を集計する。
  for (const finding of findings) {
    // Error 以外の指摘は、Style Guide / Glossary の種別にかかわらず Warning として集計する。
    if (finding.severity === 'Error') {
      errorCount += 1
    } else {
      warningCount += 1
    }
  }

  return {
    errorCount,
    warningCount,
    totalCount: errorCount + warningCount,
  }
}

/**
 * 現在の確認結果に存在する Style Guide 項目と Glossary を、最初に現れた順で重複なく集計する。
 *
 * @param findings 正常完了結果から導出した全指摘。
 * @returns ルール名と CheckMessage 単位の指摘件数。
 */
export function createRuleFilterOptions(
  findings: readonly Finding[],
): readonly RuleFilterOption[] {
  const counts = new Map<string, number>()

  // 画面で選択可能な確認項目と件数だけを導出し、元の指摘一覧は変更しない。
  for (const finding of findings) {
    counts.set(
      finding.styleGuideItem,
      (counts.get(finding.styleGuideItem) ?? 0) + 1,
    )
  }

  return Array.from(counts, ([styleGuideItem, count]) => ({
    styleGuideItem,
    count,
  }))
}

/**
 * 選択された1確認項目に一致する指摘だけを画面表示用として導出する。
 *
 * @param findings 正常完了結果から導出した全指摘。
 * @param selectedStyleGuideItem 選択中のスタイルガイド項目。null は「すべてのルール」を表す。
 * @returns 選択ルールに一致する指摘一覧。元の指摘一覧は変更しない。
 */
export function filterFindingsByRule(
  findings: readonly Finding[],
  selectedStyleGuideItem: string | null,
): readonly Finding[] {
  if (selectedStyleGuideItem === null) {
    return findings
  }

  return findings.filter(
    (finding) => finding.styleGuideItem === selectedStyleGuideItem,
  )
}

/**
 * 現在ページと総ページ数から、先頭・現在周辺・末尾を含むページ番号表示を導出する。
 *
 * @param currentPage 現在表示している1始まりのページ番号。
 * @param totalPages フィルター後の総ページ数。
 * @returns 連続しない範囲を省略記号で区切ったページ番号表示。
 */
function createPaginationItems(
  currentPage: number,
  totalPages: number,
): readonly PaginationItem[] {
  if (totalPages <= 1) {
    return totalPages === 1 ? [1] : []
  }

  const visiblePages = new Set<number>()

  // 先頭と末尾は現在位置にかかわらず一定数を表示し、一覧全体の端へ直接移動できる状態を保つ。
  for (let page = 1; page <= Math.min(EDGE_PAGE_COUNT, totalPages); page += 1) {
    visiblePages.add(page)
  }
  for (
    let page = Math.max(1, totalPages - EDGE_PAGE_COUNT + 1);
    page <= totalPages;
    page += 1
  ) {
    visiblePages.add(page)
  }

  // 現在位置の前後は連続して確認できるよう、指定件数の隣接ページを表示する。
  for (
    let page = Math.max(1, currentPage - SIBLING_PAGE_COUNT);
    page <= Math.min(totalPages, currentPage + SIBLING_PAGE_COUNT);
    page += 1
  ) {
    visiblePages.add(page)
  }

  const pages = Array.from(visiblePages).sort((left, right) => left - right)
  const items: PaginationItem[] = []

  for (const page of pages) {
    const previous = items[items.length - 1]
    const previousPage = typeof previous === 'number' ? previous : undefined

    // 表示するページ範囲が連続しない場合だけ、省略された範囲があることを示す。
    if (previousPage !== undefined && page - previousPage > 1) {
      items.push('ellipsis')
    }

    items.push(page)
  }

  return items
}

/**
 * フィルター後の指摘一覧とページ状態から、現在ページの表示モデルを導出する。
 *
 * 元の指摘一覧は変更せず、ページ範囲、総ページ数、表示対象、ページ番号ナビゲーションを同じ入力から一貫して算出する。
 * 保持中のページ番号がフィルター後の有効範囲を外れた場合は、利用可能な先頭または末尾ページへ補正する。
 * 指摘が0件の場合は表示対象を空とし、現在ページは次の結果表示へ再利用できる1ページ目として扱う。
 *
 * @param findings ルールフィルター適用後の指摘一覧。
 * @param page Presentation が保持する1始まりの現在ページ。
 * @param pageSize 1ページあたりの表示件数。
 * @returns 現在ページの指摘一覧とページ移動表示に必要な値。
 */
export function createPaginationModel(
  findings: readonly Finding[],
  page: number,
  pageSize: number,
): PaginationModel {
  const totalCount = findings.length
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize)
  const currentPage =
    totalPages === 0 ? 1 : Math.min(Math.max(page, 1), totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const visibleFindings = findings.slice(startIndex, startIndex + pageSize)

  return {
    currentPage,
    totalPages,
    rangeStart: totalCount === 0 ? 0 : startIndex + 1,
    rangeEnd: totalCount === 0 ? 0 : startIndex + visibleFindings.length,
    totalCount,
    visibleFindings,
    items: createPaginationItems(currentPage, totalPages),
  }
}

/**
 * 長文表示に利用する文字数判定と省略文字列を返す。
 *
 * DOM の overflow は計測せず、Unicode code point の数が200文字を超える場合だけ省略する。
 *
 * @param text 表示対象の原文または翻訳。
 * @returns 長文かどうかと、折りたたみ時に表示する文字列。
 */
export function getCollapsedText(text: string): {
  isLong: boolean
  collapsed: string
} {
  const characters = Array.from(text)

  if (characters.length <= COLLAPSED_CHARACTER_LIMIT) {
    return { isLong: false, collapsed: text }
  }

  return {
    isLong: true,
    collapsed: `${characters.slice(0, COLLAPSED_CHARACTER_LIMIT).join('')}…`,
  }
}

/**
 * 確認完了後に移動するフォーカス先を画面状態から決定する。
 *
 * @param state 現在の画面状態。
 * @returns 確認不能時は feedback、正常完了時は summary、それ以外は null。
 */
export function getCompletionFocusTarget(
  state: PresentationState,
): CompletionFocusTarget {
  if (state.status === 'feedback') {
    return 'feedback'
  }

  if (state.status === 'success') {
    return 'summary'
  }

  return null
}
