import type { SplitterPanel } from 'reka-ui'
import { watch, type ComponentPublicInstance, type Ref, type ShallowRef } from 'vue'

import {
  EDITOR_PANEL_LIMITS,
  loadEditorLayout,
  saveEditorLayout,
  type EditorLayout,
  type EditorSidePanel
} from '@/app/shell/layout-storage'

type PanelRef = Readonly<ShallowRef<InstanceType<typeof SplitterPanel> | null>>

const SIDE_PANELS: readonly EditorSidePanel[] = ['layers', 'chat']
/** How far apart two widths, in pixels, still count as one; the splitter rounds sizes finer. */
const WIDTH_TOLERANCE = 0.5

/**
 * The widths of the editor's side panels and the chat column beside them, and which of them are
 * open. The splitter lays out in percent; the side panels are sized in pixels, so they keep their
 * width when the window changes and the canvas takes the difference. A closed panel collapses to
 * nothing and reopens as wide as it was.
 */
export function useEditorWorkspaceLayout(options: {
  /** The splitter group, which reports the panels' sizes on every change. */
  group: Readonly<ShallowRef<ComponentPublicInstance | null>>
  layers: PanelRef
  canvas: PanelRef
  chat: PanelRef
  layersOpen: Ref<boolean>
  chatOpen: Ref<boolean>
}) {
  /**
   * The widths the panels have. The splitter opens with them, also when showing the panels again
   * remounts it, so its opening report matches and only a resize differs.
   */
  const layout: EditorLayout = loadEditorLayout()
  /** Set while a panel opens or closes, whose steps pass through layouts not to keep. */
  let adjusting = false
  const openState: Record<EditorSidePanel, Ref<boolean>> = {
    layers: options.layersOpen,
    chat: options.chatOpen
  }

  /** The width to keep for a panel the splitter reports at `size`; a closed one keeps its last. */
  function keptWidth(panel: EditorSidePanel, size: number): number {
    return size >= EDITOR_PANEL_LIMITS[panel].min - WIDTH_TOLERANCE ? size : layout[panel]
  }

  /** Saves the widths the panels were resized to: layers and the chat column, in pixels. */
  function saveResizedLayout(sizes: number[]) {
    if (adjusting || sizes.length !== 3) return
    const [layers, , chat] = sizes
    const next: EditorLayout = {
      layers: keptWidth('layers', layers),
      chat: keptWidth('chat', chat)
    }
    const changed = SIDE_PANELS.some(
      (panel) => Math.abs(next[panel] - layout[panel]) >= WIDTH_TOLERANCE
    )
    if (!changed) return
    Object.assign(layout, next)
    saveEditorLayout(next)
  }

  /**
   * Dragging a panel shut, or open again, is the same as its toggle. The splitter also reports
   * the in-between states of opening or closing another panel, which are not the person's.
   */
  function setPanelOpen(panel: EditorSidePanel, open: boolean) {
    if (!adjusting) openState[panel].value = open
  }

  function adjust(change: () => void) {
    adjusting = true
    try {
      change()
    } finally {
      adjusting = false
    }
  }

  /** Opens or closes the layers panel; the canvas beside it takes or gives the width. */
  function applyLayersPanel(open: boolean) {
    const layers = options.layers.value
    if (!layers || layers.isCollapsed !== open) return
    adjust(() => {
      if (open) layers.resize(layout.layers)
      else layers.collapse()
    })
  }

  /** Opens or closes the chat column; the canvas beside it takes or gives the width. */
  function applyChatColumn(open: boolean) {
    const chat = options.chat.value
    if (!chat || chat.isCollapsed !== open) return
    adjust(() => {
      if (open) chat.resize(layout.chat)
      else chat.collapse()
    })
  }

  watch(options.layersOpen, applyLayersPanel, { flush: 'post' })
  watch(options.chatOpen, applyChatColumn, { flush: 'post' })

  return { layout, saveResizedLayout, setPanelOpen }
}
