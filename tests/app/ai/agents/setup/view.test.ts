import { describe, expect, test } from 'bun:test'

import { ACP_AGENTS, type ACPAgentDef } from '@pairdraw/core/constants'

import type { AgentAccount } from '@/app/ai/agents/setup/accounts'
import type { AgentConnectState } from '@/app/ai/agents/setup/connect'
import type { DetectedAgent } from '@/app/ai/agents/setup/discovery'
import {
  agentConnectView,
  agentDescriptionKind,
  type AgentSetupState
} from '@/app/ai/agents/setup/view'

import { expectDefined } from '#tests/helpers/assert'

function agent(id: string): ACPAgentDef {
  return expectDefined(
    ACP_AGENTS.find((candidate) => candidate.id === id),
    id
  )
}

function agentState(overrides: Partial<AgentSetupState> = {}): AgentSetupState {
  return {
    supported: true,
    checked: true,
    scanning: false,
    detected: null,
    bridge: true,
    bridgeOutdated: false,
    bridgeCommand: 'npm i -g @pairdraw/mcp@1.0.0',
    npm: true,
    installingAgent: false,
    installingBridge: false,
    error: null,
    ...overrides
  }
}

describe('agentConnectView', () => {
  const claude = agent('claude-code')
  const gemini = agent('gemini-cli')
  const omp = agent('omp')
  const installed = (definition: ACPAgentDef): DetectedAgent => ({
    definition,
    status: 'available',
    cliPath: null,
    adapterPath: `/test/bin/${definition.command}`
  })
  const signedIn: AgentAccount = {
    checking: false,
    status: { kind: 'account', label: 'Claude Max' },
    adapter: { name: '@agentclientprotocol/claude-agent-acp', version: '0.93.0' },
    canSignIn: true,
    signingIn: false,
    signInURL: null,
    acceptsCode: false,
    tools: { connected: true },
    error: null
  }
  const connection = (overrides: Partial<AgentConnectState> = {}): AgentConnectState => ({
    steps: {
      detect: 'pending',
      install: 'pending',
      'sign-in': 'pending',
      tools: 'pending',
      activate: 'pending'
    },
    running: false,
    failure: null,
    activates: false,
    ...overrides
  })
  const statuses = (view: ReturnType<typeof agentConnectView>) =>
    Object.fromEntries(view.steps.map(({ step, status }) => [step, status]))

  test('shows what setup already found as done, so a ready agent reads as connected', () => {
    const view = agentConnectView(
      claude,
      agentState({ detected: installed(claude), account: signedIn, connection: connection() })
    )
    expect(statuses(view)).toEqual({
      detect: 'done',
      install: 'done',
      'sign-in': 'done',
      tools: 'done'
    })
    expect(view.connected).toBe(true)
  })

  test('adds the activation step only where connecting makes the agent the chat’s', () => {
    const view = agentConnectView(
      claude,
      agentState({
        detected: installed(claude),
        account: signedIn,
        connection: connection({ activates: true })
      })
    )
    expect(view.steps.at(-1)).toEqual({ step: 'activate', status: 'pending' })
    expect(view.connected).toBe(false)
  })

  test('names the discovery problem of a failed install', () => {
    const view = agentConnectView(
      claude,
      agentState({
        detected: { ...installed(claude), status: 'needs-adapter' },
        connection: connection({
          steps: { ...connection().steps, detect: 'done', install: 'failed' },
          failure: { step: 'install', problem: 'npm-admin' }
        })
      })
    )
    expect(statuses(view)).toMatchObject({
      detect: 'done',
      install: 'failed',
      'sign-in': 'pending'
    })
    expect(view.problem).toBe('needs-admin')
  })

  test('leaves an install the attempt could not run to the person', () => {
    const view = agentConnectView(
      claude,
      agentState({
        detected: { ...installed(claude), status: 'needs-adapter' },
        connection: connection({
          steps: { ...connection().steps, detect: 'done', install: 'failed' },
          failure: { step: 'install', problem: 'install-needed' }
        })
      })
    )
    expect(statuses(view)).toMatchObject({ detect: 'done', install: 'manual' })
    expect(view.problem).toBe('install-needed')
    expect(view.connected).toBe(false)
  })

  test('leaves the sign-in of an agent setup cannot sign in to for the person to run', () => {
    const view = agentConnectView(gemini, agentState({ detected: installed(gemini) }))
    expect(statuses(view)).toEqual({ detect: 'done', install: 'done', 'sign-in': 'manual' })
    expect(view.signInCommand).toBe('gemini')
    expect(agentConnectView(claude, agentState()).signInCommand).toBeNull()
  })

  test('shows no sign-in for an agent that runs on its own configured credentials', () => {
    const view = agentConnectView(omp, agentState({ detected: installed(omp) }))
    expect(statuses(view)).toEqual({ detect: 'done', install: 'done' })
    expect(view.signInCommand).toBeNull()
    expect(view.connected).toBe(true)
  })
})

describe('agentDescriptionKind', () => {
  test('names the account an agent signs in to, and its own setup for one that has none', () => {
    expect(agentDescriptionKind(agent('claude-code'))).toBe('account')
    expect(agentDescriptionKind(agent('omp'))).toBe('own-credentials')
  })
})
