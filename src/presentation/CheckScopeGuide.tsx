/**
 * WTC が自動確認する範囲と、人が確認する範囲の概要を結果画面で案内する責任を持つ。
 *
 * 詳細なルール定義は要件定義書を正本とし、この表示では翻訳作業中に必要な概要と公開サマリーへの導線だけを提供する。
 */

import { useUiTranslation } from '../i18n/i18n'
import styles from './TranslationChecker.module.css'

const REQUIREMENTS_URL =
  'https://github.com/YamabikoLab/wp-translation-checker/blob/main/docs/requirements/v1-requirements.md'
const README_URL =
  'https://github.com/YamabikoLab/wp-translation-checker#check-scope'
const STYLE_GUIDE_URL =
  'https://ja.wordpress.org/team/handbook/translation/translation-style-guide/'

/**
 * 結果概要に常時表示する WTC のチェック範囲案内。
 *
 * @returns 自動チェック・一部チェック・手動確認の役割分担と詳細資料への導線。
 */
export function CheckScopeGuide() {
  const { t } = useUiTranslation()
  return (
    <section
      className={styles.scopeGuide}
      aria-labelledby="check-scope-guide-title"
    >
      <div className={styles.scopeGuideHeader}>
        <h3 id="check-scope-guide-title">{t('scope.title')}</h3>
        <span className={styles.scopeGuideSummaryNote}>
          {t('scope.summary')}
        </span>
      </div>

      <div className={styles.scopeGuideContent}>
        <p>{t('scope.description')}</p>

        <dl className={styles.scopeGuideLegend}>
          <div>
            <dt>{t('scope.automatic')}</dt>
            <dd>{t('scope.automaticBody')}</dd>
          </div>
          <div>
            <dt>{t('scope.partial')}</dt>
            <dd>{t('scope.partialBody')}</dd>
          </div>
          <div>
            <dt>{t('scope.manual')}</dt>
            <dd>{t('scope.manualBody')}</dd>
          </div>
        </dl>

        <div className={styles.manualCheck}>
          <h3>{t('scope.manualTitle')}</h3>
          <ul>
            <li>{t('scope.manualNatural')}</li>
            <li>{t('scope.manualTerms')}</li>
            <li>{t('scope.manualKatakana')}</li>
            <li>{t('scope.manualBrand')}</li>
            <li>{t('scope.manualDate')}</li>
            <li>{t('scope.manualPlaceholder')}</li>
          </ul>
        </div>

        <p className={styles.scopeGuideLinks}>
          <a href={README_URL} target="_blank" rel="noreferrer">
            {t('scope.readStatus')}
          </a>
          <a href={REQUIREMENTS_URL} target="_blank" rel="noreferrer">
            {t('scope.readRequirements')}
          </a>
          <a href={STYLE_GUIDE_URL} target="_blank" rel="noreferrer">
            {t('scope.readStyleGuide')}
          </a>
        </p>
      </div>
    </section>
  )
}
