import type { CanvasKit, TypefaceFontProvider } from 'canvaskit-wasm'

import { fontManager } from './manager'

/**
 * A share of the font provider `canvasKit` draws from. Every renderer and shaper holds one for as
 * long as it reads text, so a face registered by one is shaped by all of them, and the last share
 * given back deletes the provider. Releasing twice is safe and does nothing the second time.
 */
export interface FontProviderLease {
  readonly provider: TypefaceFontProvider
  release(): void
}

export function leaseFontProvider(canvasKit: CanvasKit): FontProviderLease {
  const provider = fontManager.acquireProvider(canvasKit)
  let held = true
  return {
    provider,
    release() {
      if (!held) return
      held = false
      fontManager.releaseProvider(provider)
    }
  }
}
