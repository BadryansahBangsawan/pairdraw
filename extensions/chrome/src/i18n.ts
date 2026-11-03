/** Message keys in `_locales/<locale>/messages.json`; the tests check every locale has them. */
export const MESSAGE_KEYS = [
  'popupTitle',
  'copyPage',
  'copyPageHint',
  'pickElement',
  'pickElementHint',
  'includeImages',
  'includeImagesHint',
  'statusCopying',
  'statusCopied',
  'statusUnavailable',
  'statusNeedsSecurePage',
  'statusFailed',
  'pickerHint'
] as const

export type MessageKey = (typeof MESSAGE_KEYS)[number]

const KEYS = new Set<string>(MESSAGE_KEYS)

export function isMessageKey(key: string): key is MessageKey {
  return KEYS.has(key)
}

/** The message in the browser's language, Chrome falling back to English. */
export function t(key: MessageKey, substitution?: string): string {
  return chrome.i18n.getMessage(key, substitution)
}
