<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot } from 'reka-ui'
import { computed, watch } from 'vue'

import { createSceneGeometry } from '@open-pencil/core/geometry'
import { useEditorMessages } from '@open-pencil/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import {
  applyTextLink,
  closeTextLinkEditor,
  followTextLink,
  removeTextLink,
  textLinkEdit,
  textLinkFocusTarget,
  textLinkValue
} from '@/app/editor/links'
import TextLinkForm from '@/components/canvas/links/TextLinkForm.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'

/**
 * The link editor of the texts the panel or the canvas menu opened it for, under the first of
 * them on the canvas, as Figma shows a text's link.
 */
const { canvas } = defineProps<{ canvas: HTMLElement | null }>()

const store = useEditorStore()
const messages = useEditorMessages()
const styles = usePopoverUI()

const edit = computed(() => {
  const current = textLinkEdit.value
  return current?.editor === store ? current : null
})
const nodeIds = computed(() => edit.value?.nodeIds ?? [])
const value = computed(() => (edit.value ? textLinkValue(store, nodeIds.value) : null))
const form = computed(() => {
  const link = value.value
  if (link === 'mixed') return { link: 'mixed', url: '', layerName: '' } as const
  if (!link) return { link: 'none', url: '', layerName: '' } as const
  if (link.type === 'URL') return { link: 'url', url: link.value, layerName: '' } as const
  const layerName = store.graph.getNode(link.value)?.name ?? ''
  return { link: 'layer', url: '', layerName } as const
})

// Read the viewport and the scene here, not in `getBoundingClientRect`, so a pan, a zoom, or an
// edit gives a new reference and Floating UI places the editor under the text again.
const reference = computed(() => {
  const [first] = nodeIds.value
  const element = canvas
  if (!first || !element) return null
  void store.state.sceneVersion
  const node = store.graph.getNode(first)
  if (!node) return null
  const bounds = createSceneGeometry(store.graph).bounds(node)
  const { zoom, panX, panY } = store.state
  const x = bounds.x * zoom + panX
  const y = bounds.y * zoom + panY
  const width = bounds.width * zoom
  const height = bounds.height * zoom
  return {
    getBoundingClientRect() {
      const area = element.getBoundingClientRect()
      return new DOMRect(area.left + x, area.top + y, width, height)
    }
  }
})

// The control that opened the editor; kept past closing, when focus goes back to it.
let opener: HTMLElement | null = null
// Closing can report the close more than once (the popover closing, then its content leaving), so
// focus goes back once per opening and a second report cannot send it on to the canvas.
let returning = false
watch(edit, (current) => {
  if (!current) return
  opener = current.opener
  returning = true
})

function returnFocus(event: Event) {
  event.preventDefault()
  if (!returning) return
  returning = false
  const target = textLinkFocusTarget(store, opener, canvas)
  opener = null
  target?.focus({ preventScroll: true })
}

// The editor closes with its texts: a new selection, another page, or the texts going away.
watch(
  () => [
    store.state.currentPageId,
    store.state.editingTextId,
    [...store.state.selectedIds].join(','),
    nodeIds.value.every((id) => store.graph.getNode(id))
  ],
  (current, previous) => {
    if (edit.value && previous && current.some((entry, index) => entry !== previous[index]))
      closeTextLinkEditor()
  }
)

function apply(url: string) {
  if (applyTextLink(store, nodeIds.value, url)) closeTextLinkEditor()
}

function remove() {
  removeTextLink(store, nodeIds.value)
  closeTextLinkEditor()
}

function open() {
  followTextLink(store, nodeIds.value)
}
</script>

<template>
  <PopoverRoot
    :open="!!edit && !!reference"
    @update:open="(open) => !open && closeTextLinkEditor()"
  >
    <PopoverPortal>
      <PopoverContent
        v-if="edit && reference"
        :reference="reference"
        side="bottom"
        align="start"
        :side-offset="6"
        :collision-padding="8"
        :aria-label="messages.textLink"
        :class="styles.content"
        @close-auto-focus="returnFocus"
      >
        <TextLinkForm
          :url="form.url"
          :link="form.link"
          :layer-name="form.layerName"
          @apply="apply"
          @remove="remove"
          @open="open"
          @cancel="closeTextLinkEditor"
        />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
