import { describe, expect, test } from 'bun:test'

import { installPlugin, removePlugin, setPluginEnabled } from '@/app/plugins/catalog'
import { authorizePluginCall, grantPlugin } from '@/app/plugins/grants'
import type { InstalledPlugin } from '@/app/plugins/schema'
import { readStoredPlugins } from '@/app/plugins/storage'

function installed(
  id = 'guide.marks',
  capabilities: string[] = ['document:read', 'document:write']
) {
  const result = installPlugin(
    [],
    JSON.stringify({
      id,
      name: 'Marks',
      version: '1.0.0',
      source: '/* marks */',
      command: 'Mark',
      capabilities
    })
  )
  if (!result.ok) throw new Error(result.message)
  return result.plugins
}

function grantsOf(plugins: readonly InstalledPlugin[], id = 'guide.marks'): readonly string[] {
  return plugins.find((plugin) => plugin.id === id)?.grants ?? []
}

describe('plugin grants', () => {
  test('allows a call only after the manifest capability was granted', () => {
    const plugins = installed()
    expect(authorizePluginCall(plugins, 'guide.marks', 'document:read')).toBe('denied')
    expect(authorizePluginCall(plugins, 'guide.marks', 'network:access')).toBe('denied')

    const granted = grantPlugin(plugins, 'guide.marks', ['document:read'])
    expect(granted.ok).toBe(true)
    if (!granted.ok) return
    expect(grantsOf(granted.plugins)).toEqual(['document:read'])
    expect(authorizePluginCall(granted.plugins, 'guide.marks', 'document:read')).toBe('allowed')
    expect(authorizePluginCall(granted.plugins, 'guide.marks', 'document:write')).toBe('denied')
    expect(authorizePluginCall(granted.plugins, 'missing', 'document:read')).toBe('denied')
  })

  test('refuses a grant the manifest did not request and leaves the stored grants', () => {
    const plugins = installed()
    const granted = grantPlugin(plugins, 'guide.marks', ['document:read'])
    if (!granted.ok) throw new Error(granted.message)
    const refused = grantPlugin(granted.plugins, 'guide.marks', [
      'document:read',
      'filesystem:write'
    ])
    const network = grantPlugin(plugins, 'guide.marks', ['network:access'])
    const missing = grantPlugin(plugins, 'missing', ['document:read'])

    expect(refused.ok).toBe(false)
    expect(network.ok).toBe(false)
    expect(missing.ok).toBe(false)
    if (refused.ok || network.ok || missing.ok) return
    expect(refused.reason).toBe('not-requested')
    expect(refused.message).toContain('filesystem:write')
    expect(network.reason).toBe('not-requested')
    expect(network.message).toContain('network:access')
    expect(missing.reason).toBe('missing')
    expect(missing.message).toContain('missing')
    expect(grantsOf(granted.plugins)).toEqual(['document:read'])
  })

  test('drops grants when a plugin is disabled or removed, and does not restore them', () => {
    const plugins = installed()
    const granted = grantPlugin(plugins, 'guide.marks', ['document:write'])
    if (!granted.ok) throw new Error(granted.message)

    const disabled = setPluginEnabled(granted.plugins, 'guide.marks', false)
    expect(grantsOf(disabled)).toEqual([])
    expect(authorizePluginCall(disabled, 'guide.marks', 'document:write')).toBe('denied')
    const whileDisabled = grantPlugin(disabled, 'guide.marks', ['document:write'])
    expect(whileDisabled.ok).toBe(false)
    if (!whileDisabled.ok) expect(whileDisabled.reason).toBe('disabled')

    const enabled = setPluginEnabled(disabled, 'guide.marks', true)
    expect(grantsOf(enabled)).toEqual([])
    expect(authorizePluginCall(enabled, 'guide.marks', 'document:write')).toBe('denied')

    const removed = removePlugin(granted.plugins, 'guide.marks')
    expect(authorizePluginCall(removed, 'guide.marks', 'document:write')).toBe('denied')
  })

  test('a capability this version cannot perform is refused and never allowed', () => {
    const plugins = installed('guide.files', ['filesystem:write', 'document:read'])
    const refused = grantPlugin(plugins, 'guide.files', ['filesystem:write'])
    expect(refused.ok).toBe(false)
    if (!refused.ok) expect(refused.reason).toBe('unavailable')

    // A record that carries the grant anyway, as a tampered stored file could, is still refused.
    const [plugin] = plugins
    if (!plugin) throw new Error('plugin was not installed')
    const tampered: InstalledPlugin[] = [{ ...plugin, grants: ['filesystem:write'] }]
    expect(authorizePluginCall(tampered, 'guide.files', 'filesystem:write')).toBe('denied')
  })

  test('reads a saved plugin with no grants, and drops a grant it did not ask for', () => {
    const [plugin] = installed()
    if (!plugin) throw new Error('plugin was not installed')
    const { grants: _grants, ...withoutGrants } = plugin
    const read = readStoredPlugins(JSON.stringify({ version: 1, plugins: [withoutGrants] }))
    expect(read[0]?.grants).toEqual([])

    const stripped = readStoredPlugins(
      JSON.stringify({
        version: 1,
        plugins: [{ ...plugin, grants: ['document:write', 'network:access', 'document:write'] }]
      })
    )
    expect(stripped[0]?.grants).toEqual(['document:write'])
  })
})
