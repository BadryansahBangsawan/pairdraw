import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  buildACPMCPServers,
  buildPiMCPServers,
  createMCPConnectionDraft,
  mcpConnectionCredentialRefs,
  mcpConnectionOAuthCredentialRef,
  mcpConnectionSettingsSnapshot,
  parseMCPConnectionSettings,
  removeMCPConnection,
  replaceMCPConnectionSettings,
  saveMCPConnectionDraft,
  type MCPConnectionSettings
} from '@/app/integrations/mcp'
import { credentialMCPOAuthStore } from '@/app/integrations/mcp/oauth/state'
import type { ACPMCPServerDependencies } from '@/app/integrations/mcp/runtime'
import {
  readMCPConnectionEnv,
  writeMCPConnectionEnv
} from '@/app/integrations/mcp/stdio/credentials'
import { MCPStdioError, type MCPStdioSpawnRequest } from '@/app/integrations/mcp/stdio/native'
import { appCredentialServices } from '@/app/settings/credentials/app'

let original: MCPConnectionSettings

beforeEach(() => {
  original = mcpConnectionSettingsSnapshot()
  replaceMCPConnectionSettings({ version: 1, connections: [] })
})

afterEach(() => {
  replaceMCPConnectionSettings(original)
})

function localDraft() {
  const draft = createMCPConnectionDraft()
  draft.name = 'Files'
  draft.transportType = 'stdio'
  draft.command = ' npx '
  draft.args = '-y\n@modelcontextprotocol/server-filesystem\n/Users/me/My Designs\n'
  draft.enabled = true
  return draft
}

describe('MCP connection settings', () => {
  test('saves a local command with one argument per line and its variable names', () => {
    const connection = saveMCPConnectionDraft(localDraft(), { envNames: ['API_KEY'] })
    expect(connection.transport).toEqual({
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/me/My Designs'],
      envNames: ['API_KEY']
    })
    expect(connection.authentication).toEqual({ type: 'none' })
    expect(createMCPConnectionDraft(connection)).toMatchObject({
      transportType: 'stdio',
      command: 'npx',
      args: '-y\n@modelcontextprotocol/server-filesystem\n/Users/me/My Designs'
    })
  })

  test('refuses an empty command and variables that load code', () => {
    const empty = localDraft()
    empty.command = '  '
    expect(() => saveMCPConnectionDraft(empty)).toThrow('command')
    expect(() => saveMCPConnectionDraft(localDraft(), { envNames: ['NODE_OPTIONS'] })).toThrow(
      'not allowed'
    )
  })

  test('keeps an OAuth sign-in only when it points at the connection’s own credential', () => {
    const stored = (credentialRef: unknown) => ({
      version: 1,
      connections: [
        {
          id: 'mcp-notion',
          name: 'Notion',
          enabled: true,
          transport: { type: 'streamable-http', url: 'https://mcp.notion.com/mcp' },
          authentication: { type: 'oauth', credentialRef }
        }
      ]
    })
    const own = mcpConnectionOAuthCredentialRef('mcp-notion')
    expect(parseMCPConnectionSettings(stored(own)).connections[0]?.authentication).toEqual({
      type: 'oauth',
      credentialRef: own
    })
    const other = mcpConnectionOAuthCredentialRef('mcp-other')
    expect(parseMCPConnectionSettings(stored(other)).connections[0]?.authentication).toEqual({
      type: 'none'
    })
  })

  test('drops refused variable names and malformed local commands from storage', () => {
    const parsed = parseMCPConnectionSettings({
      version: 1,
      connections: [
        {
          id: 'mcp-files',
          name: 'Files',
          enabled: true,
          transport: { type: 'stdio', command: 'npx', args: ['x'], envNames: ['OK', 'LD_PRELOAD'] },
          authentication: { type: 'bearer' }
        },
        {
          id: 'mcp-empty',
          name: 'Empty',
          enabled: true,
          transport: { type: 'stdio', command: '' }
        }
      ]
    })
    expect(parsed.connections).toEqual([
      {
        id: 'mcp-files',
        name: 'Files',
        enabled: true,
        transport: { type: 'stdio', command: 'npx', args: ['x'], envNames: ['OK'] },
        authentication: { type: 'none' }
      }
    ])
  })

  test('removing a connection clears every credential it owns', async () => {
    const connection = saveMCPConnectionDraft(localDraft(), { envNames: ['TOKEN'] })
    await writeMCPConnectionEnv(connection.id, { TOKEN: 'secret' })
    await removeMCPConnection(connection.id)
    for (const reference of mcpConnectionCredentialRefs(connection.id)) {
      expect(await appCredentialServices.manager.status(reference)).toBe('missing')
    }
    expect(await readMCPConnectionEnv(connection.id)).toEqual({})
  })
})

/** Stands in for the desktop shell's approval: approves with the program found on disk. */
function desktopShell(answer: 'approve' | 'decline' = 'approve') {
  const asked: MCPStdioSpawnRequest[] = []
  const dependencies: ACPMCPServerDependencies = {
    desktop: () => true,
    stdio: {
      async approve(request) {
        asked.push(request)
        if (answer === 'decline') throw new MCPStdioError('declined')
        return `/usr/local/bin/${request.command}`
      }
    }
  }
  return { asked, dependencies }
}

describe('external servers handed to coding agents', () => {
  test('gives ACP agents a local command with its variables and an OAuth bearer header', async () => {
    const local = saveMCPConnectionDraft(localDraft(), { envNames: ['TOKEN'] })
    await writeMCPConnectionEnv(local.id, { TOKEN: 'secret' })
    const remote = createMCPConnectionDraft()
    remote.name = 'Notion'
    remote.url = 'https://mcp.notion.com/mcp'
    remote.enabled = true
    remote.authenticationType = 'oauth'
    const notion = saveMCPConnectionDraft(remote)
    await credentialMCPOAuthStore.write(notion.id, {
      tokens: { access_token: 'oauth-token', token_type: 'Bearer', expires_in: 3600 },
      obtainedAt: Date.now()
    })
    try {
      const shell = desktopShell()
      const servers = await buildACPMCPServers({ authorizationToken: null }, shell.dependencies)
      expect(shell.asked).toEqual([
        expect.objectContaining({
          connectionId: local.id,
          command: 'npx',
          env: [{ name: 'TOKEN', value: 'secret' }]
        })
      ])
      expect(servers.slice(1)).toEqual([
        {
          name: 'Files',
          command: '/usr/local/bin/npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/me/My Designs'],
          env: [{ name: 'TOKEN', value: 'secret' }]
        },
        {
          type: 'http',
          name: 'Notion',
          url: 'https://mcp.notion.com/mcp',
          headers: [{ name: 'Authorization', value: 'Bearer oauth-token' }]
        }
      ])
      const pi = await buildPiMCPServers({ authorizationToken: null })
      expect(Object.keys(pi).filter((name) => name !== 'open-pencil')).toEqual(['Notion'])
    } finally {
      await removeMCPConnection(local.id)
      await removeMCPConnection(notion.id)
    }
  })

  test('leaves out a local command the person declined, and every local command in the browser', async () => {
    const local = saveMCPConnectionDraft(localDraft())
    try {
      const declined = await buildACPMCPServers(
        { authorizationToken: null },
        desktopShell('decline').dependencies
      )
      expect(declined).toHaveLength(1)

      const browser = desktopShell()
      const servers = await buildACPMCPServers(
        { authorizationToken: null },
        { ...browser.dependencies, desktop: () => false }
      )
      expect(servers).toHaveLength(1)
      expect(browser.asked).toEqual([])
    } finally {
      await removeMCPConnection(local.id)
    }
  })

  test('refuses to start an agent with an OAuth connection that was never signed in', async () => {
    const remote = createMCPConnectionDraft()
    remote.name = 'Linear'
    remote.url = 'https://mcp.linear.app/mcp'
    remote.enabled = true
    remote.authenticationType = 'oauth'
    saveMCPConnectionDraft(remote)
    await expect(buildACPMCPServers({ authorizationToken: null })).rejects.toThrow('sign in')
  })
})
