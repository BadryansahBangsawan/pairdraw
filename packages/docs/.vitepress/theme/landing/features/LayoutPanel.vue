<script setup lang="ts">
import { motion } from 'motion-v'
import { tv } from 'tailwind-variants'
import { computed, ref } from 'vue'

import type { LayoutAlign, LayoutCounterAlign } from '@pairdraw/scene-graph'

import layoutAlignmentTheme from '@/theme/layout-alignment'

import { useLandingMessages } from '../content/messages'

/**
 * A grid frame and an alignment grid beside it, drawn with the app's alignment theme (the
 * control itself belongs to the property panel). Picking a cell moves every item within its
 * track, and the CSS the frame exports changes with it.
 */
const messages = useLandingMessages()

const POSITIONS = ['MIN', 'CENTER', 'MAX'] as const

const primary = ref<LayoutAlign>('MIN')
const counter = ref<LayoutCounterAlign>('MIN')

const cells = computed(() => {
  const { vertical, horizontal } = messages.value.features.layout
  return POSITIONS.flatMap((y, row) =>
    POSITIONS.map((x, column) => ({
      primary: x,
      counter: y,
      label: `${vertical[row]}, ${horizontal[column]}`,
      active: x === primary.value && y === counter.value
    }))
  )
})

const PLACE: Partial<Record<LayoutAlign | LayoutCounterAlign, 'start' | 'center' | 'end'>> = {
  MIN: 'start',
  CENTER: 'center',
  MAX: 'end'
}

function place(value: LayoutAlign | LayoutCounterAlign): 'start' | 'center' | 'end' {
  return PLACE[value] ?? 'start'
}

const justify = computed(() => place(primary.value))
const align = computed(() => place(counter.value))
const css = computed(() => {
  const placed = justify.value === align.value ? justify.value : `${align.value} ${justify.value}`
  return `grid-template-columns: repeat(3, 1fr); gap: 14px; place-items: ${placed};`
})

const alignment = tv(layoutAlignmentTheme)

function select(x: LayoutAlign, y: LayoutCounterAlign): void {
  primary.value = x
  counter.value = y
}

const ITEMS = 6
/** Items move to their new place within the track, with the editor's layout spring. */
const SPRING = { type: 'spring', damping: 30, stiffness: 400 } as const
</script>

<template>
  <div class="layout">
    <div class="stage">
      <div class="tracks" :style="{ justifyItems: justify, alignItems: align }" aria-hidden="true">
        <motion.span
          v-for="item in ITEMS"
          :key="item"
          class="item"
          :data-tint="item === 2 || undefined"
          layout
          :transition="SPRING"
        />
      </div>
      <div class="panel pairdraw-app">
        <span class="label">{{ messages.features.layout.alignment }}</span>
        <div
          role="group"
          :aria-label="messages.features.layout.alignment"
          :class="alignment().grid()"
        >
          <button
            v-for="cell in cells"
            :key="`${cell.primary}-${cell.counter}`"
            type="button"
            :aria-label="cell.label"
            :aria-pressed="cell.active"
            :class="alignment({ active: cell.active }).cell()"
            @click="select(cell.primary, cell.counter)"
          >
            <span :class="alignment().dot()" />
          </button>
        </div>
      </div>
    </div>
    <code>{{ css }}</code>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: min(440px, 100%);
}

.stage {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
}

.tracks {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(2, 56px);
  gap: 14px;
  padding: 12px;
  border: 1.5px solid var(--lp-human);
  border-radius: 8px;
  background: #fff4f0;
}

.item {
  width: 62%;
  height: 34px;
  border-radius: 5px;
  background: #fff;
  box-shadow: 0 1px 2px rgb(21 22 26 / 0.12);
}

.item[data-tint] {
  background: #ffc8b5;
}

.panel {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--lp-night-line);
  border-radius: 10px;
  background: var(--lp-night-3);
  font-size: 11px;
}

.label {
  color: var(--lp-night-muted);
}

code {
  max-width: 100%;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--lp-night);
  color: #fff;
  font-family: var(--lp-mono);
  font-size: 11px;
  line-height: 16px;
}
</style>
