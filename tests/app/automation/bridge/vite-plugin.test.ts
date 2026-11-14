import { describe, expect, test } from 'bun:test'

import { localAgentSession, localAutomationToken } from '#vite-config/automation'

import {
  createAutomationEnvironment,
  createDevAgentSession
} from '@/app/automation/bridge/vite-plugin'

const HEX_TOKEN = /^[0-9a-f]{64}$/

function environment(options: {
  agentSession?: { token: string; agentToken: string } | null
  baseEnv?: NodeJS.ProcessEnv
}) {
  return createAutomationEnvironment({
    authToken: 'development-token',
    agentSession: options.agentSession,
    baseEnv: options.baseEnv ?? {},
    configuration: {
      authenticationEnabled: true,
      rootDirectory: '/designs',
      disabledTools: [],
      scope: 'document'
    },
    corsOrigin: 'http://localhost:1420',
    discoveryPath: '/tmp/mcp.json',
    httpPort: 7600,
    socketPath: null
  })
}

describe('the development agent session', () => {
  test('is two fresh random tokens each time one is made', () => {
    const first = createDevAgentSession()
    const second = createDevAgentSession()
    for (const token of [first.token, first.agentToken, second.token, second.agentToken]) {
      expect(token).toMatch(HEX_TOKEN)
    }
    expect(first.token).not.toBe(first.agentToken)
    expect(second.token).not.toBe(first.token)
    expect(second.agentToken).not.toBe(first.agentToken)
  })

  test('is made once per development server, apart from its automation token', () => {
    const session = localAgentSession('serve', 'development', {})
    expect(session).not.toBeNull()
    expect(localAgentSession('serve', 'development', {})).toBe(session)
    // `PAIRDRAW_DEV_TOKEN` or a random UUID; neither tab token is, or contains, it.
    const automationToken = localAutomationToken('serve') ?? ''
    expect(automationToken).not.toBe('')
    for (const token of [session?.token, session?.agentToken]) {
      expect(token).toMatch(HEX_TOKEN)
      expect(token).not.toContain(automationToken)
    }
  })

  test.each([
    ['a build', 'build', 'production', {}],
    ['the Cloud site', 'serve', 'cloud', {}],
    ['the metrics dashboard', 'serve', 'metrics', {}],
    ['Tauri development', 'serve', 'development', { TAURI_ENV_PLATFORM: 'darwin' }],
    ['a dev host on the network', 'serve', 'development', { TAURI_DEV_HOST: '0.0.0.0' }],
    ['Portless', 'serve', 'development', { PORTLESS_URL: 'https://pairdraw.localhost' }],
    ['PAIRDRAW_DEV_AGENTS=0', 'serve', 'development', { PAIRDRAW_DEV_AGENTS: '0' }]
  ])('is absent for %s', (_label, command, mode, env) => {
    expect(localAgentSession(command, mode, env)).toBeNull()
  })

  test('reaches the MCP server the development server starts', () => {
    const session = { token: 'd'.repeat(64), agentToken: 'e'.repeat(64) }
    expect(environment({ agentSession: session })).toMatchObject({
      PAIRDRAW_MCP_AGENTS: '1',
      PAIRDRAW_MCP_AGENT_SESSION: session.token,
      PAIRDRAW_MCP_AGENT_TOKEN: session.agentToken
    })
  })

  test('replaces, or removes, a session the shell passed down', () => {
    const inherited = {
      PAIRDRAW_MCP_AGENTS: '1',
      PAIRDRAW_MCP_AGENT_SESSION: 'a'.repeat(64),
      PAIRDRAW_MCP_AGENT_TOKEN: 'b'.repeat(64)
    }
    const without = environment({ agentSession: null, baseEnv: inherited })
    expect(without.PAIRDRAW_MCP_AGENTS).toBeUndefined()
    expect(without.PAIRDRAW_MCP_AGENT_SESSION).toBeUndefined()
    expect(without.PAIRDRAW_MCP_AGENT_TOKEN).toBeUndefined()

    const session = { token: 'd'.repeat(64), agentToken: 'e'.repeat(64) }
    expect(environment({ agentSession: session, baseEnv: inherited })).toMatchObject({
      PAIRDRAW_MCP_AGENT_SESSION: session.token,
      PAIRDRAW_MCP_AGENT_TOKEN: session.agentToken
    })
  })
})
