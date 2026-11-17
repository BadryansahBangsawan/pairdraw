import { vi } from 'bun:test'

import { getTabsSnapshot } from '@/app/tabs'

import { asDouble } from '#tests/helpers/doubles'

/** The window a bridge test needs. A synchronous frame re-enters the agent cursor glide. */
export function setupGlobals(): void {
  globalThis.window = asDouble<Window & typeof globalThis>({
    innerWidth: 1024,
    innerHeight: 768,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: vi.fn(),
    pairdraw: {},
    location: { href: 'http://localhost/' } as Location,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })
  globalThis.document = asDouble<Document>({
    fonts: { add: vi.fn(), ready: Promise.resolve() },
    querySelector: () => null
  })
  globalThis.requestAnimationFrame = window.requestAnimationFrame
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame
}

/** Page switches wait for the canvas to present; nothing renders here, so acknowledge it. */
export async function settle<T>(pending: Promise<T>): Promise<T> {
  const idle = Symbol('idle')
  for (;;) {
    for (const tab of getTabsSnapshot()) {
      if (tab.store.state.preparation?.phase !== 'preparing-render') continue
      tab.store.preparationController.acknowledgePresentation(tab.store.state.sceneVersion)
    }
    const result = await Promise.race([
      pending,
      new Promise<typeof idle>((resolve) => {
        setTimeout(() => resolve(idle), 0)
      })
    ])
    if (result !== idle) return result
  }
}
