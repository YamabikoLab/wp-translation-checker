/**
 * @vitest-environment jsdom
 */

/**
 * 原文・翻訳文のクイックチェックについて、入力可否、既存検証処理の結果表示、入力上限、XSS 安全性を利用者操作から確認する。
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18n from '../i18n/i18n'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { QuickCheck } from './QuickCheck'

beforeEach(async () => {
  window.localStorage.clear()
  await i18n.changeLanguage('ja')
})

afterEach(() => {
  cleanup()
})

/**
 * 原文・翻訳文を入力してクイックチェックを実行する。
 *
 * @param source 原文入力。
 * @param translation 翻訳文入力。
 */
function checkTranslation(source: string, translation: string) {
  fireEvent.change(screen.getByRole('textbox', { name: '原文' }), {
    target: { value: source },
  })
  fireEvent.change(screen.getByRole('textbox', { name: '翻訳文' }), {
    target: { value: translation },
  })
  fireEvent.click(screen.getByRole('button', { name: '確認する' }))
}

describe('QuickCheck', () => {
  /**
   * クイックチェックの結果通知領域が確認前から存在し、結果更新を支援技術へ通知できることを確認する。
   *
   * 事前条件:
   * - まだ直接入力の確認を実行していない。
   *
   * 期待結果:
   * - 空の status 領域が存在し、確認後の内容更新を通知できる。
   */
  it('when quick check is idle, should keep an empty status region mounted', () => {
    render(<QuickCheck />)

    expect(screen.getByRole('status').textContent).toBe('')
  })

  /**
   * 原文または翻訳文が未入力の場合に、確認を開始できないことを確認する。
   *
   * 事前条件:
   * - 原文・翻訳文のどちらか一方だけが入力されている。
   *
   * 期待結果:
   * - 「確認する」は無効のままで、確認を開始できない。
   */
  it('when either input is empty, should keep the check action disabled', () => {
    render(<QuickCheck />)

    const button = screen.getByRole('button', { name: '確認する' })
    expect((button as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByRole('textbox', { name: '原文' }), {
      target: { value: 'Save settings' },
    })

    expect((button as HTMLButtonElement).disabled).toBe(true)
  })

  /**
   * スタイルガイドの問題を含む直接入力を確認したとき、既存の指摘表示で Error を確認できることを確認する。
   *
   * 操作:
   * - 原文と、既存ルールに違反する翻訳文を入力して確認する。
   *
   * 期待結果:
   * - Error 件数と対象ルールの指摘が表示される。
   */
  it('when direct input violates a style guide rule, should show the existing finding result', () => {
    render(<QuickCheck />)

    checkTranslation('Save settings', '設定を保存して下さい')

    expect(screen.getByText(/確認完了。Error 1件、Warning 0件/)).toBeTruthy()
    expect(
      screen.getByText(
        'スタイルガイド: 3-6 「下さい / 全て / 既に」などの推奨表記',
      ),
    ).toBeTruthy()
  })

  /**
   * Glossary 登録語に一致しない直接入力を確認したとき、Glossary Warning を確認できることを確認する。
   *
   * 操作:
   * - Glossary 登録語を含む原文と、登録訳語を含まない翻訳文を入力して確認する。
   *
   * 期待結果:
   * - Glossary Warning の件数と指摘内容が表示される。
   */
  it('when direct input violates the glossary, should show the glossary warning', () => {
    render(<QuickCheck />)

    checkTranslation('Visit website', 'ウェブページを見る')

    expect(screen.getByText(/Warning 1件/)).toBeTruthy()
    expect(
      screen.getByText('「website」の Glossary 訳語を確認してください'),
    ).toBeTruthy()
  })

  /**
   * QuickCheck で指摘が表示されても、直接入力値をクリップボードへ出力する操作を提供しないことを確認する。
   *
   * 操作:
   * - 指摘が発生する原文・翻訳文を入力して確認する。
   *
   * 期待結果:
   * - 指摘内容は表示される。
   * - 「Markdownをコピー」操作は表示されない。
   */
  it('when direct input has findings, should not offer Markdown copy', () => {
    render(<QuickCheck />)

    checkTranslation('Save settings', '設定を保存して下さい')

    expect(
      screen.getByText(
        'スタイルガイド: 3-6 「下さい / 全て / 既に」などの推奨表記',
      ),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Markdownをコピー' }),
    ).toBeNull()
  })

  /**
   * 問題のない直接入力を確認したとき、指摘なし案内を表示することを確認する。
   *
   * 操作:
   * - 既存の自動チェックで指摘のない原文・翻訳文を入力して確認する。
   *
   * 期待結果:
   * - 確認完了が通知され、指摘なし案内が表示される。
   */
  it('when direct input has no findings, should show the no-findings message', () => {
    render(<QuickCheck />)

    checkTranslation('Save settings', '設定を保存')

    expect(
      screen.getByText('WTC の自動チェックでは問題が見つかりませんでした。'),
    ).toBeTruthy()
  })

  /**
   * 入力上限を超える直接入力では検証結果を表示せず、確認不能の理由を通知することを確認する。
   *
   * 事前条件:
   * - 原文が 100,001 文字である。
   *
   * 操作:
   * - 原文と翻訳文を入力して確認する。
   *
   * 期待結果:
   * - 入力上限の案内が表示され、通常の確認完了結果は表示されない。
   */
  it('when direct input exceeds the character limit, should reject it before validation', () => {
    render(<QuickCheck />)

    checkTranslation('a'.repeat(100_001), '翻訳')

    expect(
      screen.getByText(/原文または翻訳文が長すぎるため確認できません/),
    ).toBeTruthy()
    expect(screen.queryByText(/確認完了。Error/)).toBeNull()
  })

  /**
   * 攻撃文字列を含む直接入力を確認しても、結果表示まで文字列として扱われることを確認する。
   *
   * 操作:
   * - 攻撃文字列とスタイルガイド違反を含む翻訳文を入力して確認する。
   *
   * 期待結果:
   * - 指摘結果が表示される。
   * - 入力文字列は結果表示でも文字列として扱われ、攻撃用 DOM 要素や実行可能な属性は生成されない。
   */
  it('when checked direct input contains XSS payloads, should render them as text in the result', () => {
    const { container } = render(<QuickCheck />)
    const payload =
      '<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">test</a>WordPressのテーブル'

    checkTranslation('WordPress Table', payload)

    expect(screen.getByRole('status').textContent).toContain('確認完了。')
    expect(
      screen.getByText('スタイルガイド: 1-4 半角文字と全角文字の間のスペース'),
    ).toBeTruthy()
    expect(container.textContent).toContain(payload)
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull()
    expect(container.querySelector('[onerror]')).toBeNull()
  })
  /**
   * 入力上限ちょうどの直接入力は拒否せず確認できることを確認する。
   *
   * 事前条件:
   * - 原文が上限と同じ 100,000 文字である。
   *
   * 操作:
   * - 原文と翻訳文を入力して確認する。
   *
   * 期待結果:
   * - 入力上限の案内は表示されず、確認完了結果が表示される。
   */
  it('when direct input is exactly at the character limit, should allow validation', () => {
    render(<QuickCheck />)

    checkTranslation('a'.repeat(100_000), '翻訳')

    expect(
      screen.queryByText(/原文または翻訳文が長すぎるため確認できません/),
    ).toBeNull()
    expect(screen.getByText(/確認完了。Error 0件、Warning 0件/)).toBeTruthy()
  })

  /**
   * 確認済みの入力を変更したとき、変更前の結果を現在入力の結果として残さないことを確認する。
   *
   * 事前条件:
   * - 指摘なしの確認結果が表示されている。
   *
   * 操作:
   * - 確認後に翻訳文を変更する。
   *
   * 期待結果:
   * - 以前の確認完了通知と指摘なし案内が消え、次の確認まで未確認状態になる。
   */
  it('when checked direct input is edited, should clear the previous result until rechecked', () => {
    render(<QuickCheck />)

    checkTranslation('Save settings', '設定を保存')
    expect(
      screen.getByText('WTC の自動チェックでは問題が見つかりませんでした。'),
    ).toBeTruthy()

    fireEvent.change(screen.getByRole('textbox', { name: '翻訳文' }), {
      target: { value: '設定を保存して下さい' },
    })

    expect(screen.queryByText(/確認完了。Error/)).toBeNull()
    expect(
      screen.queryByText('WTC の自動チェックでは問題が見つかりませんでした。'),
    ).toBeNull()
  })
})
