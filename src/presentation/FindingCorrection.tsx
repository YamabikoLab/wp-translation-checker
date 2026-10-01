/**
 * 1件の指摘について、翻訳の修正案を画面内だけで一時編集し、Style Guide と Glossary の双方で再チェックする責任を持つ。
 *
 * 修正案と再チェック結果は対象カード内だけで扱い、元の PO ファイル、確認結果、集計、保存・コピー対象は変更しない。
 */

import { useState } from 'react'
import { checkEntry } from '@/check/check'
import { useUiTranslation } from '@/i18n/i18n'
import { ExpandableText } from './ExpandableText'
import { createFindings, type Finding } from './presentation-model'
import styles from './TranslationChecker.module.css'

const STYLE_GUIDE_URL =
  'https://ja.wordpress.org/team/handbook/translation/translation-style-guide/'

/** 修正案の再チェックで検証処理へ渡す最大文字数。 */
const MAX_CORRECTION_LENGTH = 100_000

/** 1件の修正案について、利用者から見た編集・再チェック状態を表す。 */
type CorrectionState =
  | { status: 'viewing' }
  | { status: 'editing'; draftTranslation: string }
  | { status: 'too-large'; draftTranslation: string }
  | {
      status: 'checked'
      draftTranslation: string
      result: readonly Finding[]
    }

/**
 * 1件の指摘に対して、修正案の入力、再チェック、キャンセル、再チェック結果の確認を提供する。
 *
 * @param props 修正対象となる指摘。
 * @param props.finding 修正案を確認する元の指摘。
 * @returns 対象カード内で完結する修正案の確認 UI。
 */
export function FindingCorrection({ finding }: { finding: Finding }) {
  const { t } = useUiTranslation()
  const translationForm = finding.entry.translations.find(
    (form) => form.index === finding.translationFormIndex,
  )
  const translation = translationForm?.text ?? ''
  const translationIndex =
    translationForm?.index ?? finding.translationFormIndex
  const [state, setState] = useState<CorrectionState>({ status: 'viewing' })

  // 修正操作を開始していない間は元の指摘表示を保ち、利用者が明示的に開始した場合だけ一時編集領域を開く。
  if (state.status === 'viewing') {
    return (
      <div className={styles.correctionStart}>
        <button
          type="button"
          className={styles.correctionStartButton}
          onClick={() => {
            setState({ status: 'editing', draftTranslation: translation })
          }}
        >
          {t('correction.start')}
        </button>
      </div>
    )
  }

  /**
   * 現在の修正案だけを、元の原文情報を保った1件の翻訳として Style Guide / Glossary の両検証へ渡す。
   *
   * 元の確認結果は更新せず、このカード内で確認するための結果だけを保持する。
   */
  const handleRecheck = () => {
    // 過大な修正案は Validation Core へ渡さず、このカード内で利用者へ入力制限を知らせる。
    if (state.draftTranslation.length > MAX_CORRECTION_LENGTH) {
      setState({
        status: 'too-large',
        draftTranslation: state.draftTranslation,
      })
      return
    }

    // 1件だけの一時再チェックでは配列位置と entryIndex の公開契約を合わせるため、検証用 entryIndex を0へ正規化する。
    const entry = {
      entryIndex: 0,
      source: finding.entry.source,
      translations: [
        {
          index: translationIndex,
          text: state.draftTranslation,
        },
      ],
    }
    setState({
      status: 'checked',
      draftTranslation: state.draftTranslation,
      result: createFindings(checkEntry(entry)),
    })
  }

  // 再チェック済みの場合だけ、その修正案に対する Error / Warning を結果表示へ渡す。
  const messages = state.status === 'checked' ? state.result : []

  return (
    <section
      className={styles.correction}
      aria-labelledby={`correction-title-${finding.key}`}
    >
      <div className={styles.correctionHeading}>
        <div>
          <h3 id={`correction-title-${finding.key}`}>
            {t('correction.title')}
          </h3>
          <p>{t('correction.hint')}</p>
        </div>
      </div>

      <label className={styles.correctionField}>
        <span>{t('correction.translation')}</span>
        <textarea
          value={state.draftTranslation}
          rows={4}
          onChange={(event) => {
            setState({
              status: 'editing',
              draftTranslation: event.target.value,
            })
          }}
        />
      </label>

      <div className={styles.correctionActions}>
        <button
          type="button"
          className={styles.correctionCheckButton}
          onClick={handleRecheck}
        >
          {t('correction.recheck')}
        </button>
        <button
          type="button"
          className={styles.correctionCancelButton}
          onClick={() => {
            setState({ status: 'viewing' })
          }}
        >
          {t('correction.cancel')}
        </button>
      </div>

      <div className={styles.correctionResult} role="status">
        {state.status === 'too-large' && (
          <p>{t('correction.tooLarge')}</p>
        )}
        {state.status === 'checked' &&
          (messages.length === 0 ? (
            <p className={styles.correctionSuccess}>
              {t('correction.noFindings')}
            </p>
          ) : (
            <>
              <h4>{t('correction.result')}</h4>
              <div className={styles.correctionFindings}>
                {/* 修正案で残っている各指摘を、通常結果と同じ判断材料を確認できる単位で表示する。 */}
                {messages.map((message) => (
                  <section
                    key={message.key}
                    className={styles.correctionFinding}
                  >
                    <div className={styles.correctionFindingHeader}>
                      <span
                        className={
                          message.severity === 'Error'
                            ? styles.errorBadge
                            : styles.warningBadge
                        }
                      >
                        {message.severity}
                      </span>
                      <p>
                        {message.kind === 'glossary'
                          ? t('finding.glossaryMessage', {
                              term: message.glossary.originalTerm,
                            })
                          : message.message}
                      </p>
                    </div>
                    <ExpandableText
                      text={state.draftTranslation}
                      matches={message.matches}
                    />
                    {message.kind === 'glossary' && (
                      <p className={styles.correctionGuide}>
                        {t('correction.glossaryCandidates', {
                          candidates: message.glossary.candidates
                            .map((candidate) => candidate.translation)
                            .filter((translation) => translation !== '')
                            .join(' / '),
                        })}
                      </p>
                    )}
                    <p className={styles.correctionGuide}>
                      <span>
                        {message.kind === 'glossary'
                          ? t('finding.glossaryItem')
                          : t('finding.styleGuideItem', {
                              item: message.styleGuideItem,
                            })}
                      </span>
                      <a
                        href={
                          message.kind === 'glossary'
                            ? 'https://translate.wordpress.org/locale/ja/default/glossary/'
                            : STYLE_GUIDE_URL
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        {message.kind === 'glossary'
                          ? t('finding.glossaryLink')
                          : t('finding.styleGuideLink')}
                      </a>
                    </p>
                  </section>
                ))}
              </div>
            </>
          ))}
      </div>
    </section>
  )
}
