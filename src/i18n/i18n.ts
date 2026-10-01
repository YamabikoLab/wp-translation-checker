/**
 * WTC の UI 表示言語を初期化し、ブラウザー内の言語選択と文書情報を同期する責任を持つ。
 *
 * UI のロケールだけを扱い、PO ファイルや検証対象ロケールの判定には関与しない。
 */

import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import { en } from './locales/en'
import { ja } from './locales/ja'

export type UiLanguage = 'ja' | 'en'

const STORAGE_KEY = 'wtc-ui-language'
const DEFAULT_LANGUAGE: UiLanguage = 'en'

function isUiLanguage(value: string | null): value is UiLanguage {
  return value === 'ja' || value === 'en'
}

function resolveInitialLanguage(): UiLanguage {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isUiLanguage(stored)) return stored
  } catch {
    // 保存領域を利用できない環境でも、ブラウザー言語から表示を継続する。
  }

  const browserLanguage = navigator.language?.toLowerCase()
  if (browserLanguage?.startsWith('ja')) return 'ja'
  return DEFAULT_LANGUAGE
}

function syncDocument(language: UiLanguage) {
  document.documentElement.lang = language
  document.title = i18n.t('meta.title', { lng: language })
}

void i18n.use(initReactI18next).init({
  resources: { ja: { translation: ja }, en: { translation: en } },
  lng: resolveInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: ['ja', 'en'],
  interpolation: { escapeValue: false },
  initImmediate: false,
})

syncDocument((i18n.resolvedLanguage === 'ja' ? 'ja' : 'en') as UiLanguage)

i18n.on('languageChanged', (language) => {
  syncDocument(language === 'ja' ? 'ja' : 'en')
})

/**
 * UI 表示で利用する翻訳関数と現在言語を React コンポーネントへ提供する。
 *
 * @returns react-i18next の翻訳境界。
 */
export function useUiTranslation() {
  return useTranslation()
}

/**
 * 利用者が選択した UI 言語を保存し、現在の画面へ反映する。
 *
 * @param language WTC が対応する UI 言語。
 */
export async function setUiLanguage(language: UiLanguage) {
  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // 保存できない場合も現在セッションの表示切り替えは成立させる。
  }
  await i18n.changeLanguage(language)
}

export default i18n
