<script setup lang="ts">
import { ref, watch } from 'vue'
import IconCheck from '~icons/lucide/check'
import IconImport from '~icons/lucide/import'

import { useLandingMessages } from '../content/messages'

/**
 * A page in the built-in browser with one element picked. Importing turns the page into layers:
 * each block is outlined as it arrives on the canvas.
 */
const { stage, active } = defineProps<{ stage: number; active: boolean }>()

const messages = useLandingMessages()
const imported = ref(false)
// A tab opened again starts from the page as it was.
watch(
  () => active,
  (open) => {
    if (!open) imported.value = false
  }
)
</script>

<template>
  <div class="browser">
    <div class="window" :data-imported="imported || undefined" aria-hidden="true">
      <div class="chrome">
        <span class="dots"><i /><i /><i /></span>
        <span class="url">{{ messages.features.browser.url }}</span>
      </div>
      <div class="page">
        <span class="heading piece" style="--order: 0" />
        <div class="cards">
          <span class="card piece" style="--order: 1" />
          <span class="card piece picked" :data-picked="stage >= 1 || undefined" style="--order: 2">
            <i /><i />
          </span>
          <span class="card piece" style="--order: 3" />
        </div>
      </div>
    </div>
    <button
      type="button"
      class="import"
      :data-done="imported || undefined"
      @click="imported = true"
    >
      <IconCheck v-if="imported" aria-hidden="true" />
      <IconImport v-else aria-hidden="true" />
      {{ imported ? messages.features.browser.imported : messages.features.browser.import }}
    </button>
  </div>
</template>

<style scoped>
.browser {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: min(420px, 100%);
}

.window {
  width: 100%;
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
}

.chrome {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 28px;
  padding: 0 10px;
  background: var(--lp-raised);
}

.dots {
  display: flex;
  gap: 5px;
}

.dots i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--lp-line);
}

.url {
  flex: 1;
  overflow: hidden;
  padding: 2px 8px;
  border-radius: 5px;
  background: #fff;
  color: var(--lp-muted);
  font-family: var(--lp-mono);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.heading {
  width: 50%;
  height: 10px;
  border-radius: 3px;
  background: var(--lp-ink);
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 88px;
  padding: 10px;
  border-radius: 6px;
  background: var(--lp-raised);
}

.card i {
  display: block;
  height: 6px;
  border-radius: 3px;
  background: var(--lp-ink);
}

.card i + i {
  width: 70%;
  background: var(--lp-line);
}

/* The element the person points at, picked in their orange. */
.picked {
  outline: 1.5px solid transparent;
  transition:
    outline-color 250ms,
    background-color 250ms;
}

.picked[data-picked] {
  outline-color: var(--lp-human);
  background: var(--lp-human-soft);
}

/* Imported, every block of the page becomes a layer, one after another. */
.piece {
  outline-offset: 2px;
}

.window[data-imported] .piece {
  animation: browser-layer 500ms var(--lp-ease-out) both;
  animation-delay: calc(var(--order) * 90ms);
}

@keyframes browser-layer {
  from {
    outline: 1.5px solid transparent;
  }

  to {
    outline: 1.5px solid var(--lp-human);
  }
}

.import {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: var(--lp-human);
  color: var(--lp-ink);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  transition: transform 150ms var(--lp-ease-out);
}

.import:active {
  transform: scale(0.95);
}

.import[data-done] {
  cursor: default;
}

.import svg {
  width: 14px;
  height: 14px;
}

@media (prefers-reduced-motion: reduce) {
  .window[data-imported] .piece {
    animation-duration: 0s;
    animation-delay: 0s;
  }

  .picked,
  .import {
    transition: none;
  }
}
</style>
