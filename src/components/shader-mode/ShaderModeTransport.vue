<script setup lang="ts">
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, onBeforeUnmount } from 'vue'

import { useShaderMessages } from '@pairdraw/vue/i18n'

import { formatShaderTime } from '@/app/editor/shader-mode/time'
import IconButton from '@/components/ui/button/IconButton.vue'
import theme from '@/theme/shader-mode/transport'

/** How finely the scrubber moves through the loop, in seconds. */
const SCRUB_STEP_SECONDS = 0.01

/**
 * Shader Mode's transport: play or pause, back to the start, and a scrubber across the
 * animation's loop that jumps to any phase of it. `scrub` says when a drag on the scrubber
 * starts and ends, so the clock can hold still under it.
 */
const {
  playing,
  time,
  duration,
  disabled = false
} = defineProps<{
  playing: boolean
  /** Seconds into the loop. */
  time: number
  /** The loop's length in seconds. */
  duration: number
  /** Whether the shader cannot play, so there is nothing to control. */
  disabled?: boolean
}>()
const emit = defineEmits<{
  toggle: []
  restart: []
  seek: [time: number]
  scrub: [active: boolean]
}>()
const messages = useShaderMessages()
const styles = tv(theme)()

const value = computed({
  get: () => [time],
  set: (values: number[] | undefined) => {
    const [next] = values ?? []
    if (next !== undefined) emit('seek', next)
  }
})
/**
 * A scrub lasts as long as the pointer is down on the scrubber. Its end is the pointer's, not a
 * value commit, which a press that moves nothing never sends.
 */
let scrubbing = false
function startScrub() {
  if (disabled || scrubbing) return
  scrubbing = true
  emit('scrub', true)
}
function endScrub() {
  if (!scrubbing) return
  scrubbing = false
  emit('scrub', false)
}
onBeforeUnmount(endScrub)

const timeText = computed(() => formatShaderTime(time))
const position = computed(() =>
  messages.value.position({ time: timeText.value, duration: formatShaderTime(duration) })
)
</script>

<template>
  <div role="group" :aria-label="messages.phase" :class="styles.root()">
    <IconButton
      :label="playing ? messages.pause : messages.play"
      size="sm"
      :disabled="disabled"
      data-test-id="shader-mode-play"
      @click="emit('toggle')"
    >
      <icon-lucide-pause v-if="playing" class="size-4" />
      <icon-lucide-play v-else class="size-4" />
    </IconButton>
    <IconButton
      :label="messages.restart"
      size="sm"
      :disabled="disabled"
      data-test-id="shader-mode-restart"
      @click="emit('restart')"
    >
      <icon-lucide-skip-back class="size-4" />
    </IconButton>
    <SliderRoot
      v-model="value"
      :min="0"
      :max="duration"
      :step="SCRUB_STEP_SECONDS"
      :disabled="disabled"
      :class="styles.slider()"
      data-test-id="shader-mode-phase"
      @pointerdown="startScrub"
      @pointerup="endScrub"
      @pointercancel="endScrub"
      @lostpointercapture="endScrub"
    >
      <SliderTrack :class="styles.track()">
        <SliderRange :class="styles.range()" />
      </SliderTrack>
      <SliderThumb
        :aria-label="messages.phase"
        :aria-valuetext="position"
        :class="styles.thumb()"
      />
    </SliderRoot>
    <span aria-hidden="true" :class="styles.time()">{{ timeText }}</span>
  </div>
</template>
