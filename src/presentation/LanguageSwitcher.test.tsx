/**
 * @vitest-environment jsdom
 */

/**
 * UI 言語切り替えについて、表示更新、保存、文書言語とページタイトルの同期を利用者操作から確認する。
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import i18n from '../i18n/i18n'
import { LanguageSwitcher } from './LanguageSwitcher'

beforeEach(async () => {
  window.localStorage.clear()
  await i18n.changeLanguage('ja')
})

afterEach(() => {
  cleanup()
})

describe('LanguageSwitcher', () => {
  /**
   * 利用者が English を選択したとき、表示と保存状態が同じ UI 言語へ切り替わることを確認する。
   *
   * 事前条件:
   * - 日本語 UI が表示されている。
   *
   * 操作:
   * - 表示言語で English を選択する。
   *
   * 期待結果:
   * - 言語選択 UI が英語表示へ変わる。
   * - 選択結果が保存され、文書言語とページタイトルも英語になる。
   */
  it('when English is selected, should update the UI language and persist the selection', async () => {
    render(<LanguageSwitcher />)

    fireEvent.change(screen.getByRole('combobox', { name: '表示言語' }), {
      target: { value: 'en' },
    })

    await waitFor(() => {
      expect(
        screen.getByRole('combobox', { name: 'Display language' }),
      ).toBeTruthy()
    })

    expect(window.localStorage.getItem('wtc-ui-language')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('WP Translation Checker')
  })
})
