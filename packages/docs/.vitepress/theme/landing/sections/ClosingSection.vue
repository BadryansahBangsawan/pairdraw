<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { ref, useTemplateRef } from 'vue'
import IconDownload from '~icons/lucide/download'
import IconSparkles from '~icons/lucide/sparkles'
import IconApple from '~icons/simple-icons/apple'
import IconLinux from '~icons/simple-icons/linux'
import IconWindows from '~icons/simple-icons/windows'

import type { Vector } from '@pairdraw/scene-graph/primitives'

import { LINKS } from '../content/links'
import { useLandingMessages, useLocalePath } from '../content/messages'
import { AGENT } from '../content/people'
import { PLATFORM_NAMES } from '../download/format'
import { PLATFORMS } from '../download/releases'
import type { VisitorSystem } from '../download/visitor'
import CanvasCursor from '../ui/CanvasCursor.vue'
import LandingButton from '../ui/LandingButton.vue'
import { useDownloadLabel } from '../ui/useDownloadLabel'
import { usePrefersReducedMotion } from '../ui/useSceneActivity'

/**
 * The last frame, in the person's orange. The agent has the download button selected; the
 * visitor's own cursor is the "You" on the canvas, and follows their pointer across the frame.
 */
const { system } = defineProps<{ system: VisitorSystem | null }>()

const messages = useLandingMessages()
const localePath = useLocalePath()
const downloadLabel = useDownloadLabel(() => system)
const ICONS = { mac: IconApple, windows: IconWindows, linux: IconLinux }

const frame = useTemplateRef<HTMLElement>('frame')
const action = useTemplateRef<HTMLElement>('action')
const reduced = usePrefersReducedMotion()
/** The visitor's pointer, from the button's corner, while it is in the frame. */
const you = ref<Vector | null>(null)
let pending: Vector | null = null
let frameRequest = 0

function follow(event: PointerEvent): void {
  if (event.pointerType !== 'mouse' || reduced.value || !action.value) return
  const box = action.value.getBoundingClientRect()
  pending = { x: event.clientX - box.left + 2, y: event.clientY - box.top + 4 }
  // One update a frame, however often the pointer reports.
  frameRequest ||= requestAnimationFrame(() => {
    frameRequest = 0
    you.value = pending
  })
}

useEventListener(frame, 'pointermove', follow, { passive: true })
useEventListener(frame, 'pointerleave', () => {
  cancelAnimationFrame(frameRequest)
  frameRequest = 0
  you.value = null
})
</script>

<template>
  <section class="lp-section" aria-labelledby="closing-title">
    <div class="lp-column">
      <span class="lp-frame-title">{{ messages.closing.frame }}</span>
      <div ref="frame" class="frame" data-draw :data-following="you ? true : undefined">
        <div class="copy">
          <h2 id="closing-title">{{ messages.closing.title }}</h2>
          <div ref="action" class="action">
            <LandingButton
              :href="localePath(LINKS.downloadPage)"
              :icon="IconDownload"
              tone="ink"
              size="large"
              download
            >
              {{ downloadLabel }}
            </LandingButton>
            <span class="selection" aria-hidden="true" />
            <span class="agent" aria-hidden="true">
              <CanvasCursor :name="AGENT" actor="agent">
                <template #icon><IconSparkles /></template>
              </CanvasCursor>
            </span>
            <span
              class="you"
              aria-hidden="true"
              :style="you ? { transform: `translate(${you.x}px, ${you.y}px)` } : undefined"
            >
              <CanvasCursor :name="messages.closing.you" actor="you" />
            </span>
          </div>
        </div>
        <ul class="platforms">
          <li v-for="platform in PLATFORMS" :key="platform">
            <component :is="ICONS[platform]" class="icon" aria-hidden="true" />
            <div>
              <strong>{{ PLATFORM_NAMES[platform] }}</strong>
              <span>{{ messages.closing.platforms[platform] }}</span>
            </div>
          </li>
          <li class="updates">{{ messages.closing.updates }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.frame {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 760px) minmax(0, 248px);
  justify-content: space-between;
  gap: 48px;
  min-height: 560px;
  padding: clamp(32px, 5vw, 72px);
  overflow: hidden;
  background: var(--lp-human);
  color: var(--lp-ink);
}

.copy {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 48px;
}

h2 {
  font-size: clamp(52px, 7.8vw, 112px);
  font-weight: 800;
  letter-spacing: -0.036em;
  line-height: 0.93;
  text-wrap: balance;
}

.action {
  position: relative;
  align-self: flex-start;
}

/* The agent has the button selected, as on the canvas. */
.selection {
  position: absolute;
  inset: -6px;
  border: 1.5px solid var(--lp-agent);
  pointer-events: none;
}

.agent {
  position: absolute;
  top: calc(100% + 4px);
  left: calc(100% + 8px);
}

/*
 * The visitor's cursor rests beside the button; once their pointer is in the frame it follows
 * it, placed from the button's corner, so it moves only by transform.
 */
.you {
  position: absolute;
  top: -36px;
  left: calc(100% + 22px);
  pointer-events: none;
  transition: transform 120ms linear;
}

.frame[data-following] .you {
  top: 0;
  left: 0;
}

/* Beside the visitor's own pointer only the name shows; their system draws the arrow. */
.frame[data-following] .you :deep(.pointer) {
  visibility: hidden;
}

.platforms {
  align-self: start;
}

.platforms li {
  display: flex;
  gap: 14px;
  padding: 18px 0;
  border-bottom: 1px solid var(--lp-ink);
}

.platforms .icon {
  flex: none;
  width: 22px;
  height: 22px;
}

.platforms strong {
  display: block;
  font-size: 20px;
  font-weight: 800;
}

.platforms span {
  font-size: 15px;
}

.platforms .updates {
  border: 0;
  font-size: 14px;
  line-height: 21px;
}

@media (max-width: 1023px) {
  .frame {
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
  }

  .action {
    margin-bottom: 64px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .you {
    transition: none;
  }
}
</style>
