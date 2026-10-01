/**
 * @vitest-environment jsdom
 */

/**
 * WTC のチェック範囲案内が、結果画面で常時確認でき必要な情報へ到達できることを React の表示境界から確認する。
 */

import { cleanup, render, screen } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CheckScopeGuide } from './CheckScopeGuide'

beforeEach(() => {
  window.localStorage.clear()
  void i18n.changeLanguage('ja')
})

afterEach(() => {
  cleanup()
})

describe('CheckScopeGuide', () => {
  /**
   * 事前条件:
   * - チェック範囲案内を結果概要に表示する。
   *
   * 操作:
   * - 初期表示を確認する。
   *
   * 期待結果:
   * - 案内内容が常時表示され、13項目をチェックすることと手動確認項目を確認できる。
   */
  it('when first rendered, should show the check scope guidance without another interaction', () => {
    render(<CheckScopeGuide />)

    expect(
      screen.getByRole('heading', { name: 'WTC のチェック範囲' }),
    ).toBeTruthy()
    expect(screen.getByText('13項目をチェック')).toBeTruthy()
    expect(screen.getByText('手動で確認したい主な項目')).toBeTruthy()
  })

  /**
   * 事前条件:
   * - チェック範囲案内が表示されている。
   *
   * 操作:
   * - 案内内容を確認する。
   *
   * 期待結果:
   * - 自動チェック・一部チェック・手動確認の区分と、詳細資料への導線を利用できる。
   */
  it('when guidance content is inspected, should expose the three check categories and detail links', () => {
    render(<CheckScopeGuide />)

    expect(screen.getByText('✅ 自動チェック')).toBeTruthy()
    expect(screen.getByText('△ 一部チェック')).toBeTruthy()
    expect(screen.getByText('👀 手動確認')).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: '詳しい対応状況を見る' })
        .getAttribute('href'),
    ).toBe('https://github.com/YamabikoLab/wp-translation-checker#check-scope')
    expect(
      screen
        .getByRole('link', {
          name: 'WordPress 日本語翻訳スタイルガイドを見る',
        })
        .getAttribute('href'),
    ).toBe(
      'https://ja.wordpress.org/team/handbook/translation/translation-style-guide/',
    )
  })
})
