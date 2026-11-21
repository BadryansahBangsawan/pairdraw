import { onScopeDispose, shallowRef } from 'vue'

import type { PlaySceneView, SmartAnimation } from '@pairdraw/core/prototype'

import type { EditorStore } from '@/app/editor/active-store'
import { animationsEnabled } from '@/app/shell/motion'

/**
 * Runs play's Smart animations on the display's frames: each frame poses the animation at how far
 * its duration has gone, and the canvas draws the animation's copy in place of its frame until it
 * ends. One runs at a time; a new one, Reset, or leaving play stops it where it is, and with
 * animations off it cuts.
 */
export function usePlaySmartAnimate(store: EditorStore) {
  const running = shallowRef<SmartAnimation | null>(null)
  let frame: number | null = null

  /** Stops the running animation, or only one over `rootId`, leaving the frame play shows. */
  function stop(rootId?: string): void {
    if (rootId !== undefined && running.value?.rootId !== rootId) return
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
    if (!running.value) return
    running.value = null
    store.requestRepaint()
  }

  /** Plays `animation` over `durationMs`, from now. */
  function start(animation: SmartAnimation, durationMs: number): void {
    stop()
    if (durationMs <= 0 || !animationsEnabled.value) {
      store.requestRepaint()
      return
    }
    running.value = animation
    const started = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / durationMs)
      animation.seek(progress)
      store.requestRepaint()
      if (progress < 1) frame = requestAnimationFrame(tick)
      else {
        frame = null
        stop()
      }
    }
    tick(started)
  }

  /** The frames the canvas draws from copies: play's, with a running animation over its frame. */
  function views(scenes: ReadonlyMap<string, PlaySceneView>): ReadonlyMap<string, PlaySceneView> {
    const animation = running.value
    if (!animation) return scenes
    return new Map(scenes).set(animation.rootId, animation)
  }

  onScopeDispose(stop)

  return { start, stop, views }
}
