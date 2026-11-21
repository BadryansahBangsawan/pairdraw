<script setup lang="ts">
import {
  SliderRange,
  SliderRoot,
  SliderThumb,
  SliderTrack,
  SwitchRoot,
  SwitchThumb,
  ToggleGroupItem,
  ToggleGroupRoot
} from 'reka-ui'
import { computed, ref, useId } from 'vue'

import { useLandingMessages } from '../content/messages'

/**
 * A component with Reka UI behaviours, as the editor previews it: tabs, a slider, and switches
 * that work with the pointer and the keyboard, here as on the canvas.
 */
const messages = useLandingMessages()

const PERIODS = ['monthly', 'yearly'] as const
type Period = (typeof PERIODS)[number]

const period = ref<Period>('monthly')
const limit = ref([820])
const roundUp = ref(true)
const notify = ref(false)
const amount = computed(() => `$${limit.value[0] ?? 0}`)
const id = useId()

function choosePeriod(value: unknown): void {
  const chosen = PERIODS.find((option) => option === value)
  if (chosen) period.value = chosen
}
</script>

<template>
  <div class="controls">
    <ToggleGroupRoot
      :model-value="period"
      type="single"
      class="period"
      :aria-label="messages.features.controls.period"
      @update:model-value="choosePeriod"
    >
      <ToggleGroupItem v-for="option in PERIODS" :key="option" :value="option" class="option">
        {{ messages.features.controls[option] }}
      </ToggleGroupItem>
    </ToggleGroupRoot>

    <div class="field">
      <span :id="`${id}-limit`">{{ messages.features.controls.limit }}</span>
      <output :for="`${id}-slider`">{{ amount }}</output>
    </div>
    <SliderRoot
      :id="`${id}-slider`"
      v-model="limit"
      class="slider"
      :min="0"
      :max="1600"
      :step="20"
      :aria-labelledby="`${id}-limit`"
    >
      <SliderTrack class="track"><SliderRange class="range" /></SliderTrack>
      <SliderThumb class="thumb" :aria-label="messages.features.controls.limit" />
    </SliderRoot>

    <label class="field">
      {{ messages.features.controls.roundUp }}
      <SwitchRoot v-model="roundUp" class="switch"><SwitchThumb class="knob" /></SwitchRoot>
    </label>
    <label class="field">
      {{ messages.features.controls.notify }}
      <SwitchRoot v-model="notify" class="switch"><SwitchThumb class="knob" /></SwitchRoot>
    </label>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: min(276px, 100%);
  padding: 12px 12px 20px;
  border: 1px solid var(--lp-night-line);
  border-radius: 14px;
  background: var(--lp-night-3);
  color: #fff;
  font-size: 13px;
}

.period {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px;
  border-radius: 9px;
  background: var(--lp-night);
}

.option {
  height: 28px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--lp-night-muted);
  cursor: pointer;
  font-weight: 600;
  transition:
    background-color 200ms,
    color 200ms;
}

.option[data-state='on'] {
  background: #fff;
  color: var(--lp-ink);
}

.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  cursor: default;
}

output {
  font-family: var(--lp-mono);
}

.slider {
  position: relative;
  display: flex;
  align-items: center;
  height: 20px;
  margin: -8px 12px 0;
  touch-action: none;
}

.track {
  position: relative;
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: var(--lp-night-line);
}

.range {
  position: absolute;
  height: 100%;
  border-radius: 2px;
  background: var(--lp-human);
}

.thumb {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.4);
  cursor: grab;
  transition: transform 150ms var(--lp-ease-out);
}

.thumb:active {
  transform: scale(1.15);
}

.switch {
  position: relative;
  width: 30px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: var(--lp-night-line);
  cursor: pointer;
  transition: background-color 200ms;
}

.switch[data-state='checked'] {
  background: var(--lp-human);
}

.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform 250ms var(--lp-ease-out);
}

.knob[data-state='checked'] {
  transform: translateX(12px);
}

.controls :focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .controls * {
    transition: none !important;
  }
}
</style>
