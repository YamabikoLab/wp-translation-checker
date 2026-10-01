/**
 * @vitest-environment jsdom
 */

/**
 * 1件の指摘表示について、個別 Markdown コピーと修正案の再チェック開始を React の利用者操作から確認する。
 *
 * Clipboard API は jsdom では提供されないため、このブラウザー境界だけをテストダブルで置き換える。
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import i18n from '../i18n/i18n'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Finding } from './presentation-model'
import { FindingCard } from './FindingCard'

/**
 * 指摘カード表示テスト用の Finding を生成する。
 *
 * @param overrides 指摘ごとに差し替える値。
 * @returns 指摘カードが利用する Finding と同じ形のテストデータ。
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
    styleGuideItem:
      overrides.styleGuideItem ?? '1-9 半角数字前後の不要スペース',
    message:
      overrides.message ?? '半角数字と日本語の間のスペースは削除してください。',
    matches: overrides.matches ?? [{ start: 2, end: 4 }],
    translationFormIndex: 0,
    entry: {
      entryIndex: 0,
      source: {
        singular: overrides.source ?? 'Item 1',
      },
      translations: [
        {
          index: 0,
          text: overrides.translation ?? '項目 1',
        },
      ],
    },
  }
}

beforeEach(async () => {
  window.localStorage.clear()
  await i18n.changeLanguage('ja')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('FindingCard Markdown copy action', () => {
  /**
   * 利用画面が Markdown コピーを許可しない場合に、指摘内容を保ったままコピー操作だけを提供しないことを確認する。
   *
   * 事前条件:
   * - Markdown コピーを無効にした1件の指摘カードが表示されている。
   *
   * 期待結果:
   * - 指摘内容と修正操作は表示される。
   * - 「Markdownをコピー」操作は表示されない。
   */
  it('when Markdown copy is disabled, should hide only the copy action', () => {
    render(<FindingCard finding={createFinding()} showMarkdownCopy={false} />)

    expect(screen.getByText(createFinding().message)).toBeTruthy()
    expect(
      screen.getByRole('button', { name: '修正して再チェック' }),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Markdownをコピー' }),
    ).toBeNull()
  })

  /**
   * 事前条件:
   * - Clipboard API が利用できる。
   * - 1件の指摘カードが表示されている。
   *
   * 操作:
   * - 「Markdownをコピー」を押す。
   *
   * 期待結果:
   * - 対象 Finding の Markdown が Clipboard API へ渡され、ボタン表示が「コピーしました」へ変わる。
   */
  it('when copy succeeds, should copy the target finding Markdown and show success feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(<FindingCard finding={createFinding()} />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Markdownをコピー',
      }),
    )

    expect(
      await screen.findByRole('button', {
        name: 'コピーしました',
      }),
    ).toBeTruthy()
    expect(writeText).toHaveBeenCalledWith(
      [
        '### Error: 1-9 半角数字前後の不要スペース',
        '',
        '半角数字と日本語の間のスペースは削除してください。',
        '',
        '**原文**',
        '',
        'Item 1',
        '',
        '**翻訳**',
        '',
        '項目 **1**',
      ].join('\n'),
    )
  })

  /**
   * 事前条件:
   * - 異なる2件の指摘カードが表示されている。
   *
   * 操作:
   * - 2件目の「Markdownをコピー」を押す。
   *
   * 期待結果:
   * - 2件目だけが成功表示へ変わり、Clipboard には2件目の内容だけが渡される。
   */
  it('when one of multiple findings is copied, should keep copy content and feedback scoped to that card', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const first = createFinding()
    const second = createFinding({
      key: '1-warning-0',
      severity: 'Warning',
      styleGuideItem: '3-4 「Sorry, ...」の Sorry を訳さない',
      message: '先頭の「Sorry,」に対応する謝罪表現を削除してください',
      source: 'Sorry, your order was unsuccessful',
      translation: '申し訳ございませんが、ご注文は失敗しました',
      matches: [{ start: 0, end: 9 }],
    })

    render(
      <>
        <FindingCard finding={first} />
        <FindingCard finding={second} />
      </>,
    )

    const cards = screen.getAllByRole('article')
    fireEvent.click(
      within(cards[1]!).getByRole('button', {
        name: 'Markdownをコピー',
      }),
    )

    expect(
      await within(cards[1]!).findByRole('button', {
        name: 'コピーしました',
      }),
    ).toBeTruthy()
    expect(
      within(cards[0]!).getByRole('button', {
        name: 'Markdownをコピー',
      }),
    ).toBeTruthy()
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0]?.[0]).toContain(
      '### Warning: 3-4 「Sorry, ...」の Sorry を訳さない',
    )
    expect(writeText.mock.calls[0]?.[0]).not.toContain(
      '1-9 半角数字前後の不要スペース',
    )
  })
})

describe('FindingCard correction action', () => {
  /**
   * 指摘カードから修正操作を開始したとき、その指摘の翻訳を編集対象として確認できることを確認する。
   *
   * 操作:
   * - 「修正して再チェック」を押す。
   *
   * 期待結果:
   * - 対象指摘の翻訳が入力欄に表示される。
   */
  it('when correction starts from a finding card, should show an editable draft for that finding', () => {
    render(
      <FindingCard
        finding={createFinding({
          translation: 'WordPressのテーブル',
          source: 'WordPress Table',
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '修正して再チェック' }))

    expect(
      (screen.getByRole('textbox', { name: '翻訳' }) as HTMLTextAreaElement)
        .value,
    ).toBe('WordPressのテーブル')
  })

  /**
   * 修正案を再チェックしても、元の確認結果をコピーする操作の内容が書き換わらないことを確認する。
   *
   * 事前条件:
   * - 元の指摘には「WordPressのテーブル」という翻訳が含まれている。
   *
   * 操作:
   * - 修正案を「WordPress のテーブル」に変更して再チェックする。
   * - その後「Markdownをコピー」を押す。
   *
   * 期待結果:
   * - コピー内容には元の翻訳が含まれる。
   * - 一時的な修正案はコピー内容へ反映されない。
   */
  it('when a correction is rechecked, should keep Markdown copy based on the original finding', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(
      <FindingCard
        finding={createFinding({
          translation: 'WordPressのテーブル',
          source: 'WordPress Table',
          message: '「s」と「の」の間に半角スペースを入れてください',
          styleGuideItem: '1-4 半角文字と全角文字の間のスペース',
          matches: [{ start: 8, end: 10 }],
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '修正して再チェック' }))
    fireEvent.change(screen.getByRole('textbox', { name: '翻訳' }), {
      target: { value: 'WordPress のテーブル' },
    })
    fireEvent.click(screen.getByRole('button', { name: '再チェック' }))
    fireEvent.click(screen.getByRole('button', { name: 'Markdownをコピー' }))

    await screen.findByRole('button', { name: 'コピーしました' })

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0]?.[0]).toContain('WordPres**sの**テーブル')
    expect(writeText.mock.calls[0]?.[0]).not.toContain('WordPress のテーブル')
  })
})

describe('FindingCard Glossary presentation', () => {
  const glossaryFinding: Finding = {
    key: '0-glossary-1-0',
    kind: 'glossary',
    severity: 'Warning',
    styleGuideItem: 'Glossary',
    message: '「website」の Glossary 訳語を確認してください',
    matches: [],
    translationFormIndex: 1,
    entry: {
      entryIndex: 0,
      source: {
        singular: 'website',
        plural: 'websites for website',
      },
      translations: [
        { index: 0, text: 'サイト' },
        { index: 1, text: 'ウェブページ' },
      ],
    },
    glossary: {
      entryIndex: 0,
      translationFormIndex: 1,
      originalTerm: 'website',
      candidates: [
        {
          original: 'website',
          translation: 'サイト',
          partOfSpeech: 'noun',
          comment: 'Web site の訳語。',
        },
      ],
      currentTranslation: 'ウェブページ',
      sourceMatches: [
        { source: 'singular', start: 0, end: 7 },
        { source: 'plural', start: 13, end: 20 },
      ],
    },
  }

  /**
   * Glossary Warning も通常カードで対象原語、対象翻訳フォーム、候補訳を確認できることを確認する。
   *
   * 操作:
   * - Glossary Finding を共通カードへ表示する。
   *
   * 期待結果:
   * - 原文上の Glossary term が強調される。
   * - Warning 対象の msgstr[n] が翻訳として表示される。
   * - Glossary 候補と公式参照リンクを確認できる。
   */
  it('when a glossary finding is shown, should expose its source match, target translation form, candidates, and glossary reference', () => {
    const { container } = render(<FindingCard finding={glossaryFinding} />)

    expect(container.querySelectorAll('mark')).toHaveLength(2)
    expect(screen.getByText('ウェブページ')).toBeTruthy()
    expect(screen.getByText('サイト')).toBeTruthy()
    expect(screen.getByText('Web site の訳語。')).toBeTruthy()
    expect(
      screen.getByRole('link', {
        name: 'WordPress.org 日本語 Glossary を確認',
      }),
    ).toBeTruthy()
  })

  /**
   * English UI では Presentation が生成する Glossary 指摘文を英語表示することを確認する。
   *
   * 事前条件:
   * - Glossary Warning がある。
   * - UI 言語は English である。
   *
   * 操作:
   * - Glossary Finding を共通カードへ表示する。
   *
   * 期待結果:
   * - Glossary 指摘メッセージは英語で表示され、日本語の UI 文言は残らない。
   */
  it('when a glossary finding is shown in English, should translate the glossary message for the English UI', async () => {
    await i18n.changeLanguage('en')

    render(<FindingCard finding={glossaryFinding} />)

    expect(
      screen.getByText('Check the Glossary translation for “website”'),
    ).toBeTruthy()
    expect(
      screen.queryByText('「website」の Glossary 訳語を確認してください'),
    ).toBeNull()
  })
})
