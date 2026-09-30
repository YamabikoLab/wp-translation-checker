/**
 * 確認を完了できない状態について、理由と利用者が次に確認すべき内容を表示する責任を持つ。
 *
 * 画面状態の判定結果だけを受け取り、確認処理や状態遷移は扱わない。
 */

import type { PresentationState } from './presentation-model'

/**
 * 重要な確認不能状態を利用者へ説明する。
 *
 * @param props 確認不能状態を表示するための属性。
 * @param props.state 確認不能を表す画面状態。
 * @returns 確認不能理由と次の操作を示す領域。
 */
export function Feedback({
  state,
}: {
  state: Extract<PresentationState, { status: 'feedback' }>
}) {
  switch (state.reason) {
    case 'file-too-large':
      return (
        <>
          <h2>ファイルが大きすぎます</h2>
          <p>
            20 MiB 以下の .po
            ファイルを選択してください。大きなファイルは読み込みを開始しません。
          </p>
        </>
      )

    case 'file-read-failure':
      return (
        <>
          <h2>ファイルを読み取れませんでした</h2>
          <p>別の .po ファイルを選択して、もう一度確認してください。</p>
        </>
      )

    case 'invalid-po':
      return (
        <>
          <h2>PO ファイルを正常に確認できませんでした</h2>
          <p>
            確認可能な PO
            として解釈できませんでした。ファイル内容を確認するか、別の .po
            ファイルを選択してください。
          </p>
        </>
      )

    case 'unresolved-locale':
      return (
        <>
          <h2>ロケールを判定できませんでした</h2>
          <p>
            対象ロケールを特定できないため確認を続行できません。PO ファイルの
            Language ヘッダーを確認してください。
          </p>
        </>
      )

    case 'unsupported-locale':
      return (
        <>
          <h2>このロケールには対応していません</h2>
          <p>
            判定されたロケールは「{state.locale}
            」です。現在は日本語（ja）のみ対応しています。
          </p>
        </>
      )
  }
}
