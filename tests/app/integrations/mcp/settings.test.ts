import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { effectScope, nextTick, ref } from 'vue'

import {
  createMCPConnectionDraft,
  mcpConnectionSettings,
  type MCPConnection,
  type MCPConnectionDraft
} from '@/app/integrations/mcp'
import {
  useMCPConnectionAccess,
  type MCPAccessServices
} from '@/app/integrations/mcp/settings/access'
import {
  useMCPConnectionSettings,
  type MCPConnectionServices
} from '@/app/integrations/mcp/settings/use'
import type { SaveMCPConnectionOptions } from '@/app/integrations/mcp/store'

const notion: MCPConnection = {
  id: 'mcp-notion',
  name: 'Notion',
  enabled: true,
  transport: { type: 'streamable-http', url: 'https://mcp.notion.com/mcp' },
  authentication: {
    type: 'oauth',
    credentialRef: { integrationId: 'mcp', profileId: 'mcp-notion', field: 'oauth' }
  }
}

let previous: MCPConnection[] = []
beforeEach(() => {
  previous = mcpConnectionSettings.value.connections
  mcpConnectionSettings.value.connections = [structuredClone(notion)]
})
afterEach(() => {
  mcpConnectionSettings.value.connections = previous
})

function recordingServices() {
  const calls = {
    saved: [] as { draft: MCPConnectionDraft; options: SaveMCPConnectionOptions }[],
    env: [] as Record<string, string>[],
    signedOut: [] as string[]
  }
  const services: Partial<MCPConnectionServices> = {
    status: async () => 'missing',
    envStatus: async () => 'missing',
    setCredential: async () => undefined,
    remove: async () => undefined,
    save: (draft, options = {}) => {
      calls.saved.push({ draft: structuredClone(draft), options })
      const id = draft.id ?? 'mcp-new'
      return { ...notion, id, enabled: draft.enabled }
    },
    setEnv: async (_id, env) => {
      calls.env.push(env)
    },
    signOut: async (id) => {
      calls.signedOut.push(id)
    }
  }
  return { calls, services }
}

function inScope<T>(run: () => T): T {
  const scope = effectScope()
  const result = scope.run(run)
  if (result === undefined) throw new Error('Missing scope')
  return result
}

describe('editing an MCP connection', () => {
  test('saves a local command’s variables as credentials and only their names in settings', async () => {
    const { calls, services } = recordingServices()
    const draft = ref({
      ...createMCPConnectionDraft(),
      name: 'Files',
      transportType: 'stdio' as const,
      command: 'npx',
      args: '-y\nserver',
      enabled: true
    })
    const state = inScope(() =>
      useMCPConnectionSettings(draft, ref(''), ref({ bearerTokenRequired: 'Required' }), services)
    )
    state.envDraft.value = 'API_KEY=secret\nREGION=eu'
    expect(await state.save()).toBe('saved')
    expect(calls.env).toEqual([{ API_KEY: 'secret', REGION: 'eu' }])
    expect(calls.saved.map((entry) => entry.options)).toEqual([
      { envNames: ['API_KEY', 'REGION'] },
      { envNames: ['API_KEY', 'REGION'] }
    ])
    expect(state.envDraft.value).toBe('')
    expect(state.envStatus.value).toBe('configured')
  })

  test('refuses variables that load code before saving anything', async () => {
    const { calls, services } = recordingServices()
    const draft = ref({
      ...createMCPConnectionDraft(),
      name: 'Files',
      transportType: 'stdio' as const,
      command: 'npx'
    })
    const state = inScope(() =>
      useMCPConnectionSettings(draft, ref(''), ref({ bearerTokenRequired: 'Required' }), services)
    )
    state.envDraft.value = 'NODE_OPTIONS=--require ./x.js'
    expect(await state.save()).toBe('failed')
    expect(calls.saved).toEqual([])
    expect(state.error.value).not.toBe('')
  })

  test('discards the OAuth sign-in when the connection moves to another server', async () => {
    const { calls, services } = recordingServices()
    const draft = ref(createMCPConnectionDraft(notion))
    const state = inScope(() =>
      useMCPConnectionSettings(draft, ref(''), ref({ bearerTokenRequired: 'Required' }), services)
    )
    draft.value.url = 'https://other.example.com/mcp'
    expect(await state.save()).toBe('saved')
    expect(calls.signedOut).toEqual(['mcp-notion'])
  })

  test('keeps the OAuth sign-in when only the name changes', async () => {
    const { calls, services } = recordingServices()
    const draft = ref(createMCPConnectionDraft(notion))
    const state = inScope(() =>
      useMCPConnectionSettings(draft, ref(''), ref({ bearerTokenRequired: 'Required' }), services)
    )
    draft.value.name = 'Notion workspace'
    expect(await state.save()).toBe('saved')
    expect(calls.signedOut).toEqual([])
  })
})

describe('signing in and testing', () => {
  function access(overrides: Partial<MCPAccessServices>, dirty = false) {
    const saved = ref<MCPConnection | undefined>(structuredClone(notion))
    const state = inScope(() => useMCPConnectionAccess(saved, ref(dirty), overrides))
    return { saved, state }
  }

  test('marks the connection signed in after a finished sign-in', async () => {
    const { state } = access({
      signedIn: async () => false,
      signIn: () => ({ reopen: () => undefined, result: Promise.resolve({ ok: true }) })
    })
    await nextTick()
    expect(state.canSignIn.value).toBeTrue()
    await state.signIn()
    expect(state.signedIn.value).toBeTrue()
    expect(state.signInStatus.value).toBe('idle')
  })

  test('shows why a sign-in failed', async () => {
    const { state } = access({
      signedIn: async () => false,
      signIn: () => ({
        reopen: () => undefined,
        result: Promise.resolve({ ok: false, reason: 'blocked' })
      })
    })
    await state.signIn()
    expect(state.signedIn.value).toBeFalse()
    expect(state.signInStatus.value).toBe('blocked')
  })

  test('waits for unsaved changes before signing in or testing', async () => {
    let started = 0
    const { state } = access(
      {
        signedIn: async () => false,
        signIn: () => {
          started++
          return { reopen: () => undefined, result: Promise.resolve({ ok: true }) }
        }
      },
      true
    )
    await state.signIn()
    expect(started).toBe(0)
    expect(state.canTest.value).toBeFalse()
  })

  test('reports the saved connection’s test result', async () => {
    const { state } = access({
      signedIn: async () => true,
      test: async () => ({ ok: false, reason: 'sign-in' })
    })
    await state.test()
    expect(state.testStatus.value).toBe('done')
    expect(state.testResult.value).toEqual({ ok: false, reason: 'sign-in' })
  })
})
