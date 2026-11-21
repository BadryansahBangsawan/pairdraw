<script setup lang="ts">
import { computed } from 'vue'

import { useLandingMessages } from '../content/messages'
import { goalFills, savedFraction } from './card-values'

/**
 * The screen the agent draws in "How it works": a savings ring and three goals. Its layers trace
 * in as `drawn` counts up, the row being drawn outlined in the agent's violet; `edited` is the
 * person's pass afterwards, which selects the ring in orange and recolors it.
 */
const { drawn, edited = false } = defineProps<{ drawn: number; edited?: boolean }>()

const messages = useLandingMessages()

/** The layer count at which each part of the card is finished. */
const AT = { title: 3, ring: 8, amount: 11, goals: [18, 24, 31] } as const
/** The bar widths and ring arc follow the catalog's amounts. */
const fills = computed(() => goalFills(messages.value.how.card.goals))
const saved = computed(() =>
  savedFraction(messages.value.how.card.amount, messages.value.how.card.saved)
)

const drawing = computed(() => AT.goals.findIndex((done) => drawn < done))
</script>

<template>
  <div class="card" aria-hidden="true">
    <span class="title" :data-shown="drawn >= AT.title || undefined">{{
      messages.how.card.title
    }}</span>
    <div class="ring-row" :data-selected="edited || undefined">
      <svg class="donut" viewBox="0 0 64 64" :data-shown="drawn >= AT.ring || undefined">
        <circle class="track" cx="32" cy="32" r="27.5" pathLength="1" />
        <circle
          class="arc"
          cx="32"
          cy="32"
          r="27.5"
          pathLength="1"
          :style="{ strokeDashoffset: drawn >= AT.ring ? 1 - saved : 1 }"
          :data-edited="edited || undefined"
        />
      </svg>
      <span class="amount" :data-shown="drawn >= AT.amount || undefined">
        <strong>{{ messages.how.card.amount }}</strong>
        <small>{{ messages.how.card.saved }}</small>
      </span>
    </div>
    <div
      v-for="(goal, index) in messages.how.card.goals"
      :key="goal.title"
      class="goal"
      :data-drawing="
        (!edited && drawing === index && drawn > (AT.goals[index - 1] ?? AT.amount)) || undefined
      "
      :data-shown="drawn >= (AT.goals[index] ?? 0) || undefined"
    >
      <span class="line">
        <span>{{ goal.title }}</span>
        <span class="value">{{ goal.detail }}</span>
      </span>
      <span class="bar"><span :style="{ transform: `scaleX(${fills[index] ?? 0})` }" /></span>
      <span class="placeholder" />
    </div>
  </div>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 248px;
  padding: 18px;
  border: 1px solid var(--lp-line);
  border-radius: 18px;
  background: var(--lp-surface);
  box-shadow: 0 10px 24px rgb(21 22 26 / 0.06);
}

/* A layer the agent has not drawn yet is a pale bar; it fills in once the layer exists. */
[data-shown] {
  --shown: 1;
}

.title,
.amount,
.goal .line,
.goal .bar {
  opacity: var(--shown, 0);
  transform: translateY(calc((1 - var(--shown, 0)) * 4px));
  transition:
    opacity 250ms ease-out,
    transform 350ms var(--lp-ease-out);
}

.title {
  font-size: 18px;
  font-weight: 800;
}

.ring-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 4px;
  margin: -4px;
  outline: 1.5px solid transparent;
  transition: outline-color 200ms;
}

.ring-row[data-selected] {
  outline-color: var(--lp-human);
}

.donut {
  width: 64px;
  height: 64px;
  transform: rotate(-90deg);
}

.donut circle {
  fill: none;
  stroke-width: 9;
}

.donut .track {
  stroke: var(--lp-raised);
}

.donut .arc {
  stroke: #e9e6fb;
  stroke-dasharray: 1;
  transition:
    stroke-dashoffset 700ms var(--lp-ease-out),
    stroke 400ms;
}

.donut .arc[data-edited] {
  stroke: var(--lp-human);
}

.amount {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.amount strong {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.1;
}

.amount small {
  color: var(--lp-muted);
  font-size: 12px;
}

.goal {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  margin: -6px;
  outline: 1.5px solid transparent;
  transition: outline-color 200ms;
}

/* The row the agent is drawing, outlined in its color, as the editor shows its edits. */
.goal[data-drawing] {
  outline-color: var(--lp-agent);
}

.line {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
}

.value {
  color: var(--lp-muted);
  font-weight: 400;
}

.bar {
  height: 6px;
  overflow: hidden;
  border-radius: 3px;
  background: var(--lp-raised);
}

.bar span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--lp-ink);
  transform-origin: 0 0;
}

.placeholder {
  position: absolute;
  inset: 6px;
  border-radius: 5px;
  background: linear-gradient(90deg, #e9e6fb 30%, #f4f2fe 50%, #e9e6fb 70%) 0 0 / 300% 100%;
  opacity: calc(1 - var(--shown, 0));
  transition: opacity 250ms;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .card * {
    transition: none !important;
  }
}
</style>
