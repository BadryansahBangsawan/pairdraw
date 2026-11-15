/**
 * A setting that a released build stored under a browser-storage key the app no longer reads.
 * Its owner moves the value before the first read, so updating keeps the setting.
 */
export interface RenamedSettingKey {
  /** The key released builds wrote. */
  from: string
  /** The key the app reads now. */
  to: string
  /** The value to store under `to`, or null when the old value is not a usable setting. */
  read: (stored: string) => string | null
}

function browserLocalStorage(): Storage | null {
  try {
    return 'window' in globalThis ? window.localStorage : null
  } catch (error) {
    console.warn('Browser storage is unavailable; renamed settings stay where they are:', error)
    return null
  }
}

/**
 * Moves a renamed setting once. A value already stored under the new key wins; the old key is
 * removed either way so it is never read again. When storage refuses the write, the old key
 * stays for the next start.
 */
export function migrateRenamedSettingKey(
  key: RenamedSettingKey,
  storage = browserLocalStorage()
): void {
  if (!storage) return
  try {
    const stored = storage.getItem(key.from)
    if (stored === null) return
    if (storage.getItem(key.to) === null) {
      const value = key.read(stored)
      if (value !== null) storage.setItem(key.to, value)
    }
    storage.removeItem(key.from)
  } catch (error) {
    console.warn(`Could not move the "${key.from}" setting to "${key.to}":`, error)
  }
}
