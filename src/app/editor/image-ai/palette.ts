import { computed } from 'vue'
import IconEraser from '~icons/lucide/eraser'
import IconImagePlus from '~icons/lucide/image-plus'
import IconPaintbrush from '~icons/lucide/paintbrush'
import IconPenTool from '~icons/lucide/pen-tool'
import IconWandSparkles from '~icons/lucide/wand-sparkles'

import { resolveEditorProfile } from '@open-pencil/core'
import { useMediaMessages } from '@open-pencil/vue/i18n'
import type {
  CommandPaletteGroup,
  CommandPaletteItem
} from '@open-pencil/vue/primitives/CommandPalette'

import { activeTab } from '@/app/tabs'

import { canEditImageBackground, canGenerateImageFill, removeImageBackground } from './action'
import { singleSelectedNode } from './apply'
import { openImageAIPrompt } from './dialog'

/** Searched for as well as the labels, in English, as the other palette entries are. */
const KEYWORDS = ['ai', 'image', 'generate', 'background']

/**
 * Palette entries for image AI on the active document: generating images and SVG anywhere, and
 * the background and fill actions while one fitting layer is selected. A document that cannot be
 * edited lists none.
 */
export function useImageAIPaletteGroup() {
  const media = useMediaMessages()

  return computed<CommandPaletteGroup | null>(() => {
    const tab = activeTab.value
    if (tab?.kind !== 'document') return null
    const store = tab.store
    if (!resolveEditorProfile(store.state).edits) return null
    // The entries follow the selection and the layers it holds.
    void store.state.selectedIds
    void store.state.sceneVersion
    const messages = media.value
    const items: CommandPaletteItem[] = [
      {
        id: 'image-ai:generate-image',
        label: messages.generateImage,
        keywords: KEYWORDS,
        icon: IconImagePlus,
        onSelect: () => openImageAIPrompt(store, 'generate-image')
      },
      {
        id: 'image-ai:generate-svg',
        label: messages.generateSVG,
        keywords: [...KEYWORDS, 'svg', 'vector'],
        icon: IconPenTool,
        onSelect: () => openImageAIPrompt(store, 'generate-svg')
      }
    ]
    if (canGenerateImageFill(store)) {
      items.push({
        id: 'image-ai:generate-fill',
        label: messages.generateImageFill,
        keywords: [...KEYWORDS, 'fill'],
        icon: IconPaintbrush,
        onSelect: () => openImageAIPrompt(store, 'generate-fill')
      })
    }
    if (canEditImageBackground(store)) {
      items.push(
        {
          id: 'image-ai:remove-background',
          label: messages.removeBackground,
          keywords: KEYWORDS,
          icon: IconEraser,
          onSelect: () => {
            const node = singleSelectedNode(store)
            if (node) void removeImageBackground(store, node.id)
          }
        },
        {
          id: 'image-ai:replace-background',
          label: messages.replaceBackground,
          keywords: KEYWORDS,
          icon: IconWandSparkles,
          onSelect: () => openImageAIPrompt(store, 'replace-background')
        }
      )
    }
    return { id: 'image-ai', label: messages.aiImage, items }
  })
}
