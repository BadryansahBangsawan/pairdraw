import { watch } from 'vue'

import type { Editor } from '@open-pencil/core'
import {
  isShaderSourcePaint,
  parseShaderUniforms,
  readShaderPaints
} from '@open-pencil/scene-graph/shaders'

import { animationsEnabled } from '@/app/shell/motion'

/**
 * Repaints the canvas while the document draws a shader that counts time, since nothing else in
 * the document changes between frames. Scanning for one walks the whole document, so it runs at
 * most a few times a second and only when an edit may have changed which shaders draw.
 */
const SCAN_INTERVAL_MS = 200

/** Whether `source` reads the clock, which makes every frame of it a new picture. */
const countsTime = new Map<string, boolean>()

function sourceCountsTime(source: string): boolean {
  const known = countsTime.get(source)
  if (known !== undefined) return known
  const counts = parseShaderUniforms(source).uniforms.some(
    (uniform) => uniform.automatic === 'time'
  )
  countsTime.set(source, counts)
  return counts
}

export function createShaderClock(editor: Editor) {
  let needsRepaint = false
  let scanDue = true
  let lastScan = 0
  let frame = 0

  /** A document edit may have started or stopped a shader that counts time. */
  function changed() {
    scanDue = true
    wake()
  }

  const unsubscribes = [
    editor.onEditorEvent('node:created', changed),
    editor.onEditorEvent('node:updated', changed),
    editor.onEditorEvent('node:deleted', changed),
    editor.onEditorEvent('graph:replaced', changed),
    editor.onEditorEvent('history:changed', changed)
  ]

  function documentCountsTime(): boolean {
    for (const node of editor.graph.nodes.values()) {
      for (const shader of readShaderPaints(node)) {
        if (isShaderSourcePaint(shader) && sourceCountsTime(shader.source)) return true
      }
    }
    return false
  }

  function tick(now: number) {
    frame = 0
    if (!editor.renderer) return
    if (scanDue && now - lastScan >= SCAN_INTERVAL_MS) {
      lastScan = now
      scanDue = false
      needsRepaint = animationsEnabled.value && documentCountsTime()
    }
    if (!needsRepaint) return
    editor.requestRepaint()
    frame = requestAnimationFrame(tick)
  }

  function wake() {
    if (!editor.renderer || frame !== 0) return
    frame = requestAnimationFrame(tick)
  }

  const stopMotion = watch(animationsEnabled, () => {
    scanDue = true
    lastScan = 0
    wake()
  })
  if (editor.renderer) wake()

  return {
    /** Repaints once more after an edit asked for one, without waiting for the next scan. */
    wake,
    dispose() {
      for (const unsubscribe of unsubscribes) unsubscribe()
      stopMotion()
      if (frame !== 0) cancelAnimationFrame(frame)
      frame = 0
    }
  }
}
