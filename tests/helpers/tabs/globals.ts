import { vi } from 'bun:test'

import { getTabsSnapshot } from '@/app/tabs'

import { asDouble } from '#tests/helpers/doubles'

/** The few browser globals an editor tab touches outside a browser. */
export function setupTabGlobals(): void {
  globalThis.window = asDouble<Window & typeof globalThis>({
    innerWidth: 1024,
    innerHeight: 768,
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      callback(0)
      return 0
    },
    cancelAnimationFrame: vi.fn(),
    openPencil: {},
    location: asDouble<Location>({ href: 'http://localhost/' }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })
  globalThis.document = asDouble<Document>({
    fonts: { add: vi.fn(), ready: Promise.resolve() }
  })
  globalThis.requestAnimationFrame = window.requestAnimationFrame
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame
}

export function clearTabGlobals(): void {
  for (const name of ['window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame']) {
    Reflect.deleteProperty(globalThis, name)
  }
}

/**
 * Waits for a tab operation that shows a document: nothing renders here, so each tab waiting for
 * its canvas to present is told it did.
 */
export async function settleTabs<T>(pending: Promise<T>): Promise<T> {
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
