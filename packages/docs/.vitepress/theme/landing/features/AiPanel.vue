<script setup lang="ts">
import { defineClientComponent } from 'vitepress'

import { useLandingMessages } from '../content/messages'

/**
 * The agent's turn as the chat shows it, beside the screen it builds: the settings card appears
 * when `render` is done, spaces out when the layout is set, and its rows become a component.
 */
/** `near`: the section is close, so the app's cards may load; until then the page skips them. */
const { stage, near } = defineProps<{ stage: number; near: boolean }>()

const messages = useLandingMessages()

// The app's components need a browser; the server build leaves them out entirely.
const ToolCallsIsland = defineClientComponent(() =>
  import.meta.env.SSR
    ? Promise.reject(new Error('The tool calls render only in the browser'))
    : import('./ToolCallsIsland.vue')
)

const ROWS = ['alerts', 'summary', 'signIn'] as const
</script>

<template>
  <div class="ai">
    <div class="chat">
      <p>{{ messages.features.ai.prompt }}</p>
      <div class="calls"><ToolCallsIsland v-if="near" :finished="stage" /></div>
    </div>
    <div
      class="settings"
      :data-shown="stage >= 1 || undefined"
      :data-laid-out="stage >= 2 || undefined"
      aria-hidden="true"
    >
      <strong>{{ messages.features.ai.settings }}</strong>
      <span
        v-for="(row, index) in ROWS"
        :key="row"
        class="row"
        :data-component="stage >= 3 || undefined"
        :style="{ '--index': index }"
      >
        {{ messages.features.ai[row] }}
        <span class="switch" :data-on="index < 2 || undefined" />
      </span>
      <span class="sign-out">{{ messages.features.ai.signOut }}</span>
    </div>
  </div>
</template>

<style scoped>
.ai {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.chat {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(300px, 100%);
  padding: 16px;
  border: 1px solid var(--lp-night-line);
  border-radius: 14px;
  background: var(--lp-night-3);
  color: #fff;
  font-size: 14px;
  line-height: 20px;
}

/* Keeps its room while the app's cards load, so the panel does not jump. */
.calls {
  min-height: 108px;
}

.settings {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 240px;
  padding: 18px;
  border-radius: 16px;
  background: #fff;
  color: var(--lp-ink);
  font-size: 13px;
  opacity: 0;
  transform: translateY(10px) scale(0.96);
  transition:
    opacity 300ms ease-out,
    transform 500ms var(--lp-ease-out);
}

.settings[data-shown] {
  opacity: 1;
  transform: none;
}

.settings strong {
  font-size: 17px;
  font-weight: 800;
}

/* Before the layout is set the rows sit packed together; setting it spaces them out. */
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  outline: 1px dashed transparent;
  outline-offset: 3px;
  transform: translateY(calc(var(--index) * -6px));
  transition:
    transform 450ms var(--lp-ease-out),
    outline-color 250ms;
}

.settings[data-laid-out] .row {
  transform: none;
}

.row[data-component] {
  outline-color: var(--lp-agent);
}

.switch {
  position: relative;
  width: 32px;
  height: 18px;
  border-radius: 9px;
  background: var(--lp-line);
}

.switch::after {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  content: '';
}

.switch[data-on] {
  background: var(--lp-ink);
}

.switch[data-on]::after {
  transform: translateX(14px);
}

.sign-out {
  display: grid;
  place-items: center;
  height: 36px;
  border: 1px solid var(--lp-line);
  border-radius: 10px;
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .settings,
  .row {
    transition: none;
  }
}
</style>
