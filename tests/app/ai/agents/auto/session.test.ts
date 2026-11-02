import { describe, expect, test } from 'bun:test'

import { until } from '@vueuse/core'

import { ACP_AGENTS, type ACPAgentDef } from '@open-pencil/core/constants'

import { createAgentAutoConnect } from '@/app/ai/agents/auto/session'

import {
  fakeAgentHost,
  hostedAgentSetup,
  MCP,
  type FakeComputer
} from '#tests/helpers/agents/fake-host'
import { expectDefined } from '#tests/helpers/assert'

const claude = expectDefined(
  ACP_AGENTS.find((agent) => agent.id === 'claude-code'),
  'Claude Code'
)

/** Claude Code signed in, with its adapter and the MCP server installed. */
const READY: FakeComputer = { executables: ['npm', 'claude-agent-acp', MCP], signedIn: true }

interface ChatOptions {
  available?: boolean
  /** The model settings are still a fresh install's. */
  untouched?: boolean
  /** The chat can send. */
  configured?: boolean
}

/**
 * Auto-connect on a fake computer, recording the agents it switched the chat to. Switching one
 * on sets the chat up, as activating an agent does.
 */
function autoConnectOn(computer: FakeComputer, options: ChatOptions = {}) {
  const fake = fakeAgentHost(computer)
  const activated: string[] = []
  const chat = {
    available: options.available ?? true,
    untouched: options.untouched ?? true,
    configured: options.configured ?? false
  }
  const setup = hostedAgentSetup(fake.host, () => chat.available)
  const autoConnect = createAgentAutoConnect({
    ...setup,
    available: () => chat.available,
    activate: (agent: ACPAgentDef) => {
      activated.push(agent.id)
      chat.untouched = false
      chat.configured = true
    },
    configured: () => chat.configured,
    untouched: () => chat.untouched
  })
  return { ...fake, setup, autoConnect, activated, chat }
}

function count(calls: string[], call: string): number {
  return calls.filter((made) => made === call).length
}

describe('connecting an agent already on this computer', () => {
  test('switches the chat to a ready agent without installing or signing in', async () => {
    const { autoConnect, calls, activated } = autoConnectOn(READY)

    expect(await autoConnect.detect()).toBe('connected')

    expect(calls).toEqual(['detect', 'check'])
    expect(activated).toEqual(['claude-code'])
    expect(autoConnect.state.phase).toBe('connected')
    expect(autoConnect.state.notice?.id).toBe('claude-code')

    autoConnect.dismissNotice()
    expect(autoConnect.state.notice).toBeNull()
  })

  test('waits for a click before signing in to a signed-out agent', async () => {
    const { autoConnect, calls, activated } = autoConnectOn({
      executables: ['npm', 'claude-agent-acp', MCP]
    })

    expect(await autoConnect.detect()).toBe('action')
    expect(autoConnect.state.phase).toBe('action')
    expect(autoConnect.state.candidate?.state).toBe('sign-in')
    expect(calls.some((call) => call.startsWith('sign-in'))).toBe(false)
    expect(activated).toEqual([])

    expect(await autoConnect.connect('claude-code')).toBe('connected')
    expect(calls).toContain('sign-in claude-ai-login')
    expect(activated).toEqual(['claude-code'])
    expect(autoConnect.state.phase).toBe('connected')
    // The person chose it, so the chat has nothing to point out.
    expect(autoConnect.state.notice).toBeNull()
  })

  test('installs nothing until the person asks for the install', async () => {
    const { autoConnect, calls, activated } = autoConnectOn({
      executables: ['npm', 'claude'],
      signedIn: true
    })

    expect(await autoConnect.detect()).toBe('action')
    expect(autoConnect.state.candidate?.state).toBe('install')

    expect(await autoConnect.connect('claude-code')).toBe('failed')
    expect(autoConnect.state.phase).toBe('failed')
    expect(autoConnect.connection('claude-code').failure).toEqual({
      step: 'install',
      problem: 'install-needed'
    })
    expect(calls.some((call) => call.startsWith('install'))).toBe(false)

    expect(await autoConnect.connect('claude-code', { installs: true })).toBe('connected')
    expect(calls).toContain('install claude-agent-acp')
    expect(calls).toContain(`install ${MCP}`)
    expect(activated).toEqual(['claude-code'])
  })

  test('finds nothing to use on a computer without agents', async () => {
    const { autoConnect, activated } = autoConnectOn({ executables: ['npm', MCP] })

    expect(await autoConnect.detect()).toBe('none')
    expect(autoConnect.state.phase).toBe('none')
    expect(activated).toEqual([])
  })

  test('does not look where agents cannot run, and looks once they can', async () => {
    const { autoConnect, calls, chat } = autoConnectOn(READY, { available: false })

    expect(await autoConnect.detect()).toBe('unsupported')
    expect(calls).toEqual([])

    chat.available = true
    expect(await autoConnect.detect()).toBe('connected')
  })

  test('drops an offer once agents cannot run here, so guided setup can open', async () => {
    const { autoConnect, chat } = autoConnectOn({ executables: ['npm', 'claude-agent-acp', MCP] })
    expect(await autoConnect.detect()).toBe('action')

    chat.available = false
    expect(await autoConnect.detect()).toBe('unsupported')
    expect(await autoConnect.connect('claude-code')).toBe('failed')
    expect(autoConnect.state.phase).toBe('unsupported')
    expect(await autoConnect.switchTo('claude-code')).toBe('failed')
    expect(autoConnect.state.phase).toBe('unsupported')
  })

  test('switches on despite an install that failed elsewhere earlier', async () => {
    const { autoConnect, setup, activated } = autoConnectOn({
      executables: ['npm', 'claude-agent-acp', 'codex', MCP],
      signedIn: true,
      npmWritable: false
    })
    // Settings tried to install Codex's adapter, which npm refused without administrator rights.
    await setup.discovery.refresh()
    await setup.discovery.install('codex')
    expect(setup.discovery.error.value).toBe('npm-admin')

    expect(await autoConnect.detect()).toBe('connected')
    expect(activated).toEqual(['claude-code'])
  })
})

describe('sharing and repeating a lookup', () => {
  test('shares one lookup, one check, and one switch-on between calls made while it runs', async () => {
    const { autoConnect, calls, activated } = autoConnectOn(READY)

    const outcomes = await Promise.all([autoConnect.detect(), autoConnect.detect()])

    expect(outcomes).toEqual(['connected', 'connected'])
    expect(calls).toEqual(['detect', 'check'])
    expect(activated).toEqual(['claude-code'])
    expect(await autoConnect.detect()).toBe('connected')
    expect(calls).toEqual(['detect', 'check'])
  })

  test('keeps an offer for the session', async () => {
    const { autoConnect, calls } = autoConnectOn({ executables: ['npm', 'claude-agent-acp', MCP] })

    expect(await autoConnect.detect()).toBe('action')
    expect(await autoConnect.detect()).toBe('action')
    expect(count(calls, 'detect')).toBe(1)
  })

  test('waits for a login check another part of the app started', async () => {
    const { autoConnect, setup, holds, calls, activated } = autoConnectOn(READY)
    await setup.discovery.refresh()
    const check = Promise.withResolvers<undefined>()
    holds.check = check.promise

    // Settings reads the login while the lookup ranks the agents.
    const settings = setup.accounts.check(claude)
    const outcome = autoConnect.detect()
    await until(() => autoConnect.state.phase).toBe('detecting')
    check.resolve(undefined)
    await settings

    expect(await outcome).toBe('connected')
    expect(activated).toEqual(['claude-code'])
    expect(count(calls, 'check')).toBe(1)
  })

  test('looks again when forced, after the lookup still running', async () => {
    const { autoConnect, setup, holds, calls } = autoConnectOn({ executables: ['npm', MCP] })
    const lookup = Promise.withResolvers<undefined>()
    holds.detect = lookup.promise

    const first = autoConnect.detect()
    await until(() => setup.discovery.scanning.value).toBe(true)
    const forced = autoConnect.detect({ force: true })
    const forcedAgain = autoConnect.detect({ force: true })
    holds.detect = null
    lookup.resolve(undefined)

    expect(await Promise.all([first, forced, forcedAgain])).toEqual(['none', 'none', 'none'])
    expect(count(calls, 'detect')).toBe(2)
  })

  test('looks again once the chat lost the agent it switched on', async () => {
    const { autoConnect, activated, chat } = autoConnectOn(READY)
    expect(await autoConnect.detect()).toBe('connected')

    // Every model was removed, which leaves a fresh install's settings.
    chat.untouched = true
    chat.configured = false
    expect(await autoConnect.detect()).toBe('connected')
    expect(activated).toEqual(['claude-code', 'claude-code'])

    // The agent is still the person's model, but the chat cannot send to it now.
    chat.configured = false
    expect(await autoConnect.detect()).toBe('none')
    expect(autoConnect.state.phase).toBe('idle')
    expect(autoConnect.state.notice).toBeNull()
    expect(activated).toHaveLength(2)
  })
})

describe('leaving the person’s model alone', () => {
  test('never replaces a model the chat can send to', async () => {
    const { autoConnect, activated } = autoConnectOn(READY, { untouched: false, configured: true })

    expect(await autoConnect.detect()).toBe('none')
    expect(activated).toEqual([])
    // What it found stays on offer, for the person to switch to.
    expect(autoConnect.state.candidates.map(({ agent }) => agent.id)).toEqual(['claude-code'])
  })

  test('never replaces a chosen model the chat cannot send to now, such as a locked key', async () => {
    const { autoConnect, activated } = autoConnectOn(READY, { untouched: false })

    expect(await autoConnect.detect()).toBe('none')
    expect(autoConnect.state.phase).toBe('idle')
    expect(activated).toEqual([])
  })

  test('stops offering an agent once the person sets a model up', async () => {
    const { autoConnect, chat } = autoConnectOn({ executables: ['npm', 'claude-agent-acp', MCP] })
    expect(await autoConnect.detect()).toBe('action')

    // A Cloud model chosen in Settings, which cannot send until the person signs in.
    chat.untouched = false
    expect(await autoConnect.detect()).toBe('none')
    expect(autoConnect.state.phase).toBe('idle')
  })

  test('leaves alone a model set up during the lookup', async () => {
    const { autoConnect, holds, chat, activated } = autoConnectOn(READY)
    const lookup = Promise.withResolvers<undefined>()
    holds.detect = lookup.promise

    const outcome = autoConnect.detect()
    chat.untouched = false
    chat.configured = true
    lookup.resolve(undefined)

    expect(await outcome).toBe('none')
    expect(activated).toEqual([])
  })

  test('leaves alone a model set up while it waited to switch an agent on', async () => {
    const { autoConnect, setup, holds, chat, activated } = autoConnectOn(READY)
    await setup.discovery.refresh()
    const check = Promise.withResolvers<undefined>()
    holds.check = check.promise
    const outcome = autoConnect.detect()
    await until(() => setup.accounts.account('claude-code').checking).toBe(true)

    // Settings looks the computer up again, and connecting the ranked agent waits for it.
    const scan = Promise.withResolvers<undefined>()
    holds.detect = scan.promise
    const rescan = setup.discovery.refresh(true)
    check.resolve(undefined)
    await until(() => autoConnect.connection('claude-code').steps.detect).toBe('running')

    // Meanwhile the person sets a model up.
    chat.untouched = false
    chat.configured = true
    scan.resolve(undefined)
    await rescan

    expect(await outcome).toBe('none')
    expect(activated).toEqual([])
    expect(autoConnect.state.phase).toBe('idle')
  })

  test('switches to an agent the person picks, or waits for a click when it needs one', async () => {
    const { autoConnect, activated, calls } = autoConnectOn(
      { executables: ['npm', 'claude-agent-acp', 'gemini', MCP] },
      { untouched: false, configured: true }
    )
    await autoConnect.detect()

    expect(await autoConnect.switchTo('claude-code')).toBe('action')
    expect(autoConnect.state.candidate?.agent.id).toBe('claude-code')
    expect(calls.some((call) => call.startsWith('sign-in'))).toBe(false)

    expect(await autoConnect.switchTo('gemini-cli')).toBe('connected')
    expect(activated).toEqual(['gemini-cli'])
    expect(autoConnect.state.notice).toBeNull()
  })
})
