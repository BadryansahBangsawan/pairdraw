<script setup lang="ts">
import { computed } from 'vue'
import IconFrame from '~icons/lucide/frame'
import IconMessageSquare from '~icons/lucide/message-square'
import IconType from '~icons/lucide/type'

import { useLandingMessages } from '../content/messages'
import { fill } from '../content/messages/fill'
import { AGENT, HUMAN } from '../content/people'
import type { HeroScene } from './storyboard'

/**
 * The frame's layers under it. A row waits, dimmed, until its layer exists, and the row being
 * worked on is lit in the color of whoever works on it; the light slides between rows.
 */
const { scene, later } = defineProps<{ scene: HeroScene; later: boolean }>()

const messages = useLandingMessages()

const ROWS = ['frame', 'heading', 'comment', 'lead'] as const
const active = computed(() => ROWS.indexOf(scene.active.layer))

const headingDetail = computed(() => {
  const heading = messages.value.hero.layer.heading
  const texts = { adding: heading.adding, writing: heading.writing }
  const text =
    scene.status === 'adding' || scene.status === 'writing' ? texts[scene.status] : heading.detail
  return fill(text, { agent: AGENT })
})
</script>

<template>
  <ul class="layers" :aria-label="messages.hero.layers">
    <li
      class="highlight"
      :data-actor="scene.active.actor"
      :style="{ '--at': active, '--col': active % 2, '--row': Math.floor(active / 2) }"
      aria-hidden="true"
    />
    <li>
      <span class="name"><IconFrame aria-hidden="true" />{{ messages.hero.layer.frame.name }}</span>
      <span class="detail">{{ messages.hero.layer.frame.detail }}</span>
    </li>
    <li
      :data-waiting="!scene.layers.heading || undefined"
      :data-active="active === 1 || undefined"
      :data-actor="scene.active.actor"
    >
      <span class="name"
        ><IconType aria-hidden="true" />{{ messages.hero.layer.heading.name }}</span
      >
      <span class="detail">{{ headingDetail }}</span>
    </li>
    <li
      :data-waiting="!scene.layers.comment || undefined"
      :data-active="active === 2 || undefined"
      :data-actor="scene.active.actor"
    >
      <span class="name"
        ><IconMessageSquare aria-hidden="true" />{{ messages.hero.layer.comment.name }}</span
      >
      <span class="detail">{{ fill(messages.hero.layer.comment.detail, { human: HUMAN }) }}</span>
    </li>
    <li :data-waiting="!(scene.layers.lead || later) || undefined">
      <span class="name"><IconType aria-hidden="true" />{{ messages.hero.layer.lead.name }}</span>
      <span class="detail">{{ messages.hero.layer.lead.detail }}</span>
    </li>
  </ul>
</template>

<style scoped>
.layers {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  height: 112px;
  overflow: hidden;
  border: 1px solid var(--lp-line);
  border-radius: 14px;
  background: var(--lp-raised);
}

li:not(.highlight) {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  padding: 0 24px;
  transition: opacity 300ms;
}

li[data-waiting] {
  opacity: 0.35;
}

.highlight {
  position: absolute;
  top: 0;
  left: 0;
  width: 25%;
  height: 100%;
  background: var(--lp-agent-soft);
  transform: translateX(calc(var(--at) * 100%));
  transition:
    transform 500ms var(--lp-ease-out),
    background-color 300ms;
}

.highlight[data-actor='human'] {
  background: var(--lp-human-soft);
}

.name {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  font-family: var(--lp-mono);
  font-size: 15px;
  white-space: nowrap;
}

.name svg {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--lp-muted);
}

li[data-active][data-actor='agent'] .name {
  color: var(--lp-agent-ink);
}

li[data-active] .name svg {
  color: currentColor;
}

.detail {
  overflow: hidden;
  color: var(--lp-muted);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1023px) {
  .layers {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    height: 160px;
  }

  .highlight {
    width: 50%;
    height: 50%;
    transform: translate(calc(var(--col) * 100%), calc(var(--row) * 100%));
  }

  li:not(.highlight) {
    padding: 0 16px;
  }

  .name {
    font-size: 13px;
  }

  .detail {
    font-size: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  li,
  .highlight {
    transition: none !important;
  }
}
</style>
