/**
 * WTC の英語 UI 文言を定義する。
 *
 * 検証ルールや Glossary データではなく、画面表示にだけ利用する文言を所有する。
 */

/** WTC の 英語 UI で利用する翻訳リソース。 */
export const en = {
  meta: {
    title: 'WP Translation Checker',
  },
  language: {
    label: 'Display language',
    japanese: '日本語',
    english: 'English',
  },
  app: {
    title: 'WP Translation Checker',
    lead: 'Checks supported rules from the WordPress Japanese Translation Style Guide (last updated August 28, 2026) and registered terms in the Japanese Glossary, entirely in your browser.',
    privacy:
      'The translation content you enter or select is not sent to an external checking service.',
    fileTitle: 'Select a PO file',
    fileHint: 'Selecting a file does not start the check.',
    fileLabel: '.po file',
    chooseFile: 'Choose file',
    noFileSelected: 'No file selected',
    selectedFile: 'Selected: {{fileName}}',
    checking: 'Checking…',
    check: 'Check',
    checkingFile: 'Checking {{fileName}}.',
    completedEyebrow: 'Check complete',
    completedTitle: 'The check completed successfully',
    errorCount: '{{count}}',
    warningCount: '{{count}}',
    noFindings: 'WTC did not find any issues in its automated checks.',
    manualAlso: 'Some items still require manual review.',
    exportTitle: 'Share or save results',
    exportHint:
      'CSV and JSON are saved as files. Markdown is copied to the clipboard.',
    csvDownload: 'Download CSV',
    jsonDownload: 'Download JSON',
    markdownCopy: 'Copy Markdown',
    markdownCopied: 'Copied Markdown to the clipboard.',
    markdownCopyFailed:
      'Could not copy Markdown. Check your browser clipboard permissions.',
    findingsTitle: 'Findings',
    findingsCount: '{{count}} findings',
    filterLabel: 'Filter by item',
    allItems: 'All items',
  },
  quick: {
    title: 'Quick check',
    hint: 'Enter source and translated text to check one entry without a PO file.',
    source: 'Source',
    translation: 'Translation',
    check: 'Check',
    tooLarge:
      'The source or translation is too long to check. Keep each at 100,000 characters or fewer.',
    completed:
      'Check complete. Error: {{errorCount}}, Warning: {{warningCount}}.',
    noFindings: 'WTC did not find any issues in its automated checks.',
  },
  feedback: {
    tooLargeTitle: 'The file is too large',
    tooLargeBody:
      'Select a .po file no larger than 20 MiB. Larger files are not read.',
    readFailureTitle: 'The file could not be read',
    readFailureBody: 'Select another .po file and try again.',
    invalidPoTitle: 'The PO file could not be checked',
    invalidPoBody:
      'The file could not be interpreted as a supported PO file. Check its contents or select another .po file.',
    unresolvedTitle: 'The locale could not be determined',
    unresolvedBody:
      'The check cannot continue because the target locale could not be identified. Check the Language header in the PO file.',
    unsupportedTitle: 'This locale is not supported',
    unsupportedBody:
      'The detected locale is “{{locale}}”. Only Japanese (ja) is currently supported.',
  },
  expandable: {
    expand: 'Show full text',
    collapse: 'Collapse',
  },
  finding: {
    source: 'Source',
    pluralSource: 'Plural source',
    translation: 'Translation',
    glossaryCandidates: 'Glossary candidates',
    omittedTranslation: '(omit from translation)',
    glossaryMessage: 'Check the Glossary translation for “{{term}}”',
    glossaryItem: 'Check item: Glossary',
    styleGuideItem: 'Style guide: {{item}}',
    glossaryLink: 'View the WordPress.org Japanese Glossary',
    styleGuideLink: 'View the WordPress Japanese Translation Style Guide',
    copied: 'Copied',
    copyFailed: 'Could not copy',
    copyMarkdown: 'Copy Markdown',
  },
  correction: {
    start: 'Edit and recheck',
    title: 'Recheck a revision',
    hint: 'Edits here are for checking only. They do not change the original PO file or the overall results.',
    translation: 'Translation',
    recheck: 'Recheck',
    cancel: 'Cancel',
    tooLarge:
      'The revision is too long to recheck. Keep it at 100,000 characters or fewer.',
    noFindings: 'No issues were found in this translation.',
    result: 'Recheck results',
    glossaryCandidates: 'Glossary candidates: {{candidates}}',
  },
  pagination: {
    range: '{{start}}–{{end}} / {{total}} findings',
    pageSize: 'Items per page',
    itemCount: '{{count}}',
    navigation: 'Findings pagination',
    previous: 'Previous page',
    next: 'Next page',
    page: 'Page',
    destination: 'Go to page',
    totalPages: '/ {{total}}',
  },
  scope: {
    title: 'What WTC checks',
    summary: 'Checks 13 items',
    description:
      'WTC checks items from the WordPress Japanese Translation Style Guide that can be evaluated mechanically. Its results do not guarantee full compliance with the style guide.',
    automatic: '✅ Automated check',
    automaticBody:
      'Items that can be determined mechanically with high confidence.',
    partial: '△ Partial check',
    partialBody:
      'Items checked only under conditions WTC can determine, such as specific source-text patterns.',
    manual: '👀 Manual review',
    manualBody:
      'Items that require human judgment for context, meaning, or naturalness.',
    manualTitle: 'Key items to review manually',
    manualNatural: 'Whether the Japanese reads naturally',
    manualTerms: 'Whether terminology and button labels are consistent',
    manualKatakana: 'Katakana and long-vowel notation',
    manualBrand: 'Brand and feature names',
    manualDate: 'Date and time notation',
    manualPlaceholder: 'Placeholder handling',
    readStatus: 'View detailed coverage',
    readRequirements: 'View requirements',
    readStyleGuide: 'View the WordPress Japanese Translation Style Guide',
  },
} as const
