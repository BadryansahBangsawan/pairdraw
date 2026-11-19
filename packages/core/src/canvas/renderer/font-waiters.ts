import type { SkiaRenderer } from '#core/canvas/renderer'

/**
 * What waits for each canvas's fonts. It lives beside the renderer rather than on it, so a
 * renderer torn down without the class (a test double, a half-built canvas) still wakes them.
 */
const waiters = new WeakMap<SkiaRenderer, (() => void)[]>()

/** Resolves once `r` has its fonts, or when it is destroyed before them. */
export function waitForFonts(r: SkiaRenderer): Promise<void> {
  if (r.fontsLoaded || r.destroyed) return Promise.resolve()
  return new Promise((resolve) => {
    const pending = waiters.get(r)
    if (pending) pending.push(resolve)
    else waiters.set(r, [resolve])
  })
}

/** Wakes everything waiting for `r`'s fonts; loading them and going away both end that wait. */
export function settleFontWaiters(r: SkiaRenderer): void {
  const pending = waiters.get(r)
  if (!pending) return
  waiters.delete(r)
  for (const wake of pending) wake()
}
