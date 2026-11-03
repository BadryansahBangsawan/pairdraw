import { describe, expect, spyOn, test } from 'bun:test'

import {
  AgentSideConnection,
  ClientSideConnection,
  ndJsonStream,
  PROTOCOL_VERSION,
  RequestError,
  type NewSessionResponse,
  type SessionConfigOption,
  type SessionUpdate
} from '@agentclientprotocol/sdk'

import { LEGACY_MODE_CONTROL } from '@/app/ai/agents/acp/session/controls'
import {
  agentSessionControls,
  chooseAgentSessionControl,
  noteAgentSessionUpdate,
  projectFolderStartMode,
  sessionControlSetter,
  startAgentSessionControls
} from '@/app/ai/agents/acp/session/store'

/**
 * A stand-in agent that advertises a model and reasoning effort as config options and the
 * older session modes, applies what the client sets, and refuses the value `broken`.
 */
function fakeAgent() {
  const calls: string[] = []
  let model = 'fast'
  let effort = 'medium'
  let mode = 'ask'
  const configOptions = (): SessionConfigOption[] => [
    {
      type: 'select',
      id: 'model',
      name: 'Model',
      category: 'model',
      currentValue: model,
      options: [
        { value: 'fast', name: 'Fast' },
        { value: 'smart', name: 'Smart' },
        { value: 'broken', name: 'Broken' }
      ]
    },
    {
      type: 'select',
      id: 'effort',
      name: 'Effort',
      category: 'thought_level',
      // The smart model thinks harder, so choosing it changes the effort too.
      currentValue: effort,
      options: [
        { value: 'medium', name: 'Medium' },
        { value: 'high', name: 'High' }
      ]
    }
  ]
  const toClient = new TransformStream<Uint8Array>()
  const toAgent = new TransformStream<Uint8Array>()
  // The agent writes what the client reads, and the other way round.
  const agent = new AgentSideConnection(
    () => ({
      initialize: async () => ({ protocolVersion: PROTOCOL_VERSION, agentCapabilities: {} }),
      newSession: async () => ({ sessionId: 'session-1' }),
      authenticate: async () => ({}),
      prompt: async () => ({ stopReason: 'end_turn' }),
      cancel: async () => undefined,
      setSessionConfigOption: async ({ configId, value }) => {
        calls.push(`config:${configId}=${value}`)
        if (value === 'broken') throw RequestError.invalidParams({ value })
        if (configId === 'model') {
          model = value
          if (value === 'smart') effort = 'high'
        } else effort = value
        return { configOptions: configOptions() }
      },
      setSessionMode: async ({ modeId }) => {
        calls.push(`mode:${modeId}`)
        mode = modeId
        return {}
      }
    }),
    ndJsonStream(toClient.writable, toAgent.readable)
  )
  const connection = new ClientSideConnection(
    () => ({
      requestPermission: async () => ({ outcome: { outcome: 'cancelled' } }),
      sessionUpdate: async () => undefined
    }),
    ndJsonStream(toAgent.writable, toClient.readable)
  )
  const advertised = (): NewSessionResponse => ({
    sessionId: 'session-1',
    configOptions: configOptions(),
    modes: {
      currentModeId: mode,
      availableModes: [
        { id: 'ask', name: 'Ask before edits' },
        { id: 'auto', name: 'Auto' },
        { id: 'full-access', name: 'Full access' }
      ]
    }
  })
  return {
    agent,
    calls,
    connection,
    advertised,
    state: () => ({ model, effort, mode }),
    setter: sessionControlSetter(connection, 'session-1')
  }
}

function values(agentId: string, options: { projectFolder?: boolean } = {}) {
  return Object.fromEntries(agentSessionControls(agentId, options).map((c) => [c.id, c.value]))
}

describe('an agent session’s model, reasoning, and mode', () => {
  test('a choice applies to the running session and comes back with what else changed', async () => {
    const agent = fakeAgent()
    const end = await startAgentSessionControls('agent-live', agent.advertised(), agent.setter)

    await chooseAgentSessionControl('agent-live', 'model', 'smart')

    expect(agent.calls).toEqual(['config:model=smart'])
    expect(values('agent-live')).toEqual({
      model: 'smart',
      effort: 'high',
      [LEGACY_MODE_CONTROL]: 'ask'
    })
    await chooseAgentSessionControl('agent-live', LEGACY_MODE_CONTROL, 'auto')
    expect(agent.state().mode).toBe('auto')
    end()
  })

  test('the next session starts with the choices made before, through the matching request', async () => {
    const first = fakeAgent()
    const end = await startAgentSessionControls('agent-next', first.advertised(), first.setter)
    await chooseAgentSessionControl('agent-next', 'effort', 'high')
    await chooseAgentSessionControl('agent-next', LEGACY_MODE_CONTROL, 'auto')
    end()

    const second = fakeAgent()
    await startAgentSessionControls('agent-next', second.advertised(), second.setter)

    expect(second.calls).toEqual(['config:effort=high', 'mode:auto'])
    expect(second.state()).toEqual({ model: 'fast', effort: 'high', mode: 'auto' })
  })

  test('without a running session a choice waits for the next one', async () => {
    const agent = fakeAgent()
    const end = await startAgentSessionControls('agent-idle', agent.advertised(), agent.setter)
    end()

    await chooseAgentSessionControl('agent-idle', 'model', 'smart')

    expect(agent.calls).toEqual([])
    // The composer shows the choice the next session takes.
    expect(values('agent-idle').model).toBe('smart')
  })

  test('a value the agent refuses is not kept, and the caller hears of it', async () => {
    const agent = fakeAgent()
    const end = await startAgentSessionControls('agent-refuse', agent.advertised(), agent.setter)

    // The SDK logs the error it answers with; the refusal itself is under test.
    const logged = spyOn(console, 'error').mockImplementation(() => undefined)
    let failed = false
    await chooseAgentSessionControl('agent-refuse', 'model', 'broken').catch(() => {
      failed = true
    })
    logged.mockRestore()

    expect(failed).toBe(true)
    expect(values('agent-refuse').model).toBe('fast')
    end()
    const next = fakeAgent()
    await startAgentSessionControls('agent-refuse', next.advertised(), next.setter)
    expect(next.calls).toEqual([])
  })

  test('a choice the agent no longer offers is forgotten', async () => {
    const agent = fakeAgent()
    const end = await startAgentSessionControls('agent-gone', agent.advertised(), agent.setter)
    await chooseAgentSessionControl('agent-gone', 'model', 'smart')
    end()

    const next = fakeAgent()
    const advertised = next.advertised()
    advertised.configOptions = advertised.configOptions?.map((option): SessionConfigOption =>
      option.id === 'model'
        ? {
            ...option,
            options: [
              { value: 'fast', name: 'Fast' },
              { value: 'new', name: 'New' }
            ]
          }
        : option
    )
    await startAgentSessionControls('agent-gone', advertised, next.setter)
    expect(next.calls).toEqual([])
    expect(values('agent-gone').model).toBe('fast')
  })

  test('what the agent changes on its own shows in the composer', async () => {
    const agent = fakeAgent()
    const end = await startAgentSessionControls('agent-self', agent.advertised(), agent.setter)
    const switched: SessionUpdate = { sessionUpdate: 'current_mode_update', currentModeId: 'auto' }
    noteAgentSessionUpdate('agent-self', switched)
    expect(values('agent-self')[LEGACY_MODE_CONTROL]).toBe('auto')

    const [model, effort] = agent.advertised().configOptions ?? []
    noteAgentSessionUpdate('agent-self', {
      sessionUpdate: 'config_option_update',
      configOptions: [model, { ...effort, currentValue: 'high' }]
    })
    expect(values('agent-self').effort).toBe('high')
    end()
  })

  test('a mode that skips permission requests applies to its own session only', async () => {
    const first = fakeAgent()
    const end = await startAgentSessionControls('agent-bypass', first.advertised(), first.setter)
    await chooseAgentSessionControl('agent-bypass', LEGACY_MODE_CONTROL, 'auto')
    await chooseAgentSessionControl('agent-bypass', LEGACY_MODE_CONTROL, 'full-access')
    expect(first.state().mode).toBe('full-access')
    end()

    // The next session, perhaps another chat's, starts in the agent's own default instead.
    expect(values('agent-bypass')[LEGACY_MODE_CONTROL]).toBe('ask')
    const second = fakeAgent()
    await startAgentSessionControls('agent-bypass', second.advertised(), second.setter)
    expect(second.calls).toEqual([])
    expect(second.state().mode).toBe('ask')
  })

  test('in a project folder only the model and reasoning effort carry over', async () => {
    const first = fakeAgent()
    const end = await startAgentSessionControls('agent-folder', first.advertised(), first.setter)
    await chooseAgentSessionControl('agent-folder', 'effort', 'high')
    await chooseAgentSessionControl('agent-folder', LEGACY_MODE_CONTROL, 'auto')
    end()

    expect(values('agent-folder', { projectFolder: true })).toEqual({
      model: 'fast',
      effort: 'high',
      [LEGACY_MODE_CONTROL]: 'ask'
    })
    expect(projectFolderStartMode('agent-folder')).toBe('Ask before edits')

    const inFolder = fakeAgent()
    const endFolder = await startAgentSessionControls(
      'agent-folder',
      inFolder.advertised(),
      inFolder.setter,
      undefined,
      { projectFolder: true }
    )
    expect(inFolder.calls).toEqual(['config:effort=high'])
    expect(inFolder.state()).toEqual({ model: 'fast', effort: 'high', mode: 'ask' })
    endFolder()

    // Elsewhere the saved mode still applies.
    const elsewhere = fakeAgent()
    await startAgentSessionControls('agent-folder', elsewhere.advertised(), elsewhere.setter)
    expect(elsewhere.state().mode).toBe('auto')
  })

  test('keeps only what it can read back, however much an agent advertises', async () => {
    const agent = fakeAgent()
    const advertised = agent.advertised()
    const long = 'x'.repeat(2000)
    advertised.configOptions = [
      {
        type: 'select',
        id: 'model',
        name: long,
        category: 'model',
        currentValue: 'model-0',
        options: Array.from({ length: 400 }, (_, index) => ({
          value: `model-${index}`,
          name: `Model ${index}`
        })).concat([{ value: long, name: 'Too long to match' }])
      },
      ...Array.from({ length: 40 }, (_, index) => ({
        type: 'select' as const,
        id: `extra-${index}`,
        name: `Extra ${index}`,
        currentValue: 'a',
        options: [
          { value: 'a', name: 'A' },
          { value: 'b', name: 'B' }
        ]
      }))
    ]
    const end = await startAgentSessionControls('agent-large', advertised, agent.setter)

    const controls = agentSessionControls('agent-large')
    expect(controls.length).toBeLessThanOrEqual(32)
    const model = controls.find((control) => control.id === 'model')
    expect(model?.name.length).toBe(512)
    const choices = model?.groups.flatMap((group) => group.choices) ?? []
    expect(choices.length).toBe(256)
    expect(choices.some((choice) => choice.value === long)).toBe(false)
    end()
  })
})
