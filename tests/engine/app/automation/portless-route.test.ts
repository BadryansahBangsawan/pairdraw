import { describe, expect, test } from 'bun:test'

import { devAutomationRoute } from '@/app/automation/bridge/portless-route'

describe('Portless MCP routing', () => {
  test('uses the fixed localhost bridge outside Portless', () => {
    expect(devAutomationRoute(undefined, 7600)).toEqual({
      browserURL: 'ws://127.0.0.1:7600',
      corsOrigin: 'http://localhost:1420',
      portlessServiceName: null,
      runtimeId: 'localhost-7600'
    })
  })

  test('uses the requested app origin and an isolated fixed-port runtime', () => {
    expect(devAutomationRoute(undefined, 7682, 'http://localhost:1482')).toEqual({
      browserURL: 'ws://127.0.0.1:7682',
      corsOrigin: 'http://localhost:1482',
      portlessServiceName: null,
      runtimeId: 'localhost-7682'
    })
  })

  test('derives a sibling MCP service for the main checkout', () => {
    expect(devAutomationRoute('https://pairdraw.localhost', 7600)).toEqual({
      browserURL: 'wss://mcp.pairdraw.localhost',
      corsOrigin: 'https://pairdraw.localhost',
      portlessServiceName: 'mcp.pairdraw',
      runtimeId: 'mcp.pairdraw.localhost'
    })
  })

  test('preserves the worktree prefix for the MCP service', () => {
    expect(devAutomationRoute('https://portless-mcp-routing.pairdraw.localhost', 7600)).toEqual({
      browserURL: 'wss://portless-mcp-routing.mcp.pairdraw.localhost',
      corsOrigin: 'https://portless-mcp-routing.pairdraw.localhost',
      portlessServiceName: 'mcp.pairdraw',
      runtimeId: 'portless-mcp-routing.mcp.pairdraw.localhost'
    })
  })

  test('preserves a nonstandard HTTPS proxy port', () => {
    const route = devAutomationRoute('https://chat-history.pairdraw.localhost:1355', 7600)
    expect(route.browserURL).toBe('wss://chat-history.mcp.pairdraw.localhost:1355')
    expect(route.corsOrigin).toBe('https://chat-history.pairdraw.localhost:1355')
  })

  test('rejects unrelated Portless hostnames', () => {
    expect(() => devAutomationRoute('https://other.localhost', 7600)).toThrow(
      'Unexpected Pairdraw Portless URL'
    )
  })
})
