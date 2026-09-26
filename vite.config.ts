/**
 * Vite のアプリケーション配信と、PO Interpretation が利用する parser の browser bundle 配信を構成する。
 *
 * gettext-converter の ESM 経路は browser 向けではない依存を含むため、公式 browser bundle を
 * 開発サーバーと production build の両方で同じ URL から提供する責任をこの境界が持つ。
 * アプリケーション version は package.json を正本として build 時に UI へ渡す。
 * Vitest の coverage は製品コード全体を対象にし、品質ゲートの基準もこの設定で一元管理する。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const validationSourcePath = fileURLToPath(
  new URL('./src/validation', import.meta.url),
)
const gettextBrowserBundlePath = fileURLToPath(
  new URL('./node_modules/gettext-converter/gettext.min.js', import.meta.url),
)
const packageJsonPath = fileURLToPath(
  new URL('./package.json', import.meta.url),
)
const gettextBrowserBundle = readFileSync(gettextBrowserBundlePath, 'utf8')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
  version: string
}

const serveGettextBrowserBundle = (): Plugin => ({
  name: 'serve-gettext-converter-browser-bundle',
  configureServer(server) {
    server.middlewares.use('/gettext-converter.js', (_request, response) => {
      response.statusCode = 200
      response.setHeader('Content-Type', 'text/javascript; charset=utf-8')
      response.end(gettextBrowserBundle)
    })
  },
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'gettext-converter.js',
      source: gettextBrowserBundle,
    })
  },
})

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      '@': validationSourcePath,
    },
  },
  plugins: [react(), serveGettextBrowserBundle()],
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/main.tsx'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
