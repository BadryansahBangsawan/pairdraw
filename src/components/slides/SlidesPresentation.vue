<script setup lang="ts">
import { useIdle } from '@vueuse/core'
import { tv } from 'tailwind-variants'
import { computed, onMounted, onUnmounted, useTemplateRef } from 'vue'

import { useSlidesMessages } from '@open-pencil/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { restorePresentationOrigin } from '@/app/slides/focus'
import { usePresentationStage } from '@/app/slides/stage'
import EditorCanvas from '@/components/EditorCanvas.vue'
import theme from '@/theme/slides/stage'

import SlidesPresentationControls from './SlidesPresentationControls.vue'

/** How long the pointer rests before the controls fade, in milliseconds. */
const CONTROLS_IDLE_MS = 2500
/** The key that leaves the presentation, as keyboards label it. */
const EXIT_SHORTCUT = 'Esc'

/**
 * The page's slides presented over the whole window: the canvas shows one slide, the rest
 * blacked out, with the presentation's controls floating at the bottom.
 */
const store = useEditorStore()
const stage = useTemplateRef<HTMLElement>('stage')
const { presentation, letterbox, step } = usePresentationStage(store, stage)
const { idle } = useIdle(CONTROLS_IDLE_MS, {
  events: ['mousemove', 'pointerdown', 'touchstart', 'focusin']
})
const messages = useSlidesMessages()
const styles = tv(theme)()
// The control that started the presentation is gone with the editor, so the stage takes focus,
// and gives it back to that control's successor once the editor returns.
onMounted(() => stage.value?.focus({ preventScroll: true }))
onUnmounted(() => restorePresentationOrigin(store))
const slideName = computed(() => {
  const shown = presentation.value
  return shown ? (store.graph.getNode(shown.slideId)?.name ?? '') : ''
})
</script>

<template>
  <section
    ref="stage"
    data-test-id="presentation-stage"
    tabindex="-1"
    :aria-label="messages.presentation"
    :class="styles.root()"
  >
    <div :class="styles.canvas()">
      <EditorCanvas />
      <div
        v-for="(rect, index) in letterbox"
        :key="index"
        data-test-id="presentation-letterbox"
        aria-hidden="true"
        :class="styles.letterbox()"
        :style="{
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`
        }"
      />
      <SlidesPresentationControls
        v-if="presentation"
        :index="presentation.index"
        :count="presentation.count"
        :scale="presentation.scale"
        :idle="idle"
        :exit-shortcut="EXIT_SHORTCUT"
        @previous="step('previous', 0)"
        @next="step('next', 0)"
        @scale="store.setPresentationScale($event)"
        @exit="store.stopPresentation()"
      />
    </div>
    <p v-if="presentation" aria-live="polite" :class="styles.status()">
      {{ messages.slideLabel({ number: presentation.index + 1, name: slideName }) }}
    </p>
  </section>
</template>
