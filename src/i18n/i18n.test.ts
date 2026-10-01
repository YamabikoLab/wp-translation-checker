/**
 * @vitest-environment jsdom
 */

/**
 * WTC の UI 初期言語決定について、保存済み選択、ブラウザー言語、英語 fallback と文書同期を確認する。
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

const originalLanguage = navigator.language

afterEach(() => {
  window.localStorage.clear()
  Object.defineProperty(navigator, 'language', {
    configurable: true,
    value: originalLanguage,
  })
  vi.resetModules()
})

describe('UI i18n initialization', () => {
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

  it('when no language is stored and the browser is Japanese, should use Japanese', async () => {
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      value: 'ja-JP',
    })

    const { default: i18n } = await import('./i18n')

    expect(i18n.resolvedLanguage).toBe('ja')
    expect(document.documentElement.lang).toBe('ja')
  })

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
