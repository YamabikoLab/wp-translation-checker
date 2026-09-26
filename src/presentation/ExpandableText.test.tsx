/**
 * @vitest-environment jsdom
 */

/**
 * 長文の折りたたみと問題箇所の強調表示を、利用者から見える表示境界で確認する。
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ExpandableText } from './ExpandableText'

afterEach(() => {
  cleanup()
})

describe('ExpandableText', () => {
  /**
   * 事前条件:
   * - 折りたたみ対象にならない短文と一致範囲がある。
   *
   * 操作:
   * - 初期表示を確認する。
   *
   * 期待結果:
   * - 一致範囲を強調し、展開操作は表示しない。
   */
  it('when text is short, should show highlighted content without an expand control', () => {
    const { container } = render(
      <ExpandableText text="WordPressの表" matches={[{ start: 8, end: 10 }]} />,
    )

    expect(container.querySelector('mark')?.textContent).toBe('sの')
    expect(screen.queryByRole('button', { name: '全文を表示' })).toBeNull()
  })

  /**
   * 事前条件:
   * - 200文字を超える長文がある。
   *
   * 操作:
   * - 「全文を表示」と「折りたたむ」を順に押す。
   *
   * 期待結果:
   * - 長文を展開でき、再び折りたたみ表示へ戻せる。
   */
  it('when text is long, should let the user expand and collapse it', () => {
    const text = 'あ'.repeat(210)

    render(<ExpandableText text={text} />)

    const expand = screen.getByRole('button', { name: '全文を表示' })
    expect(expand.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(expand)

    const collapse = screen.getByRole('button', { name: '折りたたむ' })
    expect(collapse.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(text)).toBeTruthy()

    fireEvent.click(collapse)

    expect(screen.getByRole('button', { name: '全文を表示' })).toBeTruthy()
  })
})
