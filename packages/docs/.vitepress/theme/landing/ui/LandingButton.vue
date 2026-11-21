<script setup lang="ts">
import type { Component } from 'vue'

import { useDownloadDialog } from './download-dialog'

/**
 * The landing's buttons, which are links. `download` opens the page's download dialog and keeps
 * its link to the download page for a click that opens a new tab or a page without scripts.
 */
const {
  href,
  icon,
  tone = 'outline',
  size = 'medium',
  download = false
} = defineProps<{
  href: string
  icon?: Component
  tone?: 'accent' | 'outline' | 'line' | 'ink'
  size?: 'medium' | 'large'
  download?: boolean
}>()

const dialog = useDownloadDialog()

function onClick(event: MouseEvent): void {
  if (!download || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  if (dialog.open()) event.preventDefault()
}
</script>

<template>
  <!-- VitePress routes in-site links on its own, before this click; `vp-raw` leaves it here. -->
  <a
    class="button"
    :class="{ 'vp-raw': download }"
    :href="href"
    :data-tone="tone"
    :data-size="size"
    @click="onClick"
  >
    <component :is="icon" v-if="icon" aria-hidden="true" />
    <span><slot /></span>
  </a>
</template>

<style scoped>
.button {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--lp-ink);
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  transition:
    transform 180ms var(--lp-ease-out),
    box-shadow 180ms var(--lp-ease-out),
    background-color 150ms,
    border-color 150ms;
}

.button[data-size='large'] {
  gap: 10px;
  height: 56px;
  padding: 0 24px;
  border-radius: 12px;
  font-size: 18px;
}

.button svg {
  flex: none;
  width: 16px;
  height: 16px;
}

.button[data-size='large'] svg {
  width: 20px;
  height: 20px;
}

.button[data-tone='accent'] {
  background: var(--lp-human);
}

.button[data-tone='outline'] {
  border: 1.5px solid var(--lp-ink);
}

.button[data-tone='line'] {
  border-color: var(--lp-line);
  background: var(--lp-surface);
}

.button[data-tone='ink'] {
  background: var(--lp-ink);
  color: #fff;
}

/* A button lifts toward the pointer and gives under a press, the way a layer does on the canvas. */
@media (hover: hover) {
  .button:hover {
    box-shadow: 0 6px 16px rgb(21 22 26 / 0.14);
    transform: translateY(-1px);
  }

  .button[data-tone='line']:hover,
  .button[data-tone='outline']:hover {
    background: var(--lp-raised);
  }
}

.button:active {
  box-shadow: none;
  transform: translateY(0) scale(0.97);
  transition-duration: 80ms;
}

@media (prefers-reduced-motion: reduce) {
  .button,
  .button:hover,
  .button:active {
    transform: none;
    transition: none;
  }
}
</style>
