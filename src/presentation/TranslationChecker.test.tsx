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
  within,
} from '@testing-library/react'
import i18n from '../i18n/i18n'
import po2js from 'gettext-converter/po2js'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
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

beforeEach(async () => {
  window.localStorage.clear()
  await i18n.changeLanguage('ja')
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
  const fileInput = screen.getByLabelText('ファイルを選択')
  const fileSection = fileInput.closest('section')

  if (fileSection === null) {
    throw new Error('PO ファイル入力を含むセクションがありません。')
  }

  fireEvent.change(fileInput, {
    target: { files: [file] },
  })
  fireEvent.click(within(fileSection).getByRole('button', { name: '確認する' }))
}

describe('TranslationChecker', () => {
  /**
   * 表示言語を English に切り替えたとき、トップ画面の主要 UI が英語表示へ切り替わることを確認する。
   *
   * 操作:
   * - 表示言語で English を選択する。
   *
   * 期待結果:
   * - アプリ見出し、クイックチェック、PO ファイル入力が英語で表示される。
   * - ファイル選択操作と未選択状態も英語で表示される。
   */
  it('when English is selected, should switch the main UI to English', async () => {
    render(<App />)

    fireEvent.change(screen.getByRole('combobox', { name: '表示言語' }), {
      target: { value: 'en' },
    })

    expect(
      await screen.findByRole('heading', { name: 'WP Translation Checker' }),
    ).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Quick check' })).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Select a PO file' }),
    ).toBeTruthy()
    expect(screen.getByLabelText('Choose file')).toBeTruthy()
    expect(screen.getByText('No file selected')).toBeTruthy()
  })

  /**
   * トップ画面でクイックチェックが PO ファイル入力より先に案内されることを確認する。
   *
   * 期待結果:
   * - 「1文をすぐ確認」が「PO ファイルを選択」より前に表示される。
   * - ファイル選択操作と未選択状態が日本語で表示される。
   */
  it('when the screen is rendered, should place quick check before the PO file input', () => {
    render(<App />)

    const quickCheckHeading = screen.getByRole('heading', {
      name: '1文をすぐ確認',
    })
    const fileInputHeading = screen.getByRole('heading', {
      name: 'PO ファイルを選択',
    })

    expect(
      quickCheckHeading.compareDocumentPosition(fileInputHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getByLabelText('ファイルを選択')).toBeTruthy()
    expect(screen.getByText('選択されていません')).toBeTruthy()
  })

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
   * 上限を超える PO ファイルでは File.text を呼ばずに確認不能として扱うことを確認する。
   *
   * 事前条件:
   * - 選択ファイルのサイズが 20 MiB を超えている。
   *
   * 操作:
   * - ファイルを選択して確認する。
   *
   * 期待結果:
   * - サイズ超過の案内を表示する。
   * - File.text を呼び出さない。
   */
  it('when the selected PO exceeds the size limit, should reject it before reading the file', async () => {
    render(<App />)
    const file = createPoFile('should not be read', 'large.po')
    let wasRead = false

    Object.defineProperty(file, 'size', {
      configurable: true,
      value: 20 * 1024 * 1024 + 1,
    })
    Object.defineProperty(file, 'text', {
      configurable: true,
      value: async () => {
        wasRead = true
        return 'should not be read'
      },
    })

    selectAndCheck(file)

    expect(
      await screen.findByRole('heading', {
        name: 'ファイルが大きすぎます',
      }),
    ).toBeTruthy()
    expect(wasRead).toBe(false)
  })

  /**
   * PO ファイル内の攻撃文字列が HTML として解釈されないことを確認する。
   *
   * 事前条件:
   * - 翻訳に img のイベント属性を含む文字列がある。
   *
   * 操作:
   * - PO ファイルを確認する。
   *
   * 期待結果:
   * - 攻撃文字列は表示文字列として保持され、img 要素や実行可能な属性を生成しない。
   */
  it('when a PO translation contains an XSS payload, should render it as text instead of HTML', async () => {
    const { container } = render(<App />)
    const payload = '<img src=x onerror=alert(1)>WordPressのテーブル'

    selectAndCheck(
      createPoFile(
        [
          'msgid ""',
          'msgstr ""',
          '"Language: ja\\n"',
          '',
          'msgid "WordPress Table"',
          `msgstr "${payload}"`,
          '',
        ].join('\n'),
      ),
    )

    await screen.findByRole('heading', {
      name: '確認が正常に完了しました',
    })

    expect(container.textContent).toContain(payload)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[onerror]')).toBeNull()
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
