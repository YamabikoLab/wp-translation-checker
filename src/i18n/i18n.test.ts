/**
 * @vitest-environment jsdom
 */

/**
 * WTC の UI 初期言語決定について、保存済み選択、ブラウザー言語、英語 fallback と文書同期を確認する。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalLanguage = navigator.language

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  window.localStorage.clear()
  Object.defineProperty(navigator, 'language', {
    configurable: true,
    value: originalLanguage,
  })
  vi.resetModules()
})

describe('UI i18n initialization', () => {
  /**
   * 保存済みの対応言語がある場合に、ブラウザー言語より利用者の選択を優先することを確認する。
   *
   * 事前条件:
   * - 日本語が保存済みで、ブラウザー言語は英語である。
   *
   * 操作:
   * - UI i18n を初期化する。
   *
   * 期待結果:
   * - 日本語が選択され、文書言語とページタイトルも日本語になる。
   */
  it('when a supported language is stored, should prefer it to the browser language', async () => {
    window.localStorage.setItem('wtc-ui-language', 'ja')
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      value: 'en-US',
    })

    const { default: i18n } = await import('./i18n')

    expect(i18n.resolvedLanguage).toBe('ja')
    expect(document.documentElement.lang).toBe('ja')
    expect(document.title).toBe('WP 翻訳チェッカー')
  })

  /**
   * 保存済み言語がない場合に、日本語ブラウザーでは日本語 UI を選ぶことを確認する。
   *
   * 事前条件:
   * - UI 言語は保存されていない。
   * - ブラウザー言語は日本語である。
   *
   * 操作:
   * - UI i18n を初期化する。
   *
   * 期待結果:
   * - 日本語が選択され、文書言語も日本語になる。
   */
  it('when no language is stored and the browser is Japanese, should use Japanese', async () => {
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      value: 'ja-JP',
    })

    const { default: i18n } = await import('./i18n')

    expect(i18n.resolvedLanguage).toBe('ja')
    expect(document.documentElement.lang).toBe('ja')
  })

  /**
   * 保存値が WTC の対応言語でない場合に、その値を採用せずブラウザー言語から決定することを確認する。
   *
   * 事前条件:
   * - 未対応の UI 言語が保存されている。
   * - ブラウザー言語は日本語である。
   *
   * 操作:
   * - UI i18n を初期化する。
   *
   * 期待結果:
   * - 不正な保存値は無視され、日本語 UI が選択される。
   */
  it('when an unsupported language is stored, should ignore it and use the supported browser language', async () => {
    window.localStorage.setItem('wtc-ui-language', 'fr')
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      value: 'ja-JP',
    })

    const { default: i18n } = await import('./i18n')

    expect(i18n.resolvedLanguage).toBe('ja')
    expect(document.documentElement.lang).toBe('ja')
  })

  /**
   * 保存済み言語がなくブラウザー言語も未対応の場合に、英語へ fallback することを確認する。
   *
   * 事前条件:
   * - UI 言語は保存されていない。
   * - ブラウザー言語は WTC の UI 対応外である。
   *
   * 操作:
   * - UI i18n を初期化する。
   *
   * 期待結果:
   * - 英語が選択され、文書言語とページタイトルも英語になる。
   */
  it('when no language is stored and the browser language is unsupported, should fall back to English', async () => {
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      value: 'fr-FR',
    })

    const { default: i18n } = await import('./i18n')

    expect(i18n.resolvedLanguage).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('WP Translation Checker')
  })
})
