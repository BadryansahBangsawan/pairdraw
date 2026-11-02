import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  claudeCodeCloud,
  cloudFrom,
  settingsSwitches,
  type SwitchSource
} from '#mcp/agents/claude-cloud'

function source(values: Record<string, string>): SwitchSource {
  return (name) => values[name]
}

const folders: string[] = []

function settingsFolder(settings: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'op-claude-'))
  folders.push(dir)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'settings.json'), settings)
  return dir
}

afterEach(() => {
  for (const dir of folders.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('Claude Code cloud switches', () => {
  test('reads the first switch that is on, in the order Claude Code checks them', () => {
    expect(cloudFrom([source({ CLAUDE_CODE_USE_VERTEX: '1' })])).toBe('vertex')
    expect(
      cloudFrom([source({ CLAUDE_CODE_USE_FOUNDRY: 'true', CLAUDE_CODE_USE_BEDROCK: 'YES' })])
    ).toBe('bedrock')
    expect(cloudFrom([source({ CLAUDE_CODE_USE_BEDROCK: '0', CLAUDE_CODE_USE_VERTEX: '' })])).toBe(
      null
    )
    expect(cloudFrom([source({ ANTHROPIC_API_KEY: 'secret' })])).toBe(null)
  })

  test('lets settings override the environment', () => {
    const env = source({ CLAUDE_CODE_USE_BEDROCK: '1' })
    expect(cloudFrom([source({ CLAUDE_CODE_USE_BEDROCK: 'off' }), env])).toBe(null)
    expect(cloudFrom([source({ CLAUDE_CODE_USE_FOUNDRY: 'on' }), env])).toBe('bedrock')
  })

  test('reads only the switches from a settings file', async () => {
    const dir = settingsFolder(
      JSON.stringify({
        env: {
          CLAUDE_CODE_USE_VERTEX: true,
          ANTHROPIC_API_KEY: 'secret',
          CLAUDE_CODE_USE_FOUNDRY: {}
        }
      })
    )
    const switches = await settingsSwitches(join(dir, 'settings.json'))
    expect(switches('CLAUDE_CODE_USE_VERTEX')).toBe('true')
    expect(switches('CLAUDE_CODE_USE_FOUNDRY')).toBe('')
    expect(switches('CLAUDE_CODE_USE_BEDROCK')).toBeUndefined()
  })

  test('ignores a missing or malformed settings file', async () => {
    const dir = settingsFolder('not json')
    expect((await settingsSwitches(join(dir, 'settings.json')))('CLAUDE_CODE_USE_VERTEX')).toBe(
      undefined
    )
    expect((await settingsSwitches(join(dir, 'missing.json')))('CLAUDE_CODE_USE_VERTEX')).toBe(
      undefined
    )
  })

  test("reads the user's settings from CLAUDE_CONFIG_DIR and the environment", async () => {
    const dir = settingsFolder(JSON.stringify({ env: { CLAUDE_CODE_USE_FOUNDRY: '1' } }))
    // A platform with no managed settings keeps the computer's own file out of the test.
    expect(await claudeCodeCloud({ CLAUDE_CONFIG_DIR: dir }, 'aix')).toBe('foundry')
    const empty = settingsFolder('{}')
    expect(
      await claudeCodeCloud({ CLAUDE_CONFIG_DIR: empty, CLAUDE_CODE_USE_VERTEX: '1' }, 'aix')
    ).toBe('vertex')
    expect(await claudeCodeCloud({ CLAUDE_CONFIG_DIR: empty }, 'aix')).toBe(null)
  })

  test('a switch set to null, an array, or an object in settings is off and masks the environment', async () => {
    const dir = settingsFolder(
      JSON.stringify({
        env: {
          CLAUDE_CODE_USE_BEDROCK: null,
          CLAUDE_CODE_USE_VERTEX: [],
          CLAUDE_CODE_USE_FOUNDRY: {}
        }
      })
    )
    const switches = await settingsSwitches(join(dir, 'settings.json'))
    expect(switches('CLAUDE_CODE_USE_BEDROCK')).toBe('')
    expect(switches('CLAUDE_CODE_USE_VERTEX')).toBe('')
    expect(
      await claudeCodeCloud(
        { CLAUDE_CONFIG_DIR: dir, CLAUDE_CODE_USE_BEDROCK: '1', CLAUDE_CODE_USE_VERTEX: '1' },
        'aix'
      )
    ).toBe(null)
  })
})
