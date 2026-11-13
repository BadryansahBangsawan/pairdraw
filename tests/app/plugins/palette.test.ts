import { describe, expect, test } from 'bun:test'

import { installPlugin, setPluginEnabled } from '@/app/plugins/catalog'
import { pluginPaletteItems } from '@/app/plugins/palette'
import type { InstalledPlugin } from '@/app/plugins/schema'

function installed(
  id = 'guide.marks',
  command = 'Mark',
  capabilities: string[] = ['document:read']
): InstalledPlugin[] {
  const result = installPlugin(
    [],
    JSON.stringify({
      id,
      name: 'Marks',
      version: '1.0.0',
      source: '/* marks */',
      command,
      capabilities
    })
  )
  if (!result.ok) throw new Error(result.message)
  return result.plugins
}

describe('plugin palette entries', () => {
  test('one entry per enabled plugin, labelled with its manifest command', () => {
    const items = pluginPaletteItems(installed('guide.marks', 'Mark'))
    expect(items).toHaveLength(1)
    expect(items[0]?.id).toBe('plugin:guide.marks')
    expect(items[0]?.label).toBe('Mark')
    expect(items[0]?.description).toBe('Marks')
  })

  test('a disabled plugin has no entry, so disabling it takes the command away', () => {
    const plugins = installed()
    expect(pluginPaletteItems(setPluginEnabled(plugins, 'guide.marks', false))).toEqual([])
  })

  test('every installed plugin with a command shows up, in install order', () => {
    const plugins = installPlugin(
      installed('guide.marks', 'Mark').map((plugin) => ({ ...plugin, enabled: true })),
      JSON.stringify({
        id: 'guide.grid',
        name: 'Grid',
        version: '1.0.0',
        source: '/* grid */',
        command: 'Draw grid',
        capabilities: []
      })
    )
    if (!plugins.ok) throw new Error(plugins.message)
    expect(pluginPaletteItems(plugins.plugins).map((item) => item.label)).toEqual([
      'Mark',
      'Draw grid'
    ])
  })
})
describe('the entry runs its plugin once', () => {
  test('selecting the entry calls the runner with that plugin id', () => {
    const runs: string[] = []
    const items = pluginPaletteItems(installed(), (id) => runs.push(id))
    items[0]?.onSelect?.()
    expect(runs).toEqual(['guide.marks'])
  })
})
