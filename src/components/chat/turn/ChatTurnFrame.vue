<script setup lang="ts">
import { useObjectUrl } from '@vueuse/core'
import { computed } from 'vue'

import { useI18n } from '@pairdraw/vue/i18n'

import type { TurnFrameRenders } from '@/app/ai/tools/changes/turn-store'
import { chatTurnRendersTheme } from '@/components/chat/ui'

/** One changed frame: before over after at its width, and the narrower widths it reflows to. */
const { frame } = defineProps<{ frame: TurnFrameRenders }>()
const emit = defineEmits<{ reveal: [] }>()
const { ai } = useI18n()
const ui = chatTurnRendersTheme()

const beforeURL = useObjectUrl(() => frame.before ?? undefined)
const afterURL = useObjectUrl(() => frame.after ?? undefined)

// A card shows at most two narrower widths, so each has its own URL, revoked when it changes.
const firstWidth = computed(() => frame.widths[0])
const secondWidth = computed(() => frame.widths[1])
const firstWidthURL = useObjectUrl(() => firstWidth.value?.blob)
const secondWidthURL = useObjectUrl(() => secondWidth.value?.blob)
const widths = computed(() =>
  [
    { width: firstWidth.value?.width, url: firstWidthURL.value },
    { width: secondWidth.value?.width, url: secondWidthURL.value }
  ].filter((width): width is { width: number; url: string } => width.url !== undefined)
)
</script>

<template>
  <figure :class="ui.figure()">
    <figcaption :class="ui.caption()">{{ frame.name }}</figcaption>
    <button
      type="button"
      :class="ui.frame()"
      :disabled="frame.deleted"
      :aria-label="ai.showNodeOnCanvas({ name: frame.name })"
      @click="emit('reveal')"
    >
      <span class="sr-only">{{ ai.changeBefore }}</span>
      <img v-if="beforeURL" :src="beforeURL" alt="" :class="ui.image()" />
      <span v-else-if="frame.created" :class="ui.placeholder()">{{ ai.turnRenderNewFrame }}</span>
      <span :class="ui.divider()" aria-hidden="true" />
      <span class="sr-only">{{ ai.changeAfter }}</span>
      <img v-if="afterURL" :src="afterURL" alt="" :class="ui.image()" />
      <span v-else-if="frame.deleted" :class="ui.placeholder()">{{ ai.turnRenderDeleted }}</span>
    </button>
    <div v-if="widths.length > 0" :class="ui.widths()">
      <button
        v-for="width in widths"
        :key="width.width"
        type="button"
        :class="ui.width()"
        :disabled="frame.deleted"
        :aria-label="ai.turnRenderWidth({ width: width.width })"
        @click="emit('reveal')"
      >
        <img :src="width.url" alt="" :class="ui.widthImage()" />
      </button>
    </div>
  </figure>
</template>
