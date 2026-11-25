import { watch } from 'vue'

import type { Editor } from '@pairdraw/core'
import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import type { Rect } from '@pairdraw/scene-graph/primitives'
import {
  isShaderSourcePaint,
  parseShaderUniforms,
  shaderOfPaint,
  type ShaderSourcePaint
} from '@pairdraw/scene-graph/shaders'

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

/** What the clock reads of the editor: the document, the view, and the canvas it draws into. */
type ClockSource = Pick<Editor, 'graph' | 'state' | 'getViewportSize'>

/** Whether `node` and every layer above it are visible, as the canvas decides what to draw. */
function isShown(node: SceneNode, graph: SceneGraph): boolean {
  let current: SceneNode | undefined = node
  while (current) {
    if (!current.visible) return false
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return true
}

/** Whether any part of `bounds` is inside the view, at its pan and zoom. */
function inView(
  bounds: Rect,
  view: ClockSource['state'],
  size: { width: number; height: number }
): boolean {
  const left = bounds.x * view.zoom + view.panX
  const top = bounds.y * view.zoom + view.panY
  return (
    left < size.width &&
    left + bounds.width * view.zoom > 0 &&
    top < size.height &&
    top + bounds.height * view.zoom > 0
  )
}

/**
 * Whether the canvas must repaint for the clock: a shader the person wrote that reads `@time` is
 * on the current page, on screen, and drawn. A shader on another page, hidden, or scrolled away
 * changes nothing visible, so it costs nothing.
 */
export function repaintsForTime(source: ClockSource): boolean {
  const { graph, state } = source
  const size = source.getViewportSize()
  for (const node of graph.nodes.values()) {
    if (!graph.isDescendant(node.id, state.currentPageId)) continue
    if (!isShown(node, graph)) continue
    let timed: ShaderSourcePaint | null = null
    for (const paint of [...node.fills, ...node.strokes]) {
      if (!paint.visible) continue
      const shader = shaderOfPaint(node, paint)
      if (shader && isShaderSourcePaint(shader) && sourceCountsTime(shader.source)) {
        timed = shader
        break
      }
    }
    if (!timed) continue
    if (inView(graph.getAbsoluteBounds(node.id), state, size)) return true
  }
  return false
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
    editor.onEditorEvent('history:changed', changed),
    // Panning onto a shader that counts time starts it, and panning away stops it.
    editor.onEditorEvent('viewport:changed', changed)
  ]

  function tick(now: number) {
    frame = 0
    if (!editor.renderer) return
    if (scanDue && now - lastScan >= SCAN_INTERVAL_MS) {
      lastScan = now
      scanDue = false
      needsRepaint = animationsEnabled.value && repaintsForTime(editor)
    }
    if (!needsRepaint) return
    editor.requestRepaint()
    frame = requestAnimationFrame(tick)
  }

  function wake() {
    // Tests run the editor without a DOM, where nothing can be scheduled or drawn anyway.
    if (!editor.renderer || frame !== 0 || typeof requestAnimationFrame !== 'function') return
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
