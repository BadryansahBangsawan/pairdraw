<script setup lang="ts">
import { computed, onMounted, onUnmounted, useTemplateRef, watch } from 'vue'

import { useI18n } from '@pairdraw/vue/i18n'

import { turnEdits } from '@/app/ai/reply/turns'
import {
  clearTurnRenders,
  freeTurnRenders,
  readTurnRenders
} from '@/app/ai/tools/changes/turn-store'
import { chatTurnRendersTheme } from '@/components/chat/ui'

import ChatTurnFrame from './ChatTurnFrame.vue'

/**
 * The frames a reply changed, rendered once at its end. Images live only while the card does:
 * unmounting it, or undoing the whole turn, frees them.
 */
const { messageId } = defineProps<{ messageId: string }>()
const emit = defineEmits<{ reveal: [frameId: string] }>()
const { ai } = useI18n()
const ui = chatTurnRendersTheme()

const record = computed(() => readTurnRenders(messageId))
const turn = computed(() => turnEdits(messageId))
const partlyUndone = computed(() => {
  const edits = turn.value
  return edits !== null && edits.undone > 0 && edits.undone < edits.count
})
const more = computed(() => {
  const renders = record.value
  return renders ? Math.max(0, renders.changed - renders.frames.length) : 0
})

/** How far outside the viewport a card keeps its images, and for how long. */
const AWAY_MARGIN_PX = 2000
const AWAY_FREE_MS = 10_000

const root = useTemplateRef<HTMLElement>('root')
let observer: IntersectionObserver | undefined
let awayTimer: ReturnType<typeof setTimeout> | undefined

function stopAwayTimer(): void {
  if (awayTimer === undefined) return
  clearTimeout(awayTimer)
  awayTimer = undefined
}

onMounted(observeCard)

function observeCard(): void {
  observer?.disconnect()
  observer = undefined
  stopAwayTimer()
  const element = root.value
  if (!element) return
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (!entry) return
      if (entry.isIntersecting) {
        stopAwayTimer()
        return
      }
      awayTimer ??= setTimeout(() => {
        awayTimer = undefined
        clearTurnRenders(messageId)
      }, AWAY_FREE_MS)
    },
    { rootMargin: `${AWAY_MARGIN_PX}px` }
  )
  observer.observe(element)
}

// The card mounts only once its record exists, so the element appears after this component does.
watch(root, observeCard, { flush: 'post' })

onUnmounted(() => {
  stopAwayTimer()
  observer?.disconnect()
  freeTurnRenders(messageId)
})
</script>

<template>
  <section
    v-if="record && record.frames.length > 0"
    ref="root"
    :class="ui.root()"
    :aria-label="ai.turnRendersTitle"
    data-slot="chat-turn-renders"
  >
    <h3 :class="ui.title()">{{ ai.turnRendersTitle }}</h3>
    <div v-if="record.status === 'ready'" :class="ui.grid()">
      <ChatTurnFrame
        v-for="frame in record.frames"
        :key="frame.frameId"
        :frame="frame"
        @reveal="emit('reveal', frame.frameId)"
      />
    </div>
    <p v-else-if="record.status === 'rendering'" :class="ui.note()" role="status">
      {{ ai.turnRendersRendering }}
    </p>
    <p v-else-if="record.status === 'cleared'" :class="ui.note()">
      {{ ai.turnRendersCleared }} · {{ ai.turnRendersCount({ count: record.changed }) }}
    </p>
    <p v-else :class="ui.note()">{{ ai.turnRendersUnavailable }}</p>
    <p v-if="more > 0" :class="ui.note()">{{ ai.turnRendersMore({ count: more }) }}</p>
    <p v-if="partlyUndone" :class="ui.note()">
      {{ ai.turnPartlyUndone({ undone: turn?.undone ?? 0, total: turn?.count ?? 0 }) }}
    </p>
  </section>
</template>
