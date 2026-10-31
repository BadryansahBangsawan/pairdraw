import { unrefElement } from '@vueuse/core'
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

const SIDE_PANELS: readonly EditorSidePanel[] = ['layers', 'properties', 'chat']
/** How far apart two widths, in pixels, still count as one; the splitter rounds sizes finer. */
const WIDTH_TOLERANCE = 0.5

/**
 * The widths of the editor's side panels and the chat column that opens beside the properties
 * panel. The splitter lays out in percent; the side panels are sized in pixels, so they keep their
 * width when the window changes and the canvas takes the difference.
 */
export function useEditorWorkspaceLayout(options: {
  /** The splitter group, measured to turn the properties panel's pixels into the canvas's share. */
  group: Readonly<ShallowRef<ComponentPublicInstance | null>>
  canvas: PanelRef
  properties: PanelRef
  chat: PanelRef
  chatOpen: Ref<boolean>
}) {
  /**
   * The widths the panels have. The splitter opens with them, also when showing the panels again
   * remounts it, so its opening report matches and only a resize differs.
   */
  const layout: EditorLayout = loadEditorLayout()
  /** Set while the chat column opens or closes, whose steps pass through layouts not to keep. */
  let adjusting = false

  /** Saves the widths the panels were resized to: layers, canvas (percent), properties, chat. */
  function saveResizedLayout(sizes: number[]) {
    if (adjusting || sizes.length !== 4) return
    const [layers, , properties, chat] = sizes
    const next: EditorLayout = {
      layers,
      properties,
      // A closed column has no width to keep; it reopens as wide as it was.
      chat: chat >= EDITOR_PANEL_LIMITS.chat.min - WIDTH_TOLERANCE ? chat : layout.chat
    }
    const changed = SIDE_PANELS.some(
      (panel) => Math.abs(next[panel] - layout[panel]) >= WIDTH_TOLERANCE
    )
    if (!changed) return
    Object.assign(layout, next)
    saveEditorLayout(next)
  }

  /**
   * Opens or closes the chat column with the canvas paying for it. The splitter takes a panel's
   * room from its neighbour, here the properties panel, so that gets its width back from the
   * canvas afterwards.
   */
  function applyChatColumn(open: boolean) {
    const chat = options.chat.value
    const canvas = options.canvas.value
    const properties = options.properties.value
    if (!chat || !canvas || !properties || chat.isCollapsed !== open) return
    const groupWidth = unrefElement(options.group)?.getBoundingClientRect().width
    adjusting = true
    try {
      if (open) chat.resize(layout.chat)
      else chat.collapse()
      if (groupWidth) {
        const freed = ((properties.getSize() - layout.properties) / groupWidth) * 100
        canvas.resize(canvas.getSize() + freed)
      }
    } finally {
      adjusting = false
    }
  }

  watch(options.chatOpen, applyChatColumn, { flush: 'post' })

  return { layout, saveResizedLayout }
}
