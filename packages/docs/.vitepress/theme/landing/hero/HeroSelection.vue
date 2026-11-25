<script setup lang="ts">
import { computed } from 'vue'

import { DRAW_FRACTION, type HeroScene } from './storyboard'

/**
 * The agent's selection around the headline: dragged out from its corner, then sized, with
 * handles and the size under it. Each edge scales along its length, so drawing the box moves
 * only transforms and the lines stay one stroke wide.
 */
const { box, width, height, label } = defineProps<{
  box: HeroScene['box']
  width: number
  height: number
  label: string
}>()

const edges = computed(() => {
  const fraction = { drawing: DRAW_FRACTION, sized: 1 }[box]
  return {
    top: `scaleX(${fraction})`,
    left: `scaleY(${fraction})`,
    bottom: `translateY(${height * fraction}px) scaleX(${fraction})`,
    right: `translateX(${width * fraction}px) scaleY(${fraction})`
  }
})

const HANDLES = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'] as const
</script>

<template>
  <div class="selection" :data-box="box" aria-hidden="true">
    <span class="edge top" :style="{ transform: edges.top }" />
    <span class="edge left" :style="{ transform: edges.left }" />
    <span class="edge bottom" :style="{ transform: edges.bottom }" />
    <span class="edge right" :style="{ transform: edges.right }" />
    <span v-for="handle in HANDLES" :key="handle" class="handle" :data-at="handle" />
    <span class="measure">{{ label }}</span>
  </div>
</template>

<style scoped>
.selection {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.edge {
  position: absolute;
  top: 0;
  left: 0;
  background: var(--lp-agent);
  transform-origin: 0 0;
  transition:
    transform 450ms var(--lp-ease-out),
    opacity 200ms;
}

/* The drag keeps pace with the agent's cursor, which takes the same time and curve. */
.selection[data-box='drawing'] .edge {
  transition-duration: 350ms;
  transition-timing-function: cubic-bezier(0.3, 0.7, 0.4, 1);
}

.edge.top,
.edge.bottom {
  width: 100%;
  height: 1.5px;
}

.edge.left,
.edge.right {
  width: 1.5px;
  height: 100%;
}

.handle {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 1.5px solid var(--lp-agent);
  background: #fff;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.4);
  transition:
    opacity 200ms,
    transform 300ms var(--lp-ease-out);
}

.handle[data-at^='n'] {
  top: 0;
}

.handle[data-at='w'],
.handle[data-at='e'] {
  top: 50%;
}

.handle[data-at^='s'] {
  top: 100%;
}

.handle[data-at$='w'] {
  left: 0;
}

.handle[data-at='n'],
.handle[data-at='s'] {
  left: 50%;
}

.handle[data-at$='e'] {
  left: 100%;
}

.measure {
  position: absolute;
  top: calc(100% + 14px);
  left: 50%;
  padding: 4px 8px;
  border-radius: 5px;
  background: var(--lp-agent);
  color: #fff;
  font-family: var(--lp-mono);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  transform: translate(-50%, -4px);
  transition:
    opacity 200ms,
    transform 300ms var(--lp-ease-out);
}

/* Handles and the size arrive once the box has its size, as the editor shows a selection. */
.selection[data-box='sized'] .handle {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
  transition-delay: 250ms;
}

.selection[data-box='sized'] .measure {
  opacity: 1;
  transform: translate(-50%, 0);
  transition-delay: 300ms;
}

@media (max-width: 600px) {
  .measure {
    font-size: 11px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .selection * {
    transition: none !important;
  }
}
</style>
