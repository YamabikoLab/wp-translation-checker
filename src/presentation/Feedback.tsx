/**
 * 確認を完了できない状態について、理由と利用者が次に確認すべき内容を表示する責任を持つ。
 *
 * 画面状態の判定結果だけを受け取り、確認処理や状態遷移は扱わない。
 */

import { useUiTranslation } from '@/i18n/i18n'
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
  const { t } = useUiTranslation()

  switch (state.reason) {
    case 'file-too-large':
      return (
        <>
          <h2>{t('feedback.tooLargeTitle')}</h2>
          <p>{t('feedback.tooLargeBody')}</p>
        </>
      )

    case 'file-read-failure':
      return (
        <>
          <h2>{t('feedback.readFailureTitle')}</h2>
          <p>{t('feedback.readFailureBody')}</p>
        </>
      )

    case 'invalid-po':
      return (
        <>
          <h2>{t('feedback.invalidPoTitle')}</h2>
          <p>{t('feedback.invalidPoBody')}</p>
        </>
      )

    case 'unresolved-locale':
      return (
        <>
          <h2>{t('feedback.unresolvedTitle')}</h2>
          <p>{t('feedback.unresolvedBody')}</p>
        </>
      )

    case 'unsupported-locale':
      return (
        <>
          <h2>{t('feedback.unsupportedTitle')}</h2>
          <p>{t('feedback.unsupportedBody', { locale: state.locale })}</p>
        </>
      )
  }
}
