<script setup lang="ts">
import { ref } from 'vue'

import ShaderModeTransport from '../ShaderModeTransport.vue'

const duration = 10
const playing = ref(true)
const time = ref(2.5)
const restarts = ref(0)
/** Whether the clock played before the scrub, to play on after it, as the stage does. */
let playingBeforeScrub = false

function scrub(active: boolean) {
  if (active) {
    playingBeforeScrub = playing.value
    playing.value = false
  } else if (playingBeforeScrub) {
    playingBeforeScrub = false
    playing.value = true
  }
}

function restart() {
  time.value = 0
  restarts.value += 1
}
</script>

<template>
  <div class="flex w-[520px] flex-col gap-4">
    <div class="rounded-card border border-border bg-panel px-3.5 py-2.5">
      <ShaderModeTransport
        :playing="playing"
        :time="time"
        :duration="duration"
        @toggle="playing = !playing"
        @restart="restart"
        @seek="time = $event"
        @scrub="scrub"
      />
    </div>
    <div class="rounded-card border border-border bg-panel px-3.5 py-2.5">
      <ShaderModeTransport :playing="false" :time="0" :duration="duration" disabled />
    </div>
    <p class="text-xs text-muted">
      {{ `${playing ? 'playing' : 'paused'} at ${time.toFixed(1)}, restarts ${restarts}` }}
    </p>
  </div>
</template>
