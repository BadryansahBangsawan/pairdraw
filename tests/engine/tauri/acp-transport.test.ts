import { afterEach, describe, expect, test, vi } from 'bun:test'

import { createACPTransport } from '@/app/ai/chat/session'

import { clearTauriMocks, mockTauriIPC } from '#tests/helpers/tauri/mocks'

afterEach(async () => {
  await clearTauriMocks()
  vi.restoreAllMocks()
  Reflect.deleteProperty(globalThis, 'window')
})

/** The transport keeps `cwd` private, so the spawned value is read structurally. */
function cwdOf(transport: object): string | null {
  return 'cwd' in transport && typeof transport.cwd === 'string' ? transport.cwd : null
}

/** Whether the transport treats its folder as the person's project, where saved modes stop. */
function inProjectFolder(transport: object): boolean {
  return 'projectFolder' in transport && transport.projectFolder === true
}

describe('Tauri ACP transport', () => {
  test('starts the agent in the folder the desktop shell sets aside for agents', async () => {
    const workspace = '/Users/tester/Library/Application Support/Pairdraw/agent-workspace'
    await mockTauriIPC((cmd) => {
      expect(cmd).toBe('agent_workspace')
      return workspace
    })

    const transport = await createACPTransport('acp:claude-code')

    expect(cwdOf(transport)).toBe(workspace)
    expect(inProjectFolder(transport)).toBe(false)
  })

  test('starts the agent in the project folder the person chose for the chat instead', async () => {
    const commands: string[] = []
    await mockTauriIPC((cmd) => {
      commands.push(cmd)
      return '/unused'
    })

    const transport = await createACPTransport(
      'acp:claude-code',
      undefined,
      undefined,
      '/Users/tester/code/shop'
    )

    expect(cwdOf(transport)).toBe('/Users/tester/code/shop')
    expect(inProjectFolder(transport)).toBe(true)
    expect(commands).not.toContain('agent_workspace')
  })
})
