import { describe, expect, test } from 'bun:test'

import type { SessionConfigOption } from '@agentclientprotocol/sdk'

import {
  carriesOver,
  choiceName,
  LEGACY_MODE_CONTROL,
  LEGACY_MODEL_CONTROL,
  sessionControls,
  sessionModel,
  skipsPermissionRequests,
  withConfigOptions,
  withCurrentMode
} from '@/app/ai/agents/acp/session/controls'

const effort: SessionConfigOption = {
  type: 'select',
  id: 'reasoning_effort',
  name: 'Reasoning',
  category: 'thought_level',
  currentValue: 'medium',
  options: [
    { value: 'low', name: 'Low' },
    { value: 'medium', name: 'Medium' },
    { value: 'high', name: 'High' }
  ]
}

const model: SessionConfigOption = {
  type: 'select',
  id: 'model',
  name: 'Model',
  category: 'model',
  currentValue: 'gpt-5',
  options: [
    { group: 'openai', name: 'OpenAI', options: [{ value: 'gpt-5', name: 'GPT-5' }] },
    { group: 'mini', name: 'Small', options: [{ value: 'gpt-5-mini', name: 'GPT-5 mini' }] }
  ]
}

const modes = {
  currentModeId: 'default',
  availableModes: [
    { id: 'default', name: 'Ask before edits' },
    { id: 'acceptEdits', name: 'Accept edits', description: 'Edits files without asking' }
  ]
}

const models = {
  currentModelId: 'sonnet',
  availableModels: [
    { modelId: 'sonnet', name: 'Sonnet' },
    { modelId: 'opus', name: 'Opus' }
  ]
}

describe('an agent’s session controls', () => {
  test('come in the order model, reasoning, mode, whatever order the agent lists them', () => {
    const controls = sessionControls({ configOptions: [effort, model], modes })
    expect(controls.map((control) => control.category)).toEqual(['model', 'thought_level', 'mode'])
  })

  test('keep the agent’s groups of choices and its flat list', () => {
    const [modelControl, effortControl] = sessionControls({ configOptions: [model, effort] })
    expect(modelControl.groups.map((group) => group.label)).toEqual(['OpenAI', 'Small'])
    expect(effortControl.groups).toEqual([
      {
        label: null,
        choices: [
          { value: 'low', name: 'Low', description: null },
          { value: 'medium', name: 'Medium', description: null },
          { value: 'high', name: 'High', description: null }
        ]
      }
    ])
    expect(choiceName(modelControl, 'gpt-5-mini')).toBe('GPT-5 mini')
  })

  test('take the older modes and models where no config option covers them', () => {
    const controls = sessionControls({ modes, models })
    expect(controls.map((control) => [control.id, control.kind, control.value])).toEqual([
      [LEGACY_MODEL_CONTROL, 'model', 'sonnet'],
      [LEGACY_MODE_CONTROL, 'mode', 'default']
    ])
    expect(sessionModel(controls)).toBe('sonnet')
  })

  test('prefer a config option to the older model list for the same thing', () => {
    const controls = sessionControls({ configOptions: [model], models })
    expect(controls.map((control) => control.id)).toEqual(['model'])
  })

  test('leave out a control with a single choice, which offers nothing to pick', () => {
    const single: SessionConfigOption = {
      ...effort,
      options: [{ value: 'medium', name: 'Medium' }]
    }
    expect(sessionControls({ configOptions: [single] })).toEqual([])
  })

  test('follow the full set of options the agent announces again', () => {
    const controls = sessionControls({ configOptions: [effort], modes })
    const updated = withConfigOptions(controls, [{ ...effort, currentValue: 'high' }, model])
    expect(updated.map((control) => [control.id, control.value])).toEqual([
      ['model', 'gpt-5'],
      ['reasoning_effort', 'high'],
      [LEGACY_MODE_CONTROL, 'default']
    ])
  })

  test('follow a mode the agent switched to on its own, ignoring one it never offered', () => {
    const controls = sessionControls({ modes })
    expect(withCurrentMode(controls, 'acceptEdits')[0].value).toBe('acceptEdits')
    expect(withCurrentMode(controls, 'unknown')[0].value).toBe('default')
  })
})

describe('modes that skip permission requests', () => {
  /** The modes Claude Code, Codex, and Gemini CLI advertise, as one control each. */
  function modeControl(modes: { id: string; name: string; description?: string }[]) {
    const [control] = sessionControls({
      modes: { currentModeId: modes[0].id, availableModes: modes }
    })
    return control
  }

  test('are known by their id or name in each agent', () => {
    const claude = modeControl([
      { id: 'default', name: 'Default', description: 'Prompts for dangerous operations' },
      { id: 'acceptEdits', name: 'Accept Edits' },
      { id: 'plan', name: 'Plan Mode' },
      { id: 'dontAsk', name: 'Don’t Ask' },
      { id: 'bypassPermissions', name: 'Bypass Permissions' }
    ])
    const codex = modeControl([
      { id: 'read-only', name: 'Read Only' },
      { id: 'auto', name: 'Auto' },
      { id: 'full-access', name: 'Full Access' }
    ])
    const gemini = modeControl([
      { id: 'default', name: 'Default' },
      { id: 'autoEdit', name: 'Auto Edit' },
      { id: 'yolo', name: 'YOLO' }
    ])
    const skipping = (control: typeof claude) =>
      control.groups[0].choices
        .filter((choice) => skipsPermissionRequests(control, choice.value))
        .map((choice) => choice.value)

    expect(skipping(claude)).toEqual(['dontAsk', 'bypassPermissions'])
    expect(skipping(codex)).toEqual(['full-access'])
    expect(skipping(gemini)).toEqual(['yolo'])
  })

  test('never apply to the model or reasoning, and other settings stay out of project folders', () => {
    const [model, reasoning] = sessionControls({
      configOptions: [
        {
          type: 'select',
          id: 'model',
          name: 'Model',
          category: 'model',
          currentValue: 'full-access-model',
          options: [
            { value: 'full-access-model', name: 'Full access model' },
            { value: 'other', name: 'Other' }
          ]
        },
        effort
      ]
    })
    expect(skipsPermissionRequests(model, 'full-access-model')).toBe(false)
    expect(carriesOver(model, 'other', { projectFolder: true })).toBe(true)
    expect(carriesOver(reasoning, 'high', { projectFolder: true })).toBe(true)

    const [mode] = sessionControls({
      modes: {
        currentModeId: 'default',
        availableModes: [
          { id: 'default', name: 'Default' },
          { id: 'auto', name: 'Auto' }
        ]
      }
    })
    expect(carriesOver(mode, 'auto')).toBe(true)
    expect(carriesOver(mode, 'auto', { projectFolder: true })).toBe(false)
  })
})

test('the value a session started with stays known after the agent changes it', () => {
  const controls = sessionControls({ configOptions: [effort] })
  const changed = withConfigOptions(controls, [{ ...effort, currentValue: 'high' }])
  expect(changed.map((control) => [control.value, control.initial])).toEqual([['high', 'medium']])
})
