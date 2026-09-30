/**
 * 確認結果を CSV / JSON / Markdown へ変換する出力仕様を確認する。
 */

import { describe, expect, it } from 'vitest'
import type { Finding } from './presentation-model'
import {
  serializeCsv,
  serializeFindingMarkdown,
  serializeJson,
  serializeMarkdown,
} from './result-export'

/**
 * 出力テスト用の1指摘を生成する。
 *
 * @param overrides 指摘ごとに差し替える値。
 * @returns Presentation が利用する Finding と同じ形のテストデータ。
 */
function createFinding(
  overrides: Partial<{
    key: string
    severity: 'Error' | 'Warning'
    styleGuideItem: string
    message: string
    source: string
    translation: string
    matches: Finding['matches']
  }> = {},
): Finding {
  return {
    key: overrides.key ?? '0-error-0',
    kind: 'style-guide',
    severity: overrides.severity ?? 'Error',
    styleGuideItem: overrides.styleGuideItem ?? '1-1',
    message: overrides.message ?? '句読点を確認してください。',
    matches: overrides.matches ?? [{ start: 5, end: 6 }],
    translationFormIndex: 0,
    entry: {
      entryIndex: 0,
      source: {
        singular: overrides.source ?? 'Hello, world',
      },
      translations: [
        {
          index: 0,
          text: overrides.translation ?? 'こんにちは, 世界',
        },
      ],
    },
  }
}

describe('CSV result export', () => {
  /**
   * 事前条件:
   * - Error と Warning の指摘がある。
   *
   * 操作:
   * - CSV へ変換する。
   *
   * 期待結果:
   * - UTF-8 BOM とヘッダーを持ち、1指摘が1行として元の順序で出力される。
   */
  it('when findings contain errors and warnings, should export each finding as one CSV row in result order', () => {
    const csv = serializeCsv([
      createFinding(),
      createFinding({
        key: '1-warning-0',
        severity: 'Warning',
        styleGuideItem: '3-4',
        message: '文脈を確認してください。',
      }),
    ])

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv.slice(1).split('\r\n')).toEqual([
      'type,severity,styleGuideItem,message,source,translation,entryIndex,translationFormIndex,originalTerm,glossaryTranslations,partsOfSpeech,comments',
      'style-guide,Error,1-1,句読点を確認してください。,"Hello, world","こんにちは, 世界",0,0,,,,',
      'style-guide,Warning,3-4,文脈を確認してください。,"Hello, world","こんにちは, 世界",0,0,,,,',
    ])
  })

  /**
   * 事前条件:
   * - 出力値にカンマ、引用符、改行が含まれる。
   *
   * 操作:
   * - CSV へ変換する。
   *
   * 期待結果:
   * - 対象フィールドを引用符で囲み、内部の引用符を二重化する。
   */
  it('when CSV fields contain delimiters, quotes, or line breaks, should apply standard CSV escaping', () => {
    const csv = serializeCsv([
      createFinding({
        message: '「a,b」と "c" を確認\nしてください。',
        source: 'Save "all", now',
        translation: 'すべてを\n保存',
      }),
    ])

    expect(csv).toContain(
      '"「a,b」と ""c"" を確認\nしてください。","Save ""all"", now","すべてを\n保存"',
    )
  })

  /**
   * CSV セル先頭の数式評価につながる文字を文字列として無害化することを確認する。
   *
   * 事前条件:
   * - 原文・翻訳などの CSV 出力値が = / + / - / @ / タブ / 改行で始まる。
   *
   * 操作:
   * - CSV へ変換する。
   *
   * 期待結果:
   * - 危険な先頭文字の前へアポストロフィが付き、通常文字列は変更されない。
   */
  it('when CSV fields start with spreadsheet formula prefixes, should neutralize them without changing normal text', () => {
    const cases = [
      '=SUM(1,1)',
      '+cmd',
      '-1+2',
      '@SUM(A1)',
      '\tformula',
      '\nformula',
    ]

    for (const value of cases) {
      const csv = serializeCsv([
        createFinding({
          source: value,
          translation: value,
        }),
      ])

      expect(csv).toContain(`'${value}`)
    }

    expect(
      serializeCsv([
        createFinding({
          source: 'Normal source',
          translation: '通常の翻訳',
        }),
      ]),
    ).toContain('Normal source,通常の翻訳')
  })

  /**
   * 事前条件:
   * - 正常完了した結果に指摘がない。
   *
   * 操作:
   * - CSV へ変換する。
   *
   * 期待結果:
   * - UTF-8 BOM とヘッダーだけを出力する。
   */
  it('when successful result has no findings, should export only the CSV header', () => {
    expect(serializeCsv([])).toBe(
      '\uFEFFtype,severity,styleGuideItem,message,source,translation,entryIndex,translationFormIndex,originalTerm,glossaryTranslations,partsOfSpeech,comments',
    )
  })
})

describe('JSON result export', () => {
  /**
   * 事前条件:
   * - Error と Warning が混在している。
   *
   * 操作:
   * - JSON へ変換する。
   *
   * 期待結果:
   * - ファイル名、Severity ごとの件数、全指摘の主要情報を出力する。
   */
  it('when findings are mixed, should export file summary and all findings', () => {
    const json = JSON.parse(
      serializeJson('plugin-ja.po', [
        createFinding(),
        createFinding({
          key: '1-warning-0',
          severity: 'Warning',
          styleGuideItem: '3-4',
        }),
      ]),
    )

    expect(json).toEqual({
      file: 'plugin-ja.po',
      summary: {
        errors: 1,
        warnings: 1,
      },
      findings: [
        {
          type: 'style-guide',
          severity: 'error',
          styleGuideItem: '1-1',
          message: '句読点を確認してください。',
          source: 'Hello, world',
          translation: 'こんにちは, 世界',
          entryIndex: 0,
          translationFormIndex: 0,
          matches: [{ start: 5, end: 6 }],
        },
        {
          type: 'style-guide',
          severity: 'warning',
          styleGuideItem: '3-4',
          message: '句読点を確認してください。',
          source: 'Hello, world',
          translation: 'こんにちは, 世界',
          entryIndex: 0,
          translationFormIndex: 0,
          matches: [{ start: 5, end: 6 }],
        },
      ],
    })
  })

  /**
   * 事前条件:
   * - 正常完了した結果に指摘がない。
   *
   * 操作:
   * - JSON へ変換する。
   *
   * 期待結果:
   * - Error / Warning が0で findings が空の正常結果を出力する。
   */
  it('when successful result has no findings, should export zero summary and empty findings', () => {
    expect(JSON.parse(serializeJson('clean.po', []))).toEqual({
      file: 'clean.po',
      summary: {
        errors: 0,
        warnings: 0,
      },
      findings: [],
    })
  })
})

describe('Finding Markdown export', () => {
  /**
   * 事前条件:
   * - Error の指摘に複数の一致範囲と改行を含む原文・翻訳がある。
   *
   * 操作:
   * - 1件の指摘を Markdown へ変換する。
   *
   * 期待結果:
   * - 既存の全件 Markdown と同じ構成で情報と改行を保持し、全一致箇所を強調する。
   */
  it('when an error finding contains multiple matches and line breaks, should serialize one complete finding', () => {
    const finding = createFinding({
      styleGuideItem: '1-9 半角数字前後の不要スペース',
      message:
        '半角数字と日本語の間のスペースは削除してください\n再確認してください。',
      source: 'Line 1\nLine 2',
      translation: '項目 1 と項目 2',
      matches: [
        { start: 2, end: 5 },
        { start: 8, end: 10 },
      ],
    })

    expect(serializeFindingMarkdown(finding)).toBe(
      [
        '### Error: 1-9 半角数字前後の不要スペース',
        '',
        '半角数字と日本語の間のスペースは削除してください',
        '再確認してください。',
        '',
        '**原文**',
        '',
        'Line 1',
        'Line 2',
        '',
        '**翻訳**',
        '',
        '項目 **1** と項目 **2**',
      ].join('\n'),
    )
  })

  /**
   * 事前条件:
   * - Warning の指摘がある。
   *
   * 操作:
   * - 1件の指摘と全件 Markdown を生成する。
   *
   * 期待結果:
   * - Finding 単位の出力が全件 Markdown 内の1件分と一致し、独立したスタイルガイド節を追加しない。
   */
  it('when a warning finding is serialized, should match the finding section used by full Markdown export', () => {
    const finding = createFinding({
      severity: 'Warning',
      styleGuideItem: '3-4 文脈確認',
      message: '文脈を確認してください。',
      matches: [],
    })
    const findingMarkdown = serializeFindingMarkdown(finding)
    const fullMarkdown = serializeMarkdown('plugin-ja.po', [finding])

    expect(findingMarkdown).toContain('### Warning: 3-4 文脈確認')
    expect(findingMarkdown).not.toContain('**スタイルガイド**')
    expect(fullMarkdown).toContain(findingMarkdown)
  })
})

describe('Markdown result export', () => {
  /**
   * 事前条件:
   * - 同じ entry に複数の CheckMessage に相当する指摘がある。
   *
   * 操作:
   * - Markdown へ変換する。
   *
   * 期待結果:
   * - 各指摘を独立して出力し、共通する原文・翻訳をそれぞれに含める。
   */
  it('when one entry has multiple findings, should export each finding with its source and translation', () => {
    const markdown = serializeMarkdown('plugin-ja.po', [
      createFinding(),
      createFinding({
        key: '0-error-1',
        styleGuideItem: '1-4',
        message: 'スペースを確認してください。',
      }),
    ])

    expect(markdown).toContain('- Error: 2')
    expect(markdown).toContain('- Warning: 0')
    expect(markdown).toContain('### Error: 1-1')
    expect(markdown).toContain('### Error: 1-4')
    expect(markdown.match(/Hello, world/g)).toHaveLength(2)
    expect(markdown.match(/こんにちは\*\*,\*\* 世界/g)).toHaveLength(2)
  })

  /**
   * 複数の一致箇所を Markdown だけで強調することを確認する。
   *
   * 事前条件:
   * - 1つの指摘に複数の一致範囲がある。
   *
   * 操作:
   * - Markdown / CSV / JSON へ変換する。
   *
   * 期待結果:
   * - Markdown の翻訳だけが太字になり、CSV / JSON の翻訳文字列は元のままとなる。
   */
  it('when one finding has multiple matches, should decorate only the Markdown translation', () => {
    const finding = createFinding({
      translation: '全て保存して全て確認',
      matches: [
        { start: 0, end: 2 },
        { start: 6, end: 8 },
      ],
    })

    expect(serializeMarkdown('plugin-ja.po', [finding])).toContain(
      '**全て**保存して**全て**確認',
    )
    expect(serializeCsv([finding])).toContain('全て保存して全て確認')
    expect(
      JSON.parse(serializeJson('plugin-ja.po', [finding])).findings[0],
    ).toMatchObject({
      translation: '全て保存して全て確認',
      matches: [
        { start: 0, end: 2 },
        { start: 6, end: 8 },
      ],
    })
  })

  /**
   * 前後空白を含む一致範囲でも Markdown の太字が成立することを確認する。
   *
   * 事前条件:
   * - 一致範囲の先頭と末尾に空白が含まれる。
   *
   * 操作:
   * - Markdown へ変換する。
   *
   * 期待結果:
   * - 空白は太字記法の外に残し、実文字部分だけを太字にする。
   */
  it('when a Markdown match contains surrounding whitespace, should keep whitespace outside strong emphasis', () => {
    const finding = createFinding({
      translation: '設定 : 詳細',
      matches: [{ start: 2, end: 5 }],
    })

    expect(serializeMarkdown('plugin-ja.po', [finding])).toContain(
      '設定 **:** 詳細',
    )
  })

  /**
   * 事前条件:
   * - 正常完了した結果に指摘がない。
   *
   * 操作:
   * - Markdown へ変換する。
   *
   * 期待結果:
   * - 正常完了と指摘なしを示し、翻訳全体の正しさを保証する表現は使用しない。
   */
  it('when successful result has no findings, should state that v1 target rules found no findings', () => {
    const markdown = serializeMarkdown('clean.po', [])

    expect(markdown).toContain('- Error: 0')
    expect(markdown).toContain('- Warning: 0')
    expect(markdown).toContain(
      '正常に確認が完了し、v1 の対象ルールでは指摘がありませんでした。',
    )
  })
})

describe('Glossary result export', () => {
  const glossaryFinding: Finding = {
    key: '0-glossary-0-0',
    kind: 'glossary',
    severity: 'Warning',
    styleGuideItem: 'Glossary',
    message: '「website」の Glossary 訳語を確認してください',
    matches: [],
    translationFormIndex: 0,
    entry: {
      entryIndex: 0,
      source: { singular: 'Visit website' },
      translations: [{ index: 0, text: 'Web ページを見る' }],
    },
    glossary: {
      entryIndex: 0,
      translationFormIndex: 0,
      originalTerm: 'website',
      candidates: [
        { original: 'website', translation: 'サイト', partOfSpeech: 'noun' },
      ],
      currentTranslation: 'Web ページを見る',
      sourceMatches: [{ source: 'singular', start: 6, end: 13 }],
    },
  }

  /**
   * Glossary Warning が共通 Finding として各出力形式へ含まれることを確認する。
   *
   * 操作:
   * - 共通指摘一覧を CSV / JSON / Markdown へ変換する。
   *
   * 期待結果:
   * - 各形式で Glossary の種別、候補訳、対象翻訳を確認できる。
   */
  it('when glossary finding exists, should export it through the common finding collection', () => {
    expect(serializeCsv([glossaryFinding])).toContain(
      'glossary,Warning,Glossary,「website」の Glossary 訳語を確認してください,Visit website,Web ページを見る,0,0,website,サイト,noun,',
    )

    expect(
      JSON.parse(serializeJson('plugin-ja.po', [glossaryFinding])),
    ).toMatchObject({
      summary: { errors: 0, warnings: 1 },
      findings: [
        {
          type: 'glossary',
          originalTerm: 'website',
          translation: 'Web ページを見る',
          translationFormIndex: 0,
        },
      ],
    })

    const markdown = serializeMarkdown('plugin-ja.po', [glossaryFinding])
    expect(markdown).toContain('### Warning: Glossary')
    expect(markdown).toContain('「website」の Glossary 訳語を確認してください')
    expect(markdown).toContain('- サイト / noun')
  })
})
