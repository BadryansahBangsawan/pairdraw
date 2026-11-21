<script setup lang="ts">
import { ref, watch } from 'vue'

import { useLandingMessages } from '../content/messages'

/**
 * Two frames joined by a click interaction. Pressing the button plays the prototype on the
 * canvas: the frame dissolves into the one the link leads to, and Back returns.
 */
const { stage, active } = defineProps<{ stage: number; active: boolean }>()

const messages = useLandingMessages()
const screen = ref<'overview' | 'budgets'>('overview')
watch(
  () => active,
  (open) => {
    if (!open) screen.value = 'overview'
  }
)
</script>

<template>
  <div class="prototypes">
    <div class="frame playing" :data-screen="screen">
      <div class="screen overview" :inert="screen !== 'overview' || undefined">
        <strong>{{ messages.features.prototypes.overview }}</strong>
        <span class="media" />
        <span class="line" />
        <button type="button" class="action" @click="screen = 'budgets'">
          {{ messages.features.prototypes.action }}
        </button>
      </div>
      <div class="screen budgets" :inert="screen !== 'budgets' || undefined">
        <strong>{{ messages.features.prototypes.budgets }}</strong>
        <span class="media" />
        <span class="line" />
        <span class="line short" />
        <button type="button" class="back" @click="screen = 'overview'">
          {{ messages.features.prototypes.back }}
        </button>
      </div>
    </div>
    <svg class="link" viewBox="0 0 64 40" aria-hidden="true">
      <path
        pathLength="1"
        :data-drawn="stage >= 1 || undefined"
        d="M2 30C22 2 42 2 60 22M52 14L61 23L49 26"
      />
    </svg>
    <div class="frame target" aria-hidden="true" :data-arrived="screen === 'budgets' || undefined">
      <div class="screen">
        <strong>{{ messages.features.prototypes.budgets }}</strong>
        <span class="media" />
        <span class="line" />
        <span class="line short" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.prototypes {
  display: flex;
  align-items: center;
  gap: 12px;
}

.frame {
  position: relative;
  display: grid;
  width: 138px;
  height: 202px;
  overflow: hidden;
  border-radius: 10px;
  background: #fff;
  color: var(--lp-ink);
  outline: 2px solid transparent;
  outline-offset: 3px;
  transition: outline-color 300ms;
}

.screen {
  display: flex;
  flex-direction: column;
  gap: 8px;
  grid-area: 1 / 1;
  padding: 12px;
  background: #fff;
  font-size: 12px;
  transition: opacity 400ms ease-in-out;
}

/* The frames dissolve into each other, as a dissolve transition plays them. */
.playing[data-screen='overview'] .budgets,
.playing[data-screen='budgets'] .overview {
  opacity: 0;
}

.media {
  height: 48px;
  border-radius: 4px;
  background: var(--lp-raised);
}

.line {
  height: 6px;
  border-radius: 3px;
  background: var(--lp-line);
}

.line.short {
  width: 60%;
}

.action,
.back {
  height: 26px;
  margin-top: auto;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  transition: transform 150ms var(--lp-ease-out);
}

.action {
  background: var(--lp-ink);
  color: #fff;
  outline: 2px solid var(--lp-human);
  outline-offset: 1px;
}

.back {
  border: 1px solid var(--lp-line);
  background: #fff;
}

.action:active,
.back:active {
  transform: scale(0.95);
}

.target[data-arrived] {
  outline-color: var(--lp-human);
}

.link {
  width: 64px;
  flex: none;
  overflow: visible;
}

.link path {
  fill: none;
  stroke: var(--lp-human);
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.5;
  transition: stroke-dashoffset 600ms var(--lp-ease-out);
}

.link path[data-drawn] {
  stroke-dashoffset: 0;
}

@media (max-width: 480px) {
  .frame {
    width: 112px;
    height: 176px;
  }

  .link {
    width: 40px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .prototypes * {
    transition: none !important;
  }
}
</style>
