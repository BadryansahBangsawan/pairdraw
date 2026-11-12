import { describe, expect, test } from 'bun:test'

import {
  installPlugin,
  installPluginFile,
  removePlugin,
  setPluginEnabled,
  type PluginInstallResult
} from '@/app/plugins/catalog'
import { MAX_PLUGINS, MAX_PLUGIN_MANIFEST_BYTES } from '@/app/plugins/limits'
import type { InstalledPlugin } from '@/app/plugins/schema'
import { readStoredPlugins, writeStoredPlugins } from '@/app/plugins/storage'

const RAN = '__pairdrawPluginRan'

function manifest(
  id: string,
  capabilities: string[] = ['document:read'],
  source = '/* marks */'
): string {
  return JSON.stringify({
    id,
    name: 'Marks',
    version: '1.0.0',
    source,
    command: 'Mark',
    capabilities
  })
}

function installed(result: PluginInstallResult): InstalledPlugin[] {
  if (!result.ok) throw new Error(result.message)
  return result.plugins
}

describe('plugin manifests', () => {
  test('installs from pasted JSON and from a chosen file, then removes the plugin', async () => {
    const text = manifest('guide.marks')
    const pasted = installPlugin([], text)
    const plugins = installed(pasted)
    expect(plugins.map((plugin) => plugin.id)).toEqual(['guide.marks'])
    expect(plugins[0]?.enabled).toBe(true)
    expect(plugins[0]?.command).toBe('Mark')

    const file = await installPluginFile(
      [],
      new File([text], 'marks.json', { type: 'application/json' })
    )
    expect(installed(file).map((plugin) => plugin.id)).toEqual(['guide.marks'])

    expect(removePlugin(plugins, 'guide.marks')).toEqual([])
    expect(removePlugin(plugins, 'missing')).toBe(plugins)
  })

  test('refuses a bad manifest, a duplicate id, an unknown capability, and network access', () => {
    const broken = installPlugin([], '{')
    const shapeless = installPlugin([], JSON.stringify({ id: 'guide.marks' }))
    const valid = installed(installPlugin([], manifest('guide.marks')))
    const duplicate = installPlugin(valid, manifest('guide.marks'))
    const unknown = installPlugin([], manifest('guide.marks', ['document:read', 'clipboard:write']))
    const network = installPlugin([], manifest('guide.marks', ['document:read', 'network:access']))
    const mixed = installPlugin([], manifest('guide.marks', ['network:access', 'nope']))

    expect(broken.ok).toBe(false)
    expect(shapeless.ok).toBe(false)
    expect(duplicate.ok).toBe(false)
    expect(unknown.ok).toBe(false)
    expect(network.ok).toBe(false)
    expect(mixed.ok).toBe(false)
    if (broken.ok || shapeless.ok || duplicate.ok || unknown.ok || network.ok || mixed.ok) return

    expect(broken.reason).toBe('invalid')
    expect(shapeless.reason).toBe('invalid')
    expect(duplicate.reason).toBe('duplicate')
    expect(unknown.reason).toBe('unknown-capability')
    expect(network.reason).toBe('network')
    expect(mixed.reason).toBe('network')
    expect(broken.message.length).toBeGreaterThan(0)
    expect(duplicate.message).toContain('guide.marks')
    expect(unknown.message).toContain('clipboard:write')
    expect(network.message.length).toBeGreaterThan(0)
    expect(valid).toHaveLength(1)
  })

  test('refuses a manifest past the size limit and a list past the count limit', async () => {
    const huge = installPlugin([], 'x'.repeat(MAX_PLUGIN_MANIFEST_BYTES + 1))
    const hugeFile = await installPluginFile(
      [],
      new Blob([new Uint8Array(MAX_PLUGIN_MANIFEST_BYTES + 1)])
    )
    expect(huge.ok).toBe(false)
    expect(hugeFile.ok).toBe(false)
    if (!huge.ok) expect(huge.reason).toBe('too-large')
    if (!hugeFile.ok) expect(hugeFile.reason).toBe('too-large')

    let plugins: readonly InstalledPlugin[] = []
    for (let index = 0; index < MAX_PLUGINS; index += 1) {
      const result = installPlugin(plugins, manifest(`plugin.${index}`))
      plugins = installed(result)
    }
    const extra = installPlugin(plugins, manifest('plugin.extra'))
    expect(extra.ok).toBe(false)
    if (!extra.ok) expect(extra.reason).toBe('too-many')
    expect(plugins).toHaveLength(MAX_PLUGINS)
  })

  test('stores the entry source and does not evaluate it', () => {
    Reflect.deleteProperty(globalThis, RAN)
    const source = `globalThis.${RAN} = true`
    const result = installPlugin([], manifest('guide.marks', ['document:read'], source))
    const plugins = installed(result)
    expect(plugins[0]?.source).toBe(source)
    expect(Reflect.get(globalThis, RAN)).toBeUndefined()

    const notJavaScript = installPlugin(
      [],
      manifest('guide.other', ['document:read'], '((( not javascript')
    )
    expect(installed(notJavaScript)[0]?.source).toBe('((( not javascript')
    expect(Reflect.get(globalThis, RAN)).toBeUndefined()
  })

  test('enables and disables a plugin', () => {
    const plugins = installed(installPlugin([], manifest('guide.marks')))
    const disabled = setPluginEnabled(plugins, 'guide.marks', false)
    expect(disabled[0]?.enabled).toBe(false)
    expect(setPluginEnabled(disabled, 'guide.marks', true)[0]?.enabled).toBe(true)
    expect(setPluginEnabled(plugins, 'missing', false)).toBe(plugins)
  })

  test('reads a saved list and drops an entry it cannot keep', () => {
    const plugins = installed(installPlugin([], manifest('guide.marks')))
    const raw = writeStoredPlugins(plugins)
    expect(readStoredPlugins(raw)).toEqual(plugins)

    const read = readStoredPlugins(
      JSON.stringify({
        version: 1,
        plugins: [
          ...plugins,
          { id: 'bad', capabilities: ['network:access'] },
          { ...plugins[0], id: 'guide.other', enabled: false }
        ]
      })
    )
    expect(read.map((plugin) => plugin.id)).toEqual(['guide.marks', 'guide.other'])
    expect(read[1]?.enabled).toBe(false)
    expect(readStoredPlugins('not json')).toEqual([])
  })
})
