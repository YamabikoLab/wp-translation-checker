/**
 * WTC の日本語 UI 文言を定義する。
 *
 * 検証ルールや Glossary データではなく、画面表示にだけ利用する文言を所有する。
 */

export const ja = {
  meta: { title: 'WP 翻訳チェッカー' },
  language: { label: '表示言語', japanese: '日本語', english: 'English' },
  app: {
    title: 'WP 翻訳チェッカー',
    lead: 'WordPress 日本語翻訳スタイルガイド（2026年8月28日最終更新）の対象ルールと、日本語 Glossary の登録訳語をブラウザー内で確認します。',
    privacy: '入力・選択した翻訳内容は外部の確認サービスへ送信しません。',
    fileTitle: 'PO ファイルを選択', fileHint: 'ファイルを選択しただけでは確認を開始しません。', fileLabel: '.po ファイル',
    selectedFile: '選択中: {{fileName}}', checking: '確認中…', check: '確認する', checkingFile: '{{fileName}} を確認しています。',
    completedEyebrow: '確認完了', completedTitle: '確認が正常に完了しました', errorCount: '{{count}}件', warningCount: '{{count}}件',
    noFindings: 'WTC の自動チェックでは問題が見つかりませんでした。', manualAlso: '手動で確認したい項目もあります。',
    exportTitle: '確認結果を共有・保存', exportHint: 'CSV / JSON はファイルとして保存し、Markdown はクリップボードへコピーします。',
    csvDownload: 'CSV をダウンロード', jsonDownload: 'JSON をダウンロード', markdownCopy: 'Markdown をコピー',
    markdownCopied: 'Markdown をクリップボードへコピーしました。', markdownCopyFailed: 'Markdown をコピーできませんでした。ブラウザーのクリップボード利用設定を確認してください。',
    findingsTitle: '指摘一覧', findingsCount: '{{count}}件の指摘', filterLabel: '項目で絞り込む', allItems: 'すべての項目',
  },
  quick: {
    title: '1文をすぐ確認', hint: '原文と翻訳文を入力すると、PO ファイルなしで確認できます。', source: '原文', translation: '翻訳文', check: '確認する',
    tooLarge: '原文または翻訳文が長すぎるため確認できません。各 100,000 文字以下にしてください。',
    completed: '確認完了。Error {{errorCount}}件、Warning {{warningCount}}件です。', noFindings: 'WTC の自動チェックでは問題が見つかりませんでした。',
  },
  feedback: {
    tooLargeTitle: 'ファイルが大きすぎます', tooLargeBody: '20 MiB 以下の .po ファイルを選択してください。大きなファイルは読み込みを開始しません。',
    readFailureTitle: 'ファイルを読み取れませんでした', readFailureBody: '別の .po ファイルを選択して、もう一度確認してください。',
    invalidPoTitle: 'PO ファイルを正常に確認できませんでした', invalidPoBody: '確認可能な PO として解釈できませんでした。ファイル内容を確認するか、別の .po ファイルを選択してください。',
    unresolvedTitle: 'ロケールを判定できませんでした', unresolvedBody: '対象ロケールを特定できないため確認を続行できません。PO ファイルの Language ヘッダーを確認してください。',
    unsupportedTitle: 'このロケールには対応していません', unsupportedBody: '判定されたロケールは「{{locale}}」です。現在は日本語（ja）のみ対応しています。',
  },
  expandable: { expand: '全文を表示', collapse: '折りたたむ' },
  finding: {
    source: '原文', pluralSource: '複数形原文', translation: '翻訳', glossaryCandidates: 'Glossary の候補', omittedTranslation: '（訳文へ入れない）',
    glossaryMessage: '「{{term}}」の Glossary 訳語を確認してください', glossaryItem: '確認項目: Glossary', styleGuideItem: 'スタイルガイド: {{item}}',
    glossaryLink: 'WordPress.org 日本語 Glossary を確認', styleGuideLink: 'WordPress 日本語翻訳スタイルガイドを確認', copied: 'コピーしました', copyFailed: 'コピーできませんでした', copyMarkdown: 'Markdownをコピー',
  },
  correction: {
    start: '修正して再チェック', title: '修正案を再チェック', hint: 'ここでの修正は確認用です。元の PO ファイルや全体の確認結果は変更しません。', translation: '翻訳', recheck: '再チェック', cancel: 'キャンセル',
    tooLarge: '修正案が長すぎるため再チェックできません。100,000 文字以下にしてください。', noFindings: 'この翻訳では問題は見つかりませんでした。', result: '再チェック結果', glossaryCandidates: 'Glossary 候補: {{candidates}}',
  },
  pagination: { range: '{{start}}–{{end}} / {{total}}件の指摘', pageSize: '表示件数', itemCount: '{{count}}件', navigation: '指摘一覧のページ移動', previous: '前のページ', next: '次のページ', page: 'ページ', destination: '移動先ページ', totalPages: '/ {{total}}' },
  scope: {
    title: 'WTC のチェック範囲', summary: '13項目をチェック', description: 'WTC は WordPress 日本語翻訳スタイルガイドのうち、機械的に判定できる項目を確認します。チェック結果だけでスタイルガイド全体への準拠を保証するものではありません。',
    automatic: '✅ 自動チェック', automaticBody: '機械的に高い確度で判定できる項目。', partial: '△ 一部チェック', partialBody: '特定の原文パターンなど、判定できる条件に限って確認する項目。', manual: '👀 手動確認', manualBody: '文脈・意味・自然さなど、人による判断が必要な項目。',
    manualTitle: '手動で確認したい主な項目', manualNatural: '自然な日本語になっているか', manualTerms: '訳語やボタン名が統一されているか', manualKatakana: 'カタカナ語・長音表記', manualBrand: 'ブランド名・機能名', manualDate: '日付・日時の表記', manualPlaceholder: 'プレースホルダーの扱い',
    readStatus: '詳しい対応状況を見る', readRequirements: '要件定義書を見る', readStyleGuide: 'WordPress 日本語翻訳スタイルガイドを見る',
  },
} as const
