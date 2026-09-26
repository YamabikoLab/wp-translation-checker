/**
 * @vitest-environment jsdom
 */

/**
 * 翻訳確認画面について、ファイル選択から確認完了または確認不能になるまでの主要な利用者操作を確認する。
 *
 * PO 解析は本番と同じ gettext-converter を利用し、File.text の成功・失敗だけをブラウザー境界として制御する。
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import po2js from 'gettext-converter/po2js'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import App from '../App'

const originalGettext = (
  globalThis as typeof globalThis & {
    gettext?: { po2js: (source: string) => unknown }
  }
).gettext

beforeAll(() => {
  ;(
    globalThis as typeof globalThis & {
      gettext?: { po2js: (source: string) => unknown }
    }
  ).gettext = { po2js }
})

afterEach(() => {
  cleanup()
})

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

/**
 * 画面へ渡す PO ファイルを生成する。
 *
 * @param source File.text が返す PO 文字列。
 * @param name 利用者へ表示するファイル名。
 * @returns 翻訳確認画面へ選択できる File。
 */
function createPoFile(source: string, name = 'sample.po'): File {
  const file = new File([], name, { type: 'text/x-gettext-translation' })
  Object.defineProperty(file, 'text', {
    configurable: true,
    value: async () => source,
  })
  return file
}

/**
 * ファイルを選択し、確認開始操作まで進める。
 *
 * @param file 確認対象として選択する File。
 */
function selectAndCheck(file: File) {
  fireEvent.change(screen.getByLabelText('.po ファイル'), {
    target: { files: [file] },
  })
  fireEvent.click(screen.getByRole('button', { name: '確認する' }))
}

describe('TranslationChecker', () => {
  /**
   * 事前条件:
   * - 日本語ロケールで指摘のない正常な PO がある。
   *
   * 操作:
   * - ファイルを選択して確認する。
   *
   * 期待結果:
   * - 正常完了の概要と指摘なし案内を表示し、結果概要へフォーカスする。
   */
  it('when a valid Japanese PO has no findings, should show the completed no-findings result', async () => {
    render(<App />)

    selectAndCheck(
      createPoFile(
        [
          'msgid ""',
          'msgstr ""',
          '"Language: ja\\n"',
          '',
          'msgid "Save settings"',
          'msgstr "設定を保存"',
          '',
        ].join('\n'),
      ),
    )

    const heading = await screen.findByRole('heading', {
      name: '確認が正常に完了しました',
    })

    expect(
      screen.getByText('WTC の自動チェックでは問題が見つかりませんでした。'),
    ).toBeTruthy()
    expect(screen.getByText('Error').nextElementSibling?.textContent).toBe(
      '0件',
    )
    expect(screen.getByText('Warning').nextElementSibling?.textContent).toBe(
      '0件',
    )

    await waitFor(() => {
      expect(heading.closest('section')).toBe(document.activeElement)
    })
  })

  /**
   * 事前条件:
   * - 日本語 v1 の Error を含む正常な PO がある。
   *
   * 操作:
   * - ファイルを選択して確認する。
   *
   * 期待結果:
   * - Error 件数と対象項目が指摘一覧へ表示される。
   */
  it('when a valid Japanese PO has a finding, should show the finding in the completed result', async () => {
    render(<App />)

    selectAndCheck(
      createPoFile(
        [
          'msgid ""',
          'msgstr ""',
          '"Language: ja\\n"',
          '',
          'msgid "Save settings"',
          'msgstr "設定を保存して下さい"',
          '',
        ].join('\n'),
      ),
    )

    await screen.findByRole('heading', {
      name: '確認が正常に完了しました',
    })

    expect(screen.getByText('1件の指摘')).toBeTruthy()
    expect(
      screen.getByText(
        'スタイルガイド: 3-6 「下さい / 全て / 既に」などの推奨表記',
      ),
    ).toBeTruthy()
  })

  /**
   * 事前条件:
   * - v1 未対応ロケールの正常な PO がある。
   *
   * 操作:
   * - ファイルを選択して確認する。
   *
   * 期待結果:
   * - 未対応ロケールの理由と解決済みロケールを表示する。
   */
  it('when the resolved locale is unsupported, should show unsupported-locale feedback', async () => {
    render(<App />)

    selectAndCheck(
      createPoFile(
        [
          'msgid ""',
          'msgstr ""',
          '"Language: en_US\\n"',
          '',
          'msgid "Save settings"',
          'msgstr "Save settings"',
          '',
        ].join('\n'),
      ),
    )

    expect(
      await screen.findByRole('heading', {
        name: 'このロケールには対応していません',
      }),
    ).toBeTruthy()
    expect(screen.getByText(/en_US/)).toBeTruthy()
  })

  /**
   * 事前条件:
   * - ブラウザーが選択ファイルを読み取れない。
   *
   * 操作:
   * - ファイルを選択して確認する。
   *
   * 期待結果:
   * - ファイル読み取り失敗の案内を表示する。
   */
  it('when the selected file cannot be read, should show file-read feedback', async () => {
    render(<App />)
    const file = new File([], 'broken.po', {
      type: 'text/x-gettext-translation',
    })
    Object.defineProperty(file, 'text', {
      configurable: true,
      value: async () => {
        throw new Error('read failed')
      },
    })

    selectAndCheck(file)

    expect(
      await screen.findByRole('heading', {
        name: 'ファイルを読み取れませんでした',
      }),
    ).toBeTruthy()
  })
})
