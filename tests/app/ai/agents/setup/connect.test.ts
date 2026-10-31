import { describe, expect, mock, test } from 'bun:test'

import { ACP_AGENTS, type ACPAgentDef } from '@open-pencil/core/constants'

import type { AgentAuthStatus } from '@/app/ai/agents/acp/auth/status'
import type { OwnToolsOutcome } from '@/app/ai/agents/acp/tools'
import type { AgentHost } from '@/app/ai/agents/host/types'
import { createAgentAccounts } from '@/app/ai/agents/setup/accounts'
import { createAgentConnector } from '@/app/ai/agents/setup/connect'
import { createHostedAgentDiscovery } from '@/app/ai/agents/setup/discovery'
import { APP_VERSION } from '@/app/runtime/version'

import { expectDefined } from '#tests/helpers/assert'

const claude = expectDefined(
  ACP_AGENTS.find((agent) => agent.id === 'claude-code'),
  'Claude Code'
)
const gemini = expectDefined(
  ACP_AGENTS.find((agent) => agent.id === 'gemini-cli'),
  'Gemini CLI'
)

const MCP = 'openpencil-mcp-http'
const SIGNED_OUT: AgentAuthStatus = { kind: 'none', label: 'Not logged in' }
const SIGNED_IN: AgentAuthStatus = { kind: 'account', label: 'Claude Max' }

interface Computer {
  executables: string[]
  /** npm's global folder is writable without administrator rights. */
  npmWritable?: boolean
  signedIn?: boolean
  toolsReachable?: boolean
  /** The sign-in ends without a login, as when the person closes the browser. */
  signInEndsSignedOut?: boolean
}

function toolsOutcome(reachable: boolean): OwnToolsOutcome {
  return reachable
    ? { connected: true }
    : { connected: false, reason: 'The MCP server is not running.' }
}

/** A host whose computer changes as setup installs and signs in, recording what it was asked. */
function fakeHost(initial: Computer) {
  const computer = {
    npmWritable: true,
    signedIn: false,
    toolsReachable: true,
    signInEndsSignedOut: false,
    ...initial,
    executables: new Set(initial.executables)
  }
  const calls: string[] = []
  const host: AgentHost = {
    async detect() {
      calls.push('detect')
      const executables = [...computer.executables]
      const versions: Record<string, string> = computer.executables.has(MCP)
        ? { '@open-pencil/mcp': APP_VERSION }
        : {}
      return {
        searchPath: '/test/bin',
        executables: Object.fromEntries(executables.map((name) => [name, `/test/bin/${name}`])),
        versions,
        npmGlobalWritable: computer.executables.has('npm') ? computer.npmWritable : null
      }
    },
    async install(target) {
      const name = target.kind === 'adapter' ? target.agent.command : MCP
      calls.push(`install ${name}`)
      computer.executables.add(name)
    },
    async signIn(_agent, { methodId }) {
      calls.push(`sign-in ${methodId}`)
      computer.signedIn = !computer.signInEndsSignedOut
      return { done: Promise.resolve(null), cancel: async () => undefined }
    },
    async check(agent) {
      calls.push('check')
      const status = computer.signedIn ? SIGNED_IN : SIGNED_OUT
      return {
        status,
        methods: [{ id: 'claude-ai-login', name: 'Claude Subscription', type: 'terminal' }],
        adapter: agent.adapterPackage ? { name: agent.adapterPackage, version: '1.0.0' } : null,
        tools: computer.signedIn ? toolsOutcome(computer.toolsReachable) : null
      }
    },
    async spawn() {
      throw new Error('Connecting does not start a chat.')
    },
    async workspace() {
      return '/test/workspace'
    }
  }
  return { host, computer, calls }
}

function connectorFor(host: AgentHost, activate?: (agent: ACPAgentDef) => Promise<void>) {
  const discovery = createHostedAgentDiscovery(host, {
    enabled: true,
    restartBridge: async () => undefined
  })
  const accounts = createAgentAccounts({ enabled: true, host })
  return createAgentConnector({ discovery, accounts, activate })
}

describe('connecting a coding agent', () => {
  test('finds, installs, signs in, checks the tools, and activates the agent in order', async () => {
    const { host, calls } = fakeHost({ executables: ['npm', 'claude'] })
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
      'install openpencil-mcp-http',
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
    const { host, calls } = fakeHost({
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
    const { host, calls } = fakeHost({ executables: ['npm', 'claude'], npmWritable: false })
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
    const { host, computer, calls } = fakeHost({
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
    const { host, computer, calls } = fakeHost({ executables: ['npm'], npmWritable: false })
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
    const { host } = fakeHost({
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
    const { host, calls } = fakeHost({
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
    const { host, computer, calls } = fakeHost({ executables: ['npm', MCP] })
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

  test('runs one attempt at a time', async () => {
    const { host } = fakeHost({ executables: ['npm', 'claude-agent-acp', MCP], signedIn: true })
    const connector = connectorFor(host)

    const first = connector.connect(claude)
    expect(await connector.connect(claude)).toBe('busy')
    expect(await first).toBe('connected')
  })
})
