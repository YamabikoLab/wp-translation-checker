/**
 * WTC の UI 表示言語を利用者が日本語 / English から選択する操作を提供する。
 */

import { setUiLanguage, useUiTranslation, type UiLanguage } from '../i18n/i18n'
import styles from './TranslationChecker.module.css'

/**
 * 現在の UI 言語を示し、選択変更を即時反映する言語切り替え。
 *
 * @returns ネイティブの選択要素による表示言語切り替え。
 */
export function LanguageSwitcher() {
  const { t, i18n } = useUiTranslation()

  // 選択要素には WTC が対応する2言語だけを渡し、未確定値は既定側の英語として表示する。
  const language: UiLanguage = i18n.resolvedLanguage === 'ja' ? 'ja' : 'en'

  return (
    <label className={styles.languageSwitcher}>
      <span>{t('language.label')}</span>
      <select
        value={language}
        onChange={(event) => {
          void setUiLanguage(event.target.value as UiLanguage)
        }}
      >
        <option value="ja">{t('language.japanese')}</option>
        <option value="en">{t('language.english')}</option>
      </select>
    </label>
  )
}
