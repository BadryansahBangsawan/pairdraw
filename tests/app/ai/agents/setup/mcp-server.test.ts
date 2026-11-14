import { describe, expect, mock, test } from 'bun:test'

import { nextTick, ref } from 'vue'

import { createAgentDiscovery } from '@/app/ai/agents/setup/discovery'
import { useMCPServerSetup } from '@/app/ai/agents/setup/mcp-server'
import type { AgentLookup } from '@/app/ai/agents/setup/native'
import { mcpServerSetupView } from '@/app/ai/agents/setup/view'

function lookup(...commands: string[]): AgentLookup {
  return {
    searchPath: '/test/bin',
    versions: {},
    executables: Object.fromEntries(commands.map((command) => [command, `/test/bin/${command}`]))
  }
}

describe('useMCPServerSetup', () => {
  test('checks while active, then installs and restarts the server with one click', async () => {
    let installed = false
    const installBridge = mock(async () => {
      installed = true
    })
    const restartBridge = mock(async () => undefined)
    const discovery = createAgentDiscovery({
      enabled: true,
      lookup: async (): Promise<AgentLookup> => ({
        ...lookup('npm', ...(installed ? ['pairdraw-mcp-http'] : [])),
        versions: installed ? { '@pairdraw/mcp': '0.0.0-test' } : {}
      }),
      install: async () => undefined,
      installBridge,
      restartBridge
    })
    const active = ref(false)
    const server = useMCPServerSetup(active, discovery)
    expect(server.state.value.checked).toBe(false)

    active.value = true
    await nextTick()
    await discovery.refresh()
    expect(mcpServerSetupView(server.state.value).bridge.action).toBe('install')

    await server.install()
    expect(installBridge).toHaveBeenCalledTimes(1)
    expect(restartBridge).toHaveBeenCalledTimes(1)
    expect(mcpServerSetupView(server.state.value).bridge.ready).toBe(true)
  })
})
