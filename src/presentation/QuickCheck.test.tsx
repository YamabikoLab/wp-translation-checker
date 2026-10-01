/**
 * @vitest-environment jsdom
 */

/**
 * 原文・翻訳文のクイックチェックについて、入力可否、既存 Validation Core の結果表示、入力上限、XSS 安全性を利用者操作から確認する。
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { QuickCheck } from './QuickCheck'

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
   * 原文または翻訳文が未入力の場合に、確認を開始できないことを確認する。
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
   * Style Guide の問題を含む直接入力を確認したとき、既存の Finding 表示で Error を確認できることを確認する。
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
   * 問題のない直接入力を確認したとき、指摘なし案内を表示することを確認する。
   */
  it('when direct input has no findings, should show the no-findings message', () => {
    render(<QuickCheck />)

    checkTranslation('Save settings', '設定を保存')

    expect(
      screen.getByText('WTC の自動チェックでは問題が見つかりませんでした。'),
    ).toBeTruthy()
  })

  /**
   * 100,001文字の入力では Validation Core の結果を表示せず、入力上限を通知することを確認する。
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
   * 攻撃文字列を直接入力しても HTML として解釈せず、textarea の文字列として保持することを確認する。
   */
  it('when direct input contains XSS payloads, should keep them as text instead of executable DOM', () => {
    const { container } = render(<QuickCheck />)
    const payload =
      '<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">test</a>'

    fireEvent.change(screen.getByRole('textbox', { name: '翻訳文' }), {
      target: { value: payload },
    })

    expect(
      (screen.getByRole('textbox', { name: '翻訳文' }) as HTMLTextAreaElement)
        .value,
    ).toBe(payload)
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull()
    expect(container.querySelector('[onerror]')).toBeNull()
  })
})
