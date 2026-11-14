const BROWSER_PERSISTENCE_KEY = 'pairdraw:credential-persistence'
const LEGACY_CREDENTIAL_KEYS = [
  'pairdraw:openrouter-api-key',
  'pairdraw:pexels-api-key',
  'pairdraw:unsplash-access-key'
]

export function browserCredentialStorage(): Storage | null {
  return 'window' in globalThis ? window.localStorage : null
}

export function hasLegacyCredentialStorage(): boolean {
  const storage = browserCredentialStorage()
  if (!storage) return false
  if (LEGACY_CREDENTIAL_KEYS.some((key) => Boolean(storage.getItem(key)))) return true
  for (let index = 0; index < storage.length; index++) {
    if (storage.key(index)?.startsWith('pairdraw:ai-key:')) return true
  }
  return false
}

export function browserRemembersCredentials(): boolean {
  const storage = browserCredentialStorage()
  return storage ? storage.getItem(BROWSER_PERSISTENCE_KEY) !== 'session' : false
}

export function setBrowserRemembersCredentials(remembered: boolean): void {
  const storage = browserCredentialStorage()
  if (!storage) return
  storage.setItem(BROWSER_PERSISTENCE_KEY, remembered ? 'remembered' : 'session')
}
