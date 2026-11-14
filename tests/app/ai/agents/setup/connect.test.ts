import { describe, expect, mock, test } from 'bun:test'

import { ACP_AGENTS, type ACPAgentDef } from '@pairdraw/core/constants'

import type { AgentHost } from '@/app/ai/agents/host/types'
import { createAgentConnector } from '@/app/ai/agents/setup/connect'

import { fakeAgentHost, hostedAgentSetup, MCP } from '#tests/helpers/agents/fake-host'
import { expectDefined } from '#tests/helpers/assert'

const claude = expectDefined(
  ACP_AGENTS.find((agent) => agent.id === 'claude-code'),
  'Claude Code'
)
const gemini = expectDefined(
  ACP_AGENTS.find((agent) => agent.id === 'gemini-cli'),
  'Gemini CLI'
)

function connectorFor(host: AgentHost, activate?: (agent: ACPAgentDef) => Promise<void>) {
  return createAgentConnector({ ...hostedAgentSetup(host), activate })
}

describe('connecting a coding agent', () => {
  test('finds, installs, signs in, checks the tools, and activates the agent in order', async () => {
    const { host, calls } = fakeAgentHost({ executables: ['npm', 'claude'] })
    const activated: string[] = []
    const connector = connectorFor(host, async (agent) => {
      calls.push('activate')
      activated.push(agent.id)
    })

    expect(await connector.connect(claude)).toBe('connected')

    expect(calls).toEqual([
      'detect',
      'install claude-agent-acp',
      'detect',
      'install pairdraw-mcp-http',
      'detect',
      'check',
      'sign-in claude-ai-login',
      'check',
      'activate'
    ])
    expect(activated).toEqual(['claude-code'])
    expect(connector.state('claude-code')).toMatchObject({
      running: false,
      failure: null,
      steps: { detect: 'done', install: 'done', 'sign-in': 'done', tools: 'done', activate: 'done' }
    })
  })

  test('skips the steps a ready agent has already done', async () => {
    const { host, calls } = fakeAgentHost({
      executables: ['npm', 'claude-agent-acp', MCP],
      signedIn: true
    })
    const connector = connectorFor(host)

    expect(await connector.connect(claude)).toBe('connected')

    expect(calls).toEqual(['detect', 'check'])
    expect(connector.activates).toBe(false)
    expect(connector.state('claude-code').steps).toEqual({
      detect: 'done',
      install: 'skipped',
      'sign-in': 'skipped',
      tools: 'done',
      activate: 'skipped'
    })
  })

  test('stops at the step that fails and leaves the later ones untouched', async () => {
    const { host, calls } = fakeAgentHost({ executables: ['npm', 'claude'], npmWritable: false })
    const activate = mock(async () => undefined)
    const connector = connectorFor(host, activate)

    expect(await connector.connect(claude)).toBe('failed')

    expect(connector.state('claude-code')).toMatchObject({
      running: false,
      failure: { step: 'install', problem: 'npm-admin' },
      steps: {
        detect: 'done',
        install: 'failed',
        'sign-in': 'pending',
        tools: 'pending',
        activate: 'pending'
      }
    })
    // Never an npm install that needs administrator rights, and nothing after it.
    expect(calls).toEqual(['detect'])
    expect(activate).not.toHaveBeenCalled()
  })

  test('resumes from the failed step after the person fixes it', async () => {
    const { host, computer, calls } = fakeAgentHost({
      executables: ['npm', 'claude-agent-acp', MCP],
      signedIn: true,
      toolsReachable: false
    })
    const connector = connectorFor(host)

    expect(await connector.connect(claude)).toBe('failed')
    expect(connector.state('claude-code').failure).toEqual({ step: 'tools', problem: 'tools' })

    computer.toolsReachable = true
    calls.length = 0
    expect(await connector.connect(claude)).toBe('connected')

    // The lookup, installs, and sign-in before the failed step are not repeated.
    expect(calls).toEqual(['check'])
    expect(connector.state('claude-code')).toMatchObject({
      failure: null,
      steps: { detect: 'done', install: 'skipped', 'sign-in': 'skipped', tools: 'done' }
    })
  })

  test('resuming an install looks again for what the person installed by hand', async () => {
    const { host, computer, calls } = fakeAgentHost({ executables: ['npm'], npmWritable: false })
    const connector = connectorFor(host)
    await connector.connect(claude)
    expect(connector.state('claude-code').failure?.problem).toBe('npm-admin')

    computer.executables.add('claude-agent-acp').add(MCP)
    computer.signedIn = true
    calls.length = 0

    expect(await connector.connect(claude)).toBe('connected')
    expect(calls).toEqual(['detect', 'check'])
  })

  test('reports a sign-in that ended without a login', async () => {
    const { host } = fakeAgentHost({
      executables: ['npm', 'claude-agent-acp', MCP],
      signInEndsSignedOut: true
    })
    const connector = connectorFor(host)

    expect(await connector.connect(claude)).toBe('failed')
    expect(connector.state('claude-code').failure).toEqual({
      step: 'sign-in',
      problem: 'signed-out'
    })
  })

  test('stops at activation when the chat cannot switch, and retries only that', async () => {
    const { host, calls } = fakeAgentHost({
      executables: ['npm', 'claude-agent-acp', MCP],
      signedIn: true
    })
    let attempts = 0
    const connector = connectorFor(host, async () => {
      attempts++
      if (attempts === 1) throw new Error('Settings could not be saved.')
    })

    expect(await connector.connect(claude)).toBe('failed')
    expect(connector.state('claude-code').failure).toEqual({
      step: 'activate',
      problem: 'activate'
    })
    calls.length = 0
    expect(await connector.connect(claude)).toBe('connected')
    expect(calls).toEqual([])
    expect(attempts).toBe(2)
  })

  test('asks for the vendor CLI an agent without an adapter needs', async () => {
    const { host, computer, calls } = fakeAgentHost({ executables: ['npm', MCP] })
    const connector = connectorFor(host)

    expect(await connector.connect(gemini)).toBe('failed')
    expect(connector.state('gemini-cli').failure).toEqual({
      step: 'install',
      problem: 'cli-missing'
    })

    computer.executables.add('gemini')
    calls.length = 0
    expect(await connector.connect(gemini)).toBe('connected')
    // Gemini CLI reports no login, so setup neither starts it nor signs in.
    expect(calls).toEqual(['detect'])
    expect(connector.state('gemini-cli').steps).toMatchObject({
      'sign-in': 'skipped',
      tools: 'skipped'
    })
  })

  test('waits for the person before installing, then installs when connected again', async () => {
    const { host, calls } = fakeAgentHost({ executables: ['npm', 'claude'], signedIn: true })
    const connector = connectorFor(host)

    expect(await connector.connect(claude, { installs: false })).toBe('failed')
    expect(connector.state('claude-code')).toMatchObject({
      failure: { step: 'install', problem: 'install-needed' },
      steps: { detect: 'done', install: 'failed', 'sign-in': 'pending' }
    })
    expect(calls).toEqual(['detect'])

    calls.length = 0
    expect(await connector.connect(claude)).toBe('connected')
    expect(calls).toEqual([
      'detect',
      'install claude-agent-acp',
      'detect',
      'install pairdraw-mcp-http',
      'detect',
      'check'
    ])
  })

  test('uses the lookup it already has when asked not to look again', async () => {
    const { host, calls } = fakeAgentHost({
      executables: ['npm', 'claude-agent-acp', MCP],
      signedIn: true
    })
    const setup = hostedAgentSetup(host)
    await setup.discovery.refresh()
    await setup.accounts.check(claude)
    calls.length = 0

    const connector = createAgentConnector(setup)
    expect(await connector.connect(claude, { installs: false, rescan: false })).toBe('connected')
    expect(calls).toEqual([])
  })

  test('is not stopped by another install that failed earlier', async () => {
    const { host } = fakeAgentHost({
      executables: ['npm', 'claude-agent-acp', 'codex', MCP],
      signedIn: true,
      npmWritable: false
    })
    const setup = hostedAgentSetup(host)
    await setup.discovery.refresh()
    // Installing Codex's adapter elsewhere needed administrator rights.
    await setup.discovery.install('codex')
    expect(setup.discovery.error.value).toBe('npm-admin')

    const connector = createAgentConnector(setup)
    expect(await connector.connect(claude, { installs: false, rescan: false })).toBe('connected')
    expect(connector.state('claude-code').failure).toBeNull()
  })

  test('runs one attempt at a time', async () => {
    const { host } = fakeAgentHost({
      executables: ['npm', 'claude-agent-acp', MCP],
      signedIn: true
    })
    const connector = connectorFor(host)

    const first = connector.connect(claude)
    expect(await connector.connect(claude)).toBe('busy')
    expect(await first).toBe('connected')
  })
})
