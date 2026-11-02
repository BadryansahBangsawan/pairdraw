import { describe, expect, test } from 'bun:test'

import type { ACPAgentID } from '@open-pencil/core/constants'

import { rankAgentCandidates } from '@/app/ai/agents/auto/pick'
import type { AgentAccount } from '@/app/ai/agents/setup/accounts'
import { detectedAgents } from '@/app/ai/agents/setup/discovery'

import { SIGNED_IN, SIGNED_OUT } from '#tests/helpers/agents/fake-host'

const NOT_CHECKED: AgentAccount = {
  checking: false,
  status: undefined,
  adapter: null,
  canSignIn: false,
  signingIn: false,
  signInURL: null,
  acceptsCode: false,
  tools: null,
  error: null
}

const SIGNED_IN_ACCOUNT: Partial<AgentAccount> = {
  status: SIGNED_IN,
  tools: { connected: true },
  canSignIn: true
}
const SIGNED_OUT_ACCOUNT: Partial<AgentAccount> = { status: SIGNED_OUT, canSignIn: true }
const SILENT_ACCOUNT: Partial<AgentAccount> = { status: null }

const READY_BRIDGE = { available: true, outdated: false }

function rank(
  executables: string[],
  accounts: Partial<Record<ACPAgentID, Partial<AgentAccount>>> = {},
  bridge = READY_BRIDGE
) {
  const agents = detectedAgents({
    searchPath: '/test/bin',
    versions: {},
    executables: Object.fromEntries(executables.map((name) => [name, `/test/bin/${name}`]))
  })
  return rankAgentCandidates({
    agents,
    account: (id) => ({ ...NOT_CHECKED, ...accounts[id] }),
    bridge
  }).map(({ agent, state }) => [agent.id, state])
}

describe('ranking coding agents on this computer', () => {
  test('orders agents in the same state as setup offers them', () => {
    expect(
      rank(['claude-agent-acp', 'codex-acp', 'gemini'], {
        'claude-code': SILENT_ACCOUNT,
        codex: SILENT_ACCOUNT
      })
    ).toEqual([
      ['claude-code', 'unknown-login'],
      ['codex', 'unknown-login'],
      ['gemini-cli', 'unknown-login']
    ])
  })

  test('prefers an agent that is ready over one that needs a sign-in', () => {
    expect(
      rank(['claude-agent-acp', 'codex-acp'], {
        'claude-code': SIGNED_OUT_ACCOUNT,
        codex: SIGNED_IN_ACCOUNT
      })
    ).toEqual([
      ['codex', 'ready'],
      ['claude-code', 'sign-in']
    ])
  })

  test('counts an agent as installed only when its CLI or adapter is there', () => {
    expect(rank(['claude'])).toEqual([['claude-code', 'install']])
    expect(rank([])).toEqual([])
    // Gemini CLI has no adapter to install, so without its CLI there is nothing to offer.
    expect(rank(['npm'])).toEqual([])
  })

  test('needs an install while the MCP server is missing or outdated', () => {
    const accounts = { 'claude-code': SIGNED_IN_ACCOUNT }
    for (const bridge of [
      { available: false, outdated: false },
      { available: true, outdated: true }
    ]) {
      expect(rank(['claude-agent-acp', 'gemini'], accounts, bridge)).toEqual([
        ['claude-code', 'install'],
        ['gemini-cli', 'install']
      ])
    }
  })

  test('leaves out agents that cannot reach the tools or run another adapter', () => {
    expect(
      rank(['claude-agent-acp', 'codex-acp'], {
        'claude-code': {
          ...SIGNED_IN_ACCOUNT,
          tools: { connected: false, reason: 'The MCP server is not running.' }
        },
        codex: { ...SIGNED_IN_ACCOUNT, adapter: { name: 'acp-extension-codex', version: '1.0.0' } }
      })
    ).toEqual([])
  })

  test('leaves out agents whose login was never read or cannot be signed in to here', () => {
    expect(
      rank(['claude-agent-acp', 'codex-acp'], {
        'claude-code': { error: 'check' },
        codex: { status: SIGNED_OUT, canSignIn: false }
      })
    ).toEqual([])
  })
})
