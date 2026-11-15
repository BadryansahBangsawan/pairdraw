import { describe, expect, test } from 'bun:test'

import { DEFAULT_WEB_FONT_PROVIDER_SETTINGS } from '@pairdraw/core/text'

import { COLLAB_NAME_KEY_RENAME } from '@/app/collab/identity'
import { FONT_PROVIDERS_KEY_RENAME, ONLINE_FONTS_KEY_RENAME } from '@/app/editor/fonts'
import { migrateRenamedSettingKey, type RenamedSettingKey } from '@/app/settings/renamed-keys'

class TestStorage implements Storage {
  readonly #values = new Map<string, string>()

  constructor(entries: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(entries)) this.#values.set(key, value)
  }

  get length(): number {
    return this.#values.size
  }

  clear(): void {
    this.#values.clear()
  }

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.#values.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.#values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.#values.set(key, value)
  }
}

class FullStorage extends TestStorage {
  override setItem(): void {
    throw new Error('Storage is full')
  }
}

function migrated(key: RenamedSettingKey, entries: Record<string, string>) {
  const storage = new TestStorage(entries)
  migrateRenamedSettingKey(key, storage)
  return { from: storage.getItem(key.from), to: storage.getItem(key.to) }
}

describe('renamed setting keys', () => {
  test('carry a released value over to the new key and drop the old one', () => {
    expect(migrated(COLLAB_NAME_KEY_RENAME, { [COLLAB_NAME_KEY_RENAME.from]: 'Ada' })).toEqual({
      from: null,
      to: 'Ada'
    })
    expect(migrated(ONLINE_FONTS_KEY_RENAME, { [ONLINE_FONTS_KEY_RENAME.from]: 'false' })).toEqual({
      from: null,
      to: 'false'
    })
  })

  test('keep font provider switches and fill providers the old value did not list', () => {
    const result = migrated(FONT_PROVIDERS_KEY_RENAME, {
      [FONT_PROVIDERS_KEY_RENAME.from]: JSON.stringify({ google: false, bunny: true })
    })
    expect(result.from).toBeNull()
    expect(JSON.parse(result.to ?? 'null')).toEqual({
      ...DEFAULT_WEB_FONT_PROVIDER_SETTINGS,
      google: false,
      bunny: true
    })
  })

  test('let a value under the new key win and still drop the old one', () => {
    for (const key of [
      COLLAB_NAME_KEY_RENAME,
      ONLINE_FONTS_KEY_RENAME,
      FONT_PROVIDERS_KEY_RENAME
    ]) {
      const current = key === ONLINE_FONTS_KEY_RENAME ? 'true' : 'current'
      const old = key === FONT_PROVIDERS_KEY_RENAME ? '{"google":false}' : 'false'
      expect(migrated(key, { [key.from]: old, [key.to]: current })).toEqual({
        from: null,
        to: current
      })
    }
  })

  test('ignore an old value that is not a usable setting', () => {
    const malformed: [RenamedSettingKey, string][] = [
      [COLLAB_NAME_KEY_RENAME, '   '],
      [ONLINE_FONTS_KEY_RENAME, 'yes'],
      [FONT_PROVIDERS_KEY_RENAME, '{"google":'],
      [FONT_PROVIDERS_KEY_RENAME, '{"google":"off"}'],
      [FONT_PROVIDERS_KEY_RENAME, '[true]']
    ]
    for (const [key, old] of malformed) {
      expect(migrated(key, { [key.from]: old })).toEqual({ from: null, to: null })
    }
  })

  test('leave storage alone when nothing was stored under the old key', () => {
    expect(migrated(COLLAB_NAME_KEY_RENAME, {})).toEqual({ from: null, to: null })
  })

  test('keep the old key for the next start when storage refuses the write', () => {
    const storage = new FullStorage({ [COLLAB_NAME_KEY_RENAME.from]: 'Ada' })
    migrateRenamedSettingKey(COLLAB_NAME_KEY_RENAME, storage)
    expect(storage.getItem(COLLAB_NAME_KEY_RENAME.from)).toBe('Ada')
    expect(storage.getItem(COLLAB_NAME_KEY_RENAME.to)).toBeNull()
  })
})
