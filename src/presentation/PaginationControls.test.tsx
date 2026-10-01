/**
 * @vitest-environment jsdom
 */

/**
 * 指摘一覧のページ移動、直接入力、表示件数変更を利用者操作から確認する。
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PaginationControls } from './PaginationControls'

beforeEach(async () => {
  window.localStorage.clear()
  await i18n.changeLanguage('ja')
})

afterEach(() => {
  cleanup()
})

describe('PaginationControls', () => {
  /**
   * 事前条件:
   * - 3ページ中2ページ目を表示している。
   *
   * 操作:
   * - 前後移動、ページ番号、表示件数を操作する。
   *
   * 期待結果:
   * - 各操作で確定した値だけが親へ通知される。
   */
  it('when navigation controls are used, should report the requested page and page size', () => {
    const onPageChange = vi.fn()
    const onPageSizeChange = vi.fn()

    render(
      <PaginationControls
        currentPage={2}
        totalPages={3}
        pageSize={25}
        totalCount={60}
        rangeStart={26}
        rangeEnd={50}
        items={[1, 2, 3]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '前のページ' }))
    fireEvent.click(screen.getByRole('button', { name: '次のページ' }))
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    fireEvent.change(screen.getByLabelText('表示件数'), {
      target: { value: '50' },
    })

    expect(onPageChange.mock.calls).toEqual([[1], [3], [3]])
    expect(onPageSizeChange).toHaveBeenCalledWith(50)
  })

  /**
   * 事前条件:
   * - 3ページ中2ページ目を表示している。
   *
   * 操作:
   * - 存在しないページを入力してフォーカスを外した後、有効なページを Enter で確定する。
   *
   * 期待結果:
   * - 不正値は現在ページへ戻り、有効値だけが親へ通知される。
   */
  it('when a direct page value is committed, should reject invalid values and accept a valid page', () => {
    const onPageChange = vi.fn()

    render(
      <PaginationControls
        currentPage={2}
        totalPages={3}
        pageSize={25}
        totalCount={60}
        rangeStart={26}
        rangeEnd={50}
        items={[1, 2, 3]}
        onPageChange={onPageChange}
        onPageSizeChange={() => undefined}
      />,
    )

    const input = screen.getByRole('textbox', { name: '移動先ページ' })

    fireEvent.change(input, { target: { value: '9' } })
    fireEvent.blur(input)

    expect((input as HTMLInputElement).value).toBe('2')
    expect(onPageChange).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: '3' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  /**
   * 事前条件:
   * - 指摘一覧が1ページだけで収まる。
   *
   * 操作:
   * - ページ操作領域を確認する。
   *
   * 期待結果:
   * - 不要なページ移動操作は表示せず、表示件数選択だけを残す。
   */
  it('when only one page exists, should omit page navigation controls', () => {
    render(
      <PaginationControls
        currentPage={1}
        totalPages={1}
        pageSize={25}
        totalCount={2}
        rangeStart={1}
        rangeEnd={2}
        items={[1]}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
      />,
    )

    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.getByLabelText('表示件数')).toBeTruthy()
  })
})
