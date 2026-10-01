/**
 * Check Orchestration の公開境界が、PO Interpretation、Locale Resolution、日本語 v1 Check を
 * 合意済みの順序と意味で接続し、確認全体の結果を返すことを確認する。
 *
 * 本番で採用する gettext-converter を直接利用し、下位責務はテストダブルへ置き換えない。
 */

import po2js from 'gettext-converter/po2js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { checkEntry, checkPo } from './check'

/**
 * テスト開始前のブラウザー用パーサー状態を保持し、テスト終了後に実行環境を元へ戻すために利用する。
 */
const originalGettext = (
  globalThis as typeof globalThis & {
    gettext?: { po2js: (source: string) => unknown }
  }
).gettext

// 公開入口を本番と同じ PO 解析処理へ通すため、テスト環境へ実パーサーを接続する。
beforeAll(() => {
  ;(
    globalThis as typeof globalThis & {
      gettext?: { po2js: (source: string) => unknown }
    }
  ).gettext = { po2js }
})

// テストで変更した実行環境を復元し、他のテストへブラウザー用パーサー状態を漏らさない。
afterAll(() => {
  const target = globalThis as typeof globalThis & {
    gettext?: { po2js: (source: string) => unknown }
  }

  if (originalGettext === undefined) {
    delete target.gettext
  } else {
    target.gettext = originalGettext
  }
})

describe('Check Orchestration', () => {
  /**
   * PO として解釈できない入力が、正常な指摘なし結果と区別されることを確認する。
   *
   * 事前条件:
   * - PO のキーとして成立しない入力がある。
   *
   * 操作:
   * - 公開入口から確認する。
   *
   * 期待結果:
   * - invalid-po が返る。
   */
  it('when PO input is invalid, should return invalid-po', () => {
    const source = ['msgidx "broken"', 'msgstr "壊れた"'].join('\n')

    expect(checkPo(source)).toEqual({ status: 'invalid-po' })
  })

  /**
   * PO は解釈できるが Language metadata がない場合に、ロケール判定不能として扱うことを確認する。
   *
   * 事前条件:
   * - 翻訳済み entry を持つ正常な PO に Language header がない。
   *
   * 操作:
   * - 公開入口から確認する。
   *
   * 期待結果:
   * - unresolved-locale が返る。
   */
  it('when locale metadata is missing, should return unresolved-locale', () => {
    const source = [
      'msgid ""',
      'msgstr ""',
      '',
      'msgid "Save settings"',
      'msgstr "設定を保存"',
      '',
    ].join('\n')

    expect(checkPo(source)).toEqual({ status: 'unresolved-locale' })
  })

  /**
   * 解決済みロケールが v1 未対応の場合に、日本語の問題なし結果として扱わないことを確認する。
   *
   * 事前条件:
   * - Language header が en_US の正常な PO がある。
   *
   * 操作:
   * - 公開入口から確認する。
   *
   * 期待結果:
   * - unsupported-locale と解決済みロケールが返る。
   */
  it('when locale is supported by resolution but not by v1, should return unsupported-locale with the resolved locale', () => {
    const source = [
      'msgid ""',
      'msgstr ""',
      '"Language: en_US\\n"',
      '',
      'msgid "Save settings"',
      'msgstr "Save settings"',
      '',
    ].join('\n')

    expect(checkPo(source)).toEqual({
      status: 'unsupported-locale',
      locale: 'en_US',
    })
  })

  /**
   * 日本語 PO に v1 の指摘がない場合に、正常完了した指摘なし結果を返すことを確認する。
   *
   * 事前条件:
   * - Language header が ja で、翻訳が日本語 v1 ルールを満たしている。
   *
   * 操作:
   * - 公開入口から確認する。
   *
   * 期待結果:
   * - success と空の results が返る。
   * - 解釈済み entry が保持される。
   */
  it('when Japanese PO has no findings, should return success with entries and an empty result array', () => {
    const source = [
      'msgid ""',
      'msgstr ""',
      '"Language: ja\\n"',
      '',
      'msgid "Save settings"',
      'msgstr "設定を保存"',
      '',
    ].join('\n')

    expect(checkPo(source)).toEqual({
      status: 'success',
      entries: [
        {
          entryIndex: 0,
          source: { singular: 'Save settings' },
          translations: [{ index: 0, text: '設定を保存' }],
        },
      ],
      results: [],
      glossaryResults: [],
    })
  })

  /**
   * 日本語 PO に v1 の指摘がある場合に、日本語チェック結果を全体結果へ含めることを確認する。
   *
   * 事前条件:
   * - Language header が ja で、3-6 の対象表記を含む翻訳がある。
   *
   * 操作:
   * - 公開入口から確認する。
   *
   * 期待結果:
   * - success と対象 entry の Error が返る。
   */
  it('when Japanese PO has findings, should return success with Japanese v1 check results', () => {
    const source = [
      'msgid ""',
      'msgstr ""',
      '"Language: ja\\n"',
      '',
      'msgid "Save settings"',
      'msgstr "設定を保存して下さい"',
      '',
    ].join('\n')

    const result = checkPo(source)

    expect(result.status).toBe('success')
    if (result.status !== 'success') {
      throw new Error('日本語 PO が正常完了しませんでした。')
    }

    expect(result.glossaryResults).toEqual([])
    expect(result.results).toEqual([
      {
        entryIndex: 0,
        errors: [
          {
            styleGuideItem: '3-6 「下さい / 全て / 既に」などの推奨表記',
            message: '「下さい」は「ください」と表記してください',
            matches: [{ start: 7, end: 10 }],
          },
        ],
        warnings: [],
      },
    ])
  })

  /**
   * WordPress の既知日本語表現 ja_JP が Locale Resolution を通して日本語確認へ進むことを確認する。
   *
   * 事前条件:
   * - Language header が ja_JP の正常な PO がある。
   *
   * 操作:
   * - 公開入口から確認する。
   *
   * 期待結果:
   * - 未対応ロケールにならず success が返る。
   */
  it('when locale is ja_JP, should resolve it as Japanese and return success', () => {
    const source = [
      'msgid ""',
      'msgstr ""',
      '"Language: ja_JP\\n"',
      '',
      'msgid "Save settings"',
      'msgstr "設定を保存"',
      '',
    ].join('\n')

    expect(checkPo(source).status).toBe('success')
  })

  /**
   * 日本語チェック結果の entryIndex から、Presentation が対応する原文と翻訳を参照できることを確認する。
   *
   * 事前条件:
   * - 複数 entry のうち後方の entry だけが指摘対象である。
   *
   * 操作:
   * - 公開入口から確認し、結果の entryIndex で entries を参照する。
   *
   * 期待結果:
   * - 指摘対象 entry の原文と翻訳を取得できる。
   */
  it('when a finding is returned, should allow its entryIndex to reference the matching source and translation', () => {
    const source = [
      'msgid ""',
      'msgstr ""',
      '"Language: ja\\n"',
      '',
      'msgid "Clean"',
      'msgstr "正常"',
      '',
      'msgid "Save settings"',
      'msgstr "設定を保存して下さい"',
      '',
    ].join('\n')

    const result = checkPo(source)

    expect(result.status).toBe('success')
    if (result.status !== 'success') {
      throw new Error('日本語 PO が正常完了しませんでした。')
    }

    const finding = result.results[0]
    if (finding === undefined) {
      throw new Error('指摘対象 entry の結果がありません。')
    }

    const entry = result.entries[finding.entryIndex]

    expect(entry?.source.singular).toBe('Save settings')
    expect(entry?.translations[0]?.text).toBe('設定を保存して下さい')
  })

  /**
   * 同じ PO を繰り返し確認した場合に、確認全体の結果が決定的であることを確認する。
   *
   * 操作:
   * - 同じ入力を2回確認する。
   *
   * 期待結果:
   * - 全体結果が完全に一致する。
   */
  it('when the same PO is checked repeatedly, should return the same result', () => {
    const source = [
      'msgid ""',
      'msgstr ""',
      '"Language: ja\\n"',
      '',
      'msgid "Save settings"',
      'msgstr "全て保存して下さい"',
      '',
    ].join('\n')

    expect(checkPo(source)).toEqual(checkPo(source))
  })

  /**
   * 1回の確認で入力 PO 文字列を変更しないことを確認する。
   *
   * 操作:
   * - 入力値を保存した上で公開入口から確認する。
   *
   * 期待結果:
   * - 確認前後で入力値が一致する。
   */
  it('when PO source is checked, should not change the input string', () => {
    const source = [
      'msgid ""',
      'msgstr ""',
      '"Language: ja\\n"',
      '',
      'msgid "Save settings"',
      'msgstr "設定を保存"',
      '',
    ].join('\n')
    const original = source

    checkPo(source)

    expect(source).toBe(original)
  })
  /**
   * Glossary 登録語が原文にあり登録訳語が翻訳にない場合に、Style Guide 結果とは別に Warning を公開することを確認する。
   *
   * 事前条件:
   * - 日本語 PO の原文に Glossary 登録語 `website` がある。
   * - 翻訳に登録訳語「サイト」が含まれない。
   *
   * 操作:
   * - Check Orchestration の公開入口から確認する。
   *
   * 期待結果:
   * - 正常完了する。
   * - Glossary Warning に entryIndex、translationFormIndex、原語、現在の翻訳が含まれる。
   */
  it('when Japanese PO violates glossary translation, should expose glossary results separately from style guide results', () => {
    const source = [
      'msgid ""',
      'msgstr ""',
      '"Language: ja\\n"',
      '',
      'msgid "Visit the website"',
      'msgstr "Web ページを見る"',
      '',
    ].join('\n')

    const result = checkPo(source)
    expect(result.status).toBe('success')
    if (result.status !== 'success') {
      throw new Error('日本語 PO が正常完了しませんでした。')
    }

    expect(result.glossaryResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entryIndex: 0,
          translationFormIndex: 0,
          originalTerm: 'website',
          currentTranslation: 'Web ページを見る',
        }),
      ]),
    )
  })
  /**
   * 1件チェック入口へ plural 原文を含む entry を渡したとき、原文情報を保持したまま Glossary 確認へ渡すことを確認する。
   *
   * 事前条件:
   * - singular には Glossary 語がなく、plural にのみ website が含まれる。
   *
   * 操作:
   * - 正規化済み entry を1件チェック入口へ渡す。
   *
   * 期待結果:
   * - success が返る。
   * - source.plural と翻訳フォームの識別情報が保持される。
   * - Glossary Warning の一致元が plural になり、同じ翻訳フォームを指す。
   */
  it('when a single entry has plural source text, should preserve it for glossary checking', () => {
    const result = checkEntry({
      entryIndex: 8,
      source: {
        singular: 'One item',
        plural: 'Visit website',
      },
      translations: [{ index: 2, text: 'ウェブページを見る' }],
    })

    expect(result.entries).toEqual([
      {
        entryIndex: 0,
        source: {
          singular: 'One item',
          plural: 'Visit website',
        },
        translations: [{ index: 2, text: 'ウェブページを見る' }],
      },
    ])
    expect(result.glossaryResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entryIndex: 0,
          translationFormIndex: 2,
          originalTerm: 'website',
          sourceMatches: [
            expect.objectContaining({
              source: 'plural',
            }),
          ],
        }),
      ]),
    )
  })
})
