import { describe, expect, test } from 'bun:test'

import { installPlugin, setPluginEnabled } from '@/app/plugins/catalog'
import { authorizePluginCall, grantPlugin } from '@/app/plugins/grants'
import {
  ensurePluginsAnswered,
  needsPluginPermission,
  offerableCapabilities,
  pendingPluginPermission
} from '@/app/plugins/permission'
import type { InstalledPlugin } from '@/app/plugins/schema'

function installed(capabilities: string[] = ['document:read']): InstalledPlugin[] {
  const result = installPlugin(
    [],
    JSON.stringify({
      id: 'guide.marks',
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

function first(plugins: readonly InstalledPlugin[]): InstalledPlugin {
  const plugin = plugins[0]
  if (!plugin) throw new Error('no plugin installed')
  return plugin
}

describe('plugin permission prompt', () => {
  test('asks a fresh plugin once, and never one that asked for nothing', () => {
    expect(needsPluginPermission(first(installed()))).toBe(true)
    expect(needsPluginPermission(first(installed([])))).toBe(false)
  })

  test('granting stores the answer with the grants, denying stores it with none', () => {
    const allowed = grantPlugin(installed(), 'guide.marks', ['document:read'])
    expect(allowed.ok).toBe(true)
    if (!allowed.ok) return
    const granted = first(allowed.plugins)
    expect(granted.asked).toBe(true)
    expect(granted.grants).toEqual(['document:read'])

    const denied = grantPlugin(installed(), 'guide.marks', [])
    expect(denied.ok).toBe(true)
    if (!denied.ok) return
    const refused = first(denied.plugins)
    expect(refused.asked).toBe(true)
    expect(refused.grants).toEqual([])
    expect(needsPluginPermission(refused)).toBe(false)
    expect(authorizePluginCall(denied.plugins, 'guide.marks', 'document:read')).toBe('denied')
  })

  test('disabling clears the answer, so enabling again asks again', () => {
    const granted = grantPlugin(installed(), 'guide.marks', ['document:read'])
    expect(granted.ok).toBe(true)
    if (!granted.ok) return
    const disabled = setPluginEnabled(granted.plugins, 'guide.marks', false)
    expect(first(disabled).asked).toBe(false)
    const reenabled = setPluginEnabled(disabled, 'guide.marks', true)
    expect(needsPluginPermission(first(reenabled))).toBe(true)
  })
})

describe('ensurePluginsAnswered', () => {
  test('prompts an unanswered plugin and stores what the prompt returned', async () => {
    const plugins = installed(['document:read', 'filesystem:write'])
    const asked = { id: null as string | null }
    const answered = await ensurePluginsAnswered(plugins, 'guide.marks', async (plugin) => {
      asked.id = plugin.id
      return ['document:read']
    })
    expect(asked.id).toBe('guide.marks')
    if (!answered) throw new Error('the answered plugin is missing')
    expect(first(answered).asked).toBe(true)
    expect(first(answered).grants).toEqual(['document:read'])
    expect(pendingPluginPermission.value).toBeNull()
  })

  test('a cancelled prompt leaves the plugin unanswered and reports it', async () => {
    const plugins = installed()
    const answered = await ensurePluginsAnswered(plugins, 'guide.marks', async () => null)
    expect(answered).toBeNull()
    expect(first(plugins).asked).toBe(false)
    expect(first(plugins).grants).toEqual([])
  })

  test('an answered plugin runs without a prompt', async () => {
    const granted = grantPlugin(installed(), 'guide.marks', [])
    expect(granted.ok).toBe(true)
    if (!granted.ok) return
    const prompted = { asked: false }
    const answered = await ensurePluginsAnswered(granted.plugins, 'guide.marks', async () => {
      prompted.asked = true
      return []
    })
    expect(prompted.asked).toBe(false)
    if (!answered) throw new Error('the answered plugin is missing')
    expect(first(answered).grants).toEqual([])
  })

  test('a plugin that asked for nothing is never prompted', async () => {
    const prompted = { asked: false }
    const answered = await ensurePluginsAnswered(installed([]), 'guide.marks', async () => {
      prompted.asked = true
      return []
    })
    expect(prompted.asked).toBe(false)
    expect(answered).not.toBeNull()
  })
})

describe('offerableCapabilities', () => {
  test('offers only what this host can perform, so the rest stay ungranted', () => {
    const plugin = first(installed(['document:read', 'document:write', 'code:execute']))
    expect(offerableCapabilities(plugin)).toEqual(['document:read', 'document:write'])
  })
})
