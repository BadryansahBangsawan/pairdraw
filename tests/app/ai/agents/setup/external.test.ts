import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { ACP_AGENTS } from '@pairdraw/core/constants'

import type { AgentAuthStatus } from '@/app/ai/agents/acp/auth/status'
import { rankAgentCandidates } from '@/app/ai/agents/auto/pick'
import type { AgentAccount } from '@/app/ai/agents/setup/accounts'
import { createAgentConnector } from '@/app/ai/agents/setup/connect'
import { codingAgentDetection } from '@/app/ai/agents/setup/detection'
import { detectedAgents } from '@/app/ai/agents/setup/discovery'
import { agentLookupSchema } from '@/app/ai/agents/setup/schema'
import { agentConnectView, agentSetupView, type AgentSetupState } from '@/app/ai/agents/setup/view'

import { fakeAgentHost, hostedAgentSetup, MCP, SIGNED_OUT } from '#tests/helpers/agents/fake-host'
import { expectDefined } from '#tests/helpers/assert'

const claude = expectDefined(
  ACP_AGENTS.find((agent) => agent.id === 'claude-code'),
  'Claude Code'
)

const LOOKUP = {
  searchPath: '/test/bin',
  versions: {},
  executables: {
    'claude-agent-acp': '/test/bin/claude-agent-acp',
    'codex-acp': '/test/bin/codex-acp'
  }
}

const SIGNED_OUT_ACCOUNT: AgentAccount = {
  checking: false,
  status: SIGNED_OUT,
  adapter: { name: '@agentclientprotocol/claude-agent-acp', version: '1.0.0' },
  canSignIn: true,
  signingIn: false,
  signInURL: null,
  acceptsCode: false,
  tools: null,
  error: null
}
/** The login the adapter reports for Claude Code set up for a cloud. */
const BEDROCK: AgentAuthStatus = { kind: 'external', label: 'AWS Bedrock' }
const BEDROCK_ACCOUNT: AgentAccount = { ...SIGNED_OUT_ACCOUNT, status: BEDROCK, canSignIn: false }
const UNCHECKED_ACCOUNT: AgentAccount = { ...SIGNED_OUT_ACCOUNT, status: undefined }

function bedrockSetup(account: AgentAccount): AgentSetupState {
  const detected = detectedAgents({ ...LOOKUP, claudeCodeCloud: 'bedrock' })[0]
  return {
    supported: true,
    checked: true,
    scanning: false,
    detected: detected ?? null,
    bridge: true,
    bridgeOutdated: false,
    bridgeCommand: '',
    npm: true,
    installingAgent: false,
    installingBridge: false,
    error: null,
    account
  }
}

function signInStep(setup: AgentSetupState) {
  return agentConnectView(claude, setup).steps.find(({ step }) => step === 'sign-in')?.status
}

function rank(account: AgentAccount) {
  const ranked = rankAgentCandidates({
    agents: detectedAgents({ ...LOOKUP, claudeCodeCloud: 'foundry' }),
    account: () => account,
    bridge: { available: true, outdated: false }
  })
  return ranked.find(({ agent }) => agent.id === 'claude-code')?.state
}

describe('Claude Code set up for a cloud outside the app', () => {
  test('the lookup carries the cloud to Claude Code only', () => {
    const agents = detectedAgents({ ...LOOKUP, claudeCodeCloud: 'vertex' })
    expect(agents.find(({ definition }) => definition.id === 'claude-code')).toMatchObject({
      externalConfig: 'vertex'
    })
    expect(agents.find(({ definition }) => definition.id === 'codex')).not.toHaveProperty(
      'externalConfig'
    )
    expect(detectedAgents(LOOKUP)[0]).not.toHaveProperty('externalConfig')
  })

  test('an older host or an unknown cloud reads as none', () => {
    expect(v.parse(agentLookupSchema, LOOKUP).claudeCodeCloud).toBeUndefined()
    expect(
      v.parse(agentLookupSchema, { ...LOOKUP, claudeCodeCloud: 'another-cloud' }).claudeCodeCloud
    ).toBeNull()
  })

  test('shows as external config while the agent has not reported its login', () => {
    const setup = bedrockSetup(UNCHECKED_ACCOUNT)
    expect(codingAgentDetection(claude, setup)).toEqual({
      state: 'external-config',
      cloud: 'bedrock'
    })
    expect(agentSetupView(claude, setup).externalConfig).toBe('bedrock')
  })

  test('shows as external config when the agent reports the cloud login', () => {
    const setup = bedrockSetup(BEDROCK_ACCOUNT)
    expect(codingAgentDetection(claude, setup)).toEqual({
      state: 'external-config',
      cloud: 'bedrock'
    })
    const view = agentSetupView(claude, setup)
    expect(view.externalConfig).toBe('bedrock')
    expect(view.account?.canSignIn).toBe(false)
    expect(signInStep(setup)).toBe('done')
  })

  test('trusts a signed-out report over the switch and offers a sign-in', () => {
    const setup = bedrockSetup(SIGNED_OUT_ACCOUNT)
    expect(codingAgentDetection(claude, setup)).toEqual({ state: 'signed-out' })
    const view = agentSetupView(claude, setup)
    expect(view).not.toHaveProperty('externalConfig')
    expect(view.account?.canSignIn).toBe(true)
    expect(signInStep(setup)).not.toBe('done')
  })

  test('auto-connect follows the login the agent reports', () => {
    expect(rank(BEDROCK_ACCOUNT)).toBe('ready')
    expect(rank(SIGNED_OUT_ACCOUNT)).toBe('sign-in')
  })

  test('connecting skips the sign-in when the agent reports the cloud login', async () => {
    const { host, calls } = fakeAgentHost({
      executables: ['npm', 'claude-agent-acp', MCP],
      signedIn: true,
      signedInAs: BEDROCK,
      claudeCodeCloud: 'bedrock'
    })
    const connector = createAgentConnector(hostedAgentSetup(host))

    expect(await connector.connect(claude)).toBe('connected')
    expect(calls).not.toContain('sign-in claude-ai-login')
    expect(connector.state('claude-code').steps['sign-in']).toBe('skipped')
  })

  test('connecting still signs in when the agent reports signed out despite the switch', async () => {
    const { host, calls } = fakeAgentHost({
      executables: ['npm', 'claude-agent-acp', MCP],
      claudeCodeCloud: 'bedrock'
    })
    const connector = createAgentConnector(hostedAgentSetup(host))

    expect(await connector.connect(claude)).toBe('connected')
    expect(calls).toContain('sign-in claude-ai-login')
    expect(connector.state('claude-code').steps['sign-in']).toBe('done')
  })
})
