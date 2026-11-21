<script setup lang="ts">
import { useLandingMessages } from '../content/messages'
import { AGENT, HUMAN } from '../content/people'
import PersonBadge from './PersonBadge.vue'

/** The person's comment on the headline, and the agent's reply sliding out under it. */
const { replied } = defineProps<{ replied: boolean }>()

const messages = useLandingMessages()
</script>

<template>
  <div class="thread">
    <div class="note" :data-replied="replied || undefined">
      <PersonBadge :name="HUMAN" actor="human" :when="messages.hero.now" />
      <p>{{ messages.hero.comment }}</p>
    </div>
    <div class="reply" :data-show="replied || undefined">
      <PersonBadge :name="AGENT" actor="agent" />
      <p>{{ messages.hero.reply }}</p>
    </div>
  </div>
</template>

<style scoped>
.note,
.reply {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border: 1px solid var(--lp-line);
  background: var(--lp-surface);
  font-size: 15px;
  line-height: 22px;
}

.note {
  position: relative;
  z-index: 1;
  border-radius: 14px;
  box-shadow: 0 12px 32px rgb(21 22 26 / 0.08);
  transition: border-radius 200ms;
}

.note[data-replied] {
  border-radius: 14px 14px 0 0;
}

.reply {
  margin-top: -1px;
  border-radius: 0 0 14px 14px;
  background: var(--lp-agent-soft);
  box-shadow: 0 12px 32px rgb(21 22 26 / 0.08);
  opacity: 0;
  transform: translateY(-14px);
  transition:
    opacity 250ms ease-out 80ms,
    transform 450ms var(--lp-ease-out) 80ms;
}

.reply[data-show] {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .note,
  .reply {
    transition: none;
  }
}
</style>
