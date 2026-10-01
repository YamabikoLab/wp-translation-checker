/**
 * WTC の UI 表示言語を初期化し、ブラウザー内の言語選択と文書情報を同期する責任を持つ。
 *
 * UI のロケールだけを扱い、PO ファイルや検証対象ロケールの判定には関与しない。
 */

import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import { en } from './locales/en'
import { ja } from './locales/ja'

/**
 * WTC 自体の表示に利用する UI 言語。
 *
 * PO ファイルや検証対象のロケールとは独立して扱う。
 */
export type UiLanguage = 'ja' | 'en'

/** 利用者が明示的に選択した UI 言語をブラウザーへ保存するキー。 */
const STORAGE_KEY = 'wtc-ui-language'

/** 保存値やブラウザー言語から対応言語を決定できない場合に利用する既定言語。 */
const DEFAULT_LANGUAGE: UiLanguage = 'en'

/**
 * 保存値が WTC の対応 UI 言語として利用できるか判定する。
 *
 * @param value ブラウザー保存領域から取得した言語値。
 * @returns 対応 UI 言語として利用できる場合は true。
 */
function isUiLanguage(value: string | null): value is UiLanguage {
  return value === 'ja' || value === 'en'
}

/**
 * 初回表示に利用する UI 言語を、保存済み選択、ブラウザー言語、既定言語の順で決定する。
 *
 * @returns WTC が初期表示に利用する対応 UI 言語。
 */
function resolveInitialLanguage(): UiLanguage {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)

    // 利用者が以前選択した対応言語は、ブラウザーの言語設定より優先する。
    if (isUiLanguage(stored)) return stored
  } catch {
    // 保存領域を利用できない環境でも、ブラウザー言語から表示を継続する。
  }

  const browserLanguage = navigator.language?.toLowerCase()

  // 保存済みの対応言語がない場合だけ、日本語系ブラウザーを日本語 UI へ割り当てる。
  if (browserLanguage?.startsWith('ja')) return 'ja'

  return DEFAULT_LANGUAGE
}

/**
 * 現在の UI 言語を文書言語とページタイトルへ同期する。
 *
 * @param language 文書情報へ反映する対応 UI 言語。
 */
function syncDocument(language: UiLanguage) {
  document.documentElement.lang = language
  document.title = i18n.t('meta.title', { lng: language })
}

// UI 翻訳リソースはアプリに同梱し、初期描画前に利用できる状態へ同期的に初期化する。
void i18n.use(initReactI18next).init({
  resources: { ja: { translation: ja }, en: { translation: en } },
  lng: resolveInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: ['ja', 'en'],
  interpolation: { escapeValue: false },
  initAsync: false,
})

// 初期表示時も、翻訳状態とブラウザー文書の言語情報を一致させる。
syncDocument((i18n.resolvedLanguage === 'ja' ? 'ja' : 'en') as UiLanguage)

// 実行中の言語変更でも、支援技術向け文書言語とページタイトルを同時に更新する。
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
 * @returns 翻訳状態と文書情報への反映が完了したときに解決する Promise。
 */
export async function setUiLanguage(language: UiLanguage) {
  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // 保存できない場合も現在セッションの表示切り替えは成立させる。
  }
  await i18n.changeLanguage(language)
}

/** WTC の UI 翻訳状態を所有する i18next インスタンス。 */
export default i18n
