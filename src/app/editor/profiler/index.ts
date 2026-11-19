import type { Editor } from '@pairdraw/core'

import { activeCanvasElement } from '@/app/editor/canvas/focus'

export function createProfilerActions(editor: Editor) {
  function viewportScreenCenter() {
    const canvas = activeCanvasElement()
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  }

  function viewportCanvasCenter() {
    return editor.viewportCanvasCenter()
  }

  function toggleProfiler() {
    const visible = !(editor.renderer?.profiler.hudVisible ?? false)
    for (const renderer of editor.canvasRenderers) {
      renderer.profiler.setVisible(visible)
    }
    editor.requestRepaint()
  }

  return { viewportScreenCenter, viewportCanvasCenter, toggleProfiler }
}
