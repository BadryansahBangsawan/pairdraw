<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, nextTick, ref, useId, useTemplateRef, type ComponentPublicInstance } from 'vue'

import { resolveEditorProfile } from '@open-pencil/core'
import { animateViewport } from '@open-pencil/vue/canvas'
import { formatShortcut } from '@open-pencil/vue/editor/commands'
import { useSlidesMessages } from '@open-pencil/vue/i18n'
import { useFlatReorderDrag } from '@open-pencil/vue/shared/drag'

import { useEditorStore } from '@/app/editor/active-store'
import { appMenuShortcut } from '@/app/shell/menu/shortcut'
import { moveSlideBy, moveSlideTo, useSlides, type SlideSummary } from '@/app/slides/list'
import { exportSlidesToPDF, exportSlidesToPPTX, startPresentation } from '@/app/slides/present'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import { EXTRA_EXPORT_FORMATS_INCLUDED } from '@/constants'
import theme from '@/theme/slides/panel'

import SlidesPanelItem from './SlidesPanelItem.vue'
import SlidesPanelThumbnail from './SlidesPanelThumbnail.vue'

/**
 * The page's slides, its visible top-level frames in layer order, as a numbered column of
 * thumbnails. Dragging a slide, or Alt with an arrow, reorders the page's layers; a click shows
 * the slide on the canvas, and Present runs the deck from the selected slide.
 */
const store = useEditorStore()
const messages = useSlidesMessages()
const styles = tv(theme)()
const slides = useSlides(store)
const hintId = useId()
const announcement = ref('')
const presentLabel = computed(() =>
  messages.value.present({ shortcut: formatShortcut(appMenuShortcut('present')) ?? '' })
)
const canReorder = computed(() => resolveEditorProfile(store.state).edits)
const list = useTemplateRef<HTMLElement>('list')

const reorder = useFlatReorderDrag<SlideSummary>({
  items: () => slides.value,
  onMove: (slideId, index) => {
    if (moveSlideTo(store, slideId, index)) announceMove(slideId)
  }
})

function dropPosition(slide: SlideSummary): 'before' | 'after' | undefined {
  if (reorder.instructionTargetId.value !== slide.id) return undefined
  const operation = reorder.instruction.value?.operation
  if (operation === 'reorder-before') return 'before'
  if (operation === 'reorder-after') return 'after'
  return undefined
}

function setupItem(value: Element | ComponentPublicInstance | null, slide: SlideSummary) {
  const element = value && '$el' in value ? value.$el : value
  reorder.setupItem(canReorder.value && element instanceof HTMLElement ? element : null, () => ({
    id: slide.id
  }))
}

/** Tells a screen reader where a moved slide landed. */
function announceMove(slideId: string) {
  const order = store.getSlides()
  const index = order.findIndex((slide) => slide.id === slideId)
  if (index === -1) return
  announcement.value = messages.value.slideMoved({ name: order[index].name, number: index + 1 })
}

async function move(slideId: string, step: 1 | -1) {
  if (!canReorder.value || !moveSlideBy(store, slideId, step)) return
  announceMove(slideId)
  // The moved slide keeps focus, so it can be moved again.
  await nextTick()
  list.value
    ?.querySelector<HTMLElement>(
      `[data-slide-id="${CSS.escape(slideId)}"] [data-test-id="slides-item-card"]`
    )
    ?.focus()
}

function show(slideId: string) {
  store.select([slideId])
  animateViewport(store, () => store.zoomToSelection())
}

function isSelected(slideId: string) {
  return store.state.selectedIds.has(slideId)
}
</script>

<template>
  <section data-test-id="slides-panel" :aria-label="messages.title" :class="styles.panel()">
    <header :class="styles.header()">
      <h2 data-test-id="slides-header" :class="styles.title()">{{ messages.title }}</h2>
      <span v-if="slides.length > 0" data-test-id="slides-count" :class="styles.count()">
        {{ slides.length }}
      </span>
      <div :class="styles.actions()">
        <IconButton
          :label="messages.exportPDF"
          :disabled="slides.length === 0"
          data-test-id="slides-export-pdf"
          @click="exportSlidesToPDF(store)"
        >
          <icon-lucide-file-down class="size-3.5" />
        </IconButton>
        <IconButton
          v-if="EXTRA_EXPORT_FORMATS_INCLUDED"
          :label="messages.exportPPTX"
          :disabled="slides.length === 0"
          data-test-id="slides-export-pptx"
          @click="exportSlidesToPPTX(store)"
        >
          <icon-lucide-file-output class="size-3.5" />
        </IconButton>
        <IconButton
          :label="presentLabel"
          :disabled="slides.length === 0"
          data-test-id="slides-present"
          @click="startPresentation(store)"
        >
          <icon-lucide-presentation class="size-3.5" />
        </IconButton>
      </div>
    </header>
    <div :class="styles.body()">
      <AppPlaceholder
        v-if="slides.length === 0"
        data-test-id="slides-empty"
        :label="messages.emptyTitle"
        :description="messages.emptyDescription"
        size="compact"
        :fill="false"
      >
        <template #icon>
          <icon-lucide-gallery-vertical-end class="size-4" />
        </template>
      </AppPlaceholder>
      <ol v-else ref="list" :aria-label="messages.listLabel" :class="styles.list()">
        <SlidesPanelItem
          v-for="(slide, index) in slides"
          :key="slide.id"
          :ref="(value) => setupItem(value, slide)"
          :data-slide-id="slide.id"
          :number="index + 1"
          :name="slide.name"
          :selected="isSelected(slide.id)"
          :dragging="reorder.draggingId.value === slide.id"
          :drop-position="dropPosition(slide)"
          :hint-id="canReorder ? hintId : undefined"
          @select="show(slide.id)"
          @present="startPresentation(store, slide.id)"
          @move="move(slide.id, $event)"
        >
          <SlidesPanelThumbnail :node-id="slide.id" alt="" />
        </SlidesPanelItem>
      </ol>
    </div>
    <p :id="hintId" :class="styles.hint()">{{ messages.reorderHint }}</p>
    <p aria-live="polite" :class="styles.hint()">{{ announcement }}</p>
  </section>
</template>
