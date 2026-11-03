import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { isMessageKey, MESSAGE_KEYS } from '../src/i18n'

const manifestSchema = v.looseObject({
  manifest_version: v.number(),
  version: v.string(),
  default_locale: v.string(),
  permissions: v.array(v.string()),
  host_permissions: v.optional(v.array(v.string())),
  optional_host_permissions: v.optional(v.array(v.string())),
  content_scripts: v.optional(v.array(v.unknown())),
  background: v.object({ service_worker: v.string() }),
  action: v.object({ default_popup: v.string() })
})
const versionSchema = v.looseObject({ version: v.string() })
const localeSchema = v.record(
  v.string(),
  v.looseObject({ message: v.string(), placeholders: v.optional(v.unknown()) })
)

async function readJSON<TSchema extends v.GenericSchema>(path: string, schema: TSchema) {
  const text = await Bun.file(new URL(path, import.meta.url)).text()
  return v.parse(v.pipe(v.string(), v.parseJson(), schema), text)
}

/** The app's locales, in the folder names Chrome gives them. */
const LOCALES = ['en', 'de', 'es', 'fr', 'it', 'ja', 'pl', 'ru', 'zh_CN']
/** Messages the manifest itself uses, besides those the scripts and popup use. */
const MANIFEST_KEYS = ['extensionName', 'extensionDescription', 'actionTitle']

describe('Chrome extension manifest', () => {
  test('asks only for the active tab and scripting, and for other sites only on request', async () => {
    const manifest = await readJSON('../manifest.json', manifestSchema)
    expect(manifest.manifest_version).toBe(3)
    expect(manifest.permissions.sort()).toEqual(['activeTab', 'scripting'])
    expect(manifest.host_permissions).toBeUndefined()
    expect(manifest.content_scripts).toBeUndefined()
    expect(manifest.optional_host_permissions).toEqual(['<all_urls>'])
  })

  test('carries the extension package version', async () => {
    const manifest = await readJSON('../manifest.json', manifestSchema)
    const pkg = await readJSON('../package.json', versionSchema)
    expect(manifest.version).toBe(pkg.version)
  })

  test('has every message in every locale, with the same placeholders', async () => {
    const english = await readJSON('../_locales/en/messages.json', localeSchema)
    expect(Object.keys(english).sort()).toEqual([...MANIFEST_KEYS, ...MESSAGE_KEYS].sort())
    for (const locale of LOCALES) {
      const messages = await readJSON(`../_locales/${locale}/messages.json`, localeSchema)
      expect(Object.keys(messages).sort()).toEqual(Object.keys(english).sort())
      for (const [key, { message }] of Object.entries(english)) {
        const placeholders = message.match(/\$[A-Z]+\$/g) ?? []
        expect(messages[key]?.message.match(/\$[A-Z]+\$/g) ?? []).toEqual(placeholders)
      }
    }
  })

  test('the popup names only messages the locales have', async () => {
    const html = await Bun.file(new URL('../src/popup.html', import.meta.url)).text()
    const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].flatMap((match) => match.slice(1, 2))
    expect(keys.length).toBeGreaterThan(0)
    expect(keys.filter((key) => !isMessageKey(key))).toEqual([])
  })
})
