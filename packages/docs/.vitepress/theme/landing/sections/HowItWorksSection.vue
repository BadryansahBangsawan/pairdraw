<script setup lang="ts">
import { useMotionValueEvent, useScroll } from 'motion-v'
import { computed, ref, useTemplateRef } from 'vue'
import IconArrowUp from '~icons/lucide/arrow-up'
import IconCheck from '~icons/lucide/check'
import IconLoader from '~icons/lucide/loader'
import IconSparkles from '~icons/lucide/sparkles'

import { useLandingMessages } from '../content/messages'
import { fill } from '../content/messages/fill'
import ConnectorLink from '../how/ConnectorLink.vue'
import GoalsCard from '../how/GoalsCard.vue'
import { usePrefersReducedMotion } from '../ui/useSceneActivity'

/**
 * Three frames that play as the visitor scrolls through them: the request is sent, the agent's
 * layers trace in and are counted, then the person edits the result. Scrolling back plays it
 * backwards; visitors who asked for less motion see the finished frames.
 */
const messages = useLandingMessages()

/** Layers the agent adds to draw the card. */
const TOTAL_LAYERS = 31

const steps = useTemplateRef<HTMLElement>('steps')
const reduced = usePrefersReducedMotion()
const { scrollYProgress } = useScroll({ target: steps, offset: ['start 0.8', 'end 0.6'] })

/** How far the story has played, from 0 to 1, in steps fine enough to count layers. */
const played = ref(0)
useMotionValueEvent(scrollYProgress, 'change', (progress) => {
  const next = Math.round(progress * 120) / 120
  if (next !== played.value) played.value = next
})
const progress = computed(() => (reduced.value ? 1 : played.value))

const sent = computed(() => progress.value >= 0.06)
/** Where each step starts, as a share of the story. */
const STEP_STARTS = [0, 0.3, 0.66]
const step = computed(() => STEP_STARTS.findLastIndex((start) => progress.value >= start))
const drawn = computed(() =>
  Math.round(Math.min(Math.max((progress.value - 0.3) / 0.3, 0), 1) * TOTAL_LAYERS)
)
const edited = computed(() => progress.value >= 0.72)
const props = computed(() => progress.value >= 0.78)
const toast = computed(() => progress.value >= 0.86)
</script>

<template>
  <section id="how" class="lp-section" aria-labelledby="how-title">
    <div class="lp-column">
      <div class="lp-intro">
        <h2 id="how-title" class="lp-heading">{{ messages.how.title }}</h2>
        <p class="lp-lede">{{ messages.how.lede }}</p>
      </div>

      <ol ref="steps" class="steps">
        <li class="step" :data-active="step >= 0 || undefined">
          <span class="lp-frame-title">{{ messages.how.frames[0] }}</span>
          <div class="screen ask" aria-hidden="true">
            <div class="bubble" :data-shown="sent || undefined">{{ messages.how.request }}</div>
            <span class="reading" :data-shown="sent || undefined">
              <span class="spark"><IconSparkles /></span>{{ messages.how.reading }}
            </span>
            <div class="composer">
              <span class="field">
                <span class="draft" :data-shown="!sent || undefined">{{
                  messages.how.request
                }}</span>
                <span class="placeholder" :data-shown="sent || undefined">{{
                  messages.how.placeholder
                }}</span>
              </span>
              <span class="send" :data-pressed="sent || undefined"><IconArrowUp /></span>
            </div>
          </div>
          <h3>{{ messages.how.steps[0].title }}</h3>
          <p>{{ messages.how.steps[0].detail }}</p>
        </li>

        <ConnectorLink :drawn="step >= 1" />

        <li class="step" :data-active="step >= 1 || undefined">
          <span class="lp-frame-title">{{ messages.how.frames[1] }}</span>
          <div class="screen draw" aria-hidden="true">
            <GoalsCard class="goals" :drawn="drawn" />
            <span class="progress" :data-shown="(step >= 1 && drawn < TOTAL_LAYERS) || undefined">
              <IconLoader />{{ fill(messages.how.progress, { count: drawn, total: TOTAL_LAYERS }) }}
            </span>
          </div>
          <h3>{{ messages.how.steps[1].title }}</h3>
          <p>{{ messages.how.steps[1].detail }}</p>
        </li>

        <ConnectorLink class="link-second" :drawn="step >= 2" />

        <li class="step" :data-active="step >= 2 || undefined">
          <span class="lp-frame-title">{{ messages.how.frames[2] }}</span>
          <div class="screen edit" aria-hidden="true">
            <GoalsCard class="goals" :drawn="step >= 2 ? TOTAL_LAYERS : 0" :edited="edited" />
            <div class="props" :data-shown="props || undefined">
              <strong>{{ messages.how.props.title }}</strong>
              <span
                ><span>{{ messages.how.props.ring }}</span
                >16</span
              >
              <span
                ><span>{{ messages.how.props.size }}</span
                >64</span
              >
            </div>
            <div class="toast" :data-shown="toast || undefined">
              <IconCheck />{{ fill(messages.how.toast, { count: TOTAL_LAYERS }) }}
              <strong>{{ messages.how.undo }}</strong>
            </div>
          </div>
          <h3>{{ messages.how.steps[2].title }}</h3>
          <p>{{ messages.how.steps[2].detail }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.steps {
  display: grid;
  grid-template-columns: minmax(0, 344fr) 84fr minmax(0, 344fr) 84fr minmax(0, 344fr);
  align-items: start;
  margin-top: 56px;
}

.step {
  display: flex;
  flex-direction: column;
}

/* The steps step down the canvas, as the design lays them out. */
.step:nth-child(3) {
  margin-top: 56px;
}

.step .lp-frame-title {
  transition: color 300ms;
}

.step[data-active] .lp-frame-title {
  color: var(--lp-ink);
}

.screen {
  position: relative;
  height: 360px;
  overflow: hidden;
  border: 1px solid var(--lp-line);
  background: var(--lp-raised);
}

h3 {
  margin-top: 24px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.step p {
  margin-top: 6px;
  color: var(--lp-muted);
  font-size: 16px;
  line-height: 24px;
}

/* A part of a frame arrives once the story reaches it, and leaves again on the way back. */
[data-shown] {
  --shown: 1;
}

.bubble,
.reading,
.placeholder,
.draft,
.progress,
.props,
.toast {
  opacity: var(--shown, 0);
  transition:
    opacity 250ms ease-out,
    transform 400ms var(--lp-ease-out);
}

.ask {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 14px;
  padding: 24px;
}

.bubble {
  align-self: flex-end;
  width: min(260px, 100%);
  padding: 14px;
  border: 1px solid var(--lp-line);
  border-radius: 14px;
  background: var(--lp-surface);
  font-size: 15px;
  line-height: 22px;
  transform: translateY(calc((1 - var(--shown, 0)) * 48px))
    scale(calc(0.94 + var(--shown, 0) * 0.06));
  transform-origin: 100% 100%;
}

.reading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--lp-muted);
  font-size: 14px;
}

.spark {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--lp-agent);
  color: #fff;
}

.spark svg {
  width: 11px;
  height: 11px;
}

.composer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 8px 0 16px;
  border: 1.5px solid var(--lp-human);
  border-radius: 14px;
  background: var(--lp-surface);
}

.field {
  display: grid;
  min-width: 0;
  font-size: 15px;
}

.draft,
.placeholder {
  grid-area: 1 / 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.placeholder {
  color: var(--lp-muted);
}

.send {
  display: grid;
  flex: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--lp-human);
  transition: transform 200ms var(--lp-ease-out);
}

.send[data-pressed] {
  animation: how-press 300ms var(--lp-ease-out);
}

@keyframes how-press {
  40% {
    transform: scale(0.88);
  }
}

.send svg {
  width: 18px;
  height: 18px;
}

.goals {
  position: absolute;
  top: 44px;
  left: 50%;
  transform: translateX(-50%);
}

.edit .goals {
  top: 28px;
  left: 20px;
  transform: none;
}

.progress {
  position: absolute;
  top: 22px;
  right: 18px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 20px;
  background: var(--lp-agent);
  color: #fff;
  font-family: var(--lp-mono);
  font-size: 12px;
}

.progress svg {
  width: 12px;
  height: 12px;
}

.props {
  position: absolute;
  top: 64px;
  right: 2px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 120px;
  padding: 12px;
  border-radius: 12px;
  background: var(--lp-ink);
  box-shadow: 0 8px 20px rgb(21 22 26 / 0.19);
  color: #fff;
  font-size: 12px;
  transform: translateX(calc((1 - var(--shown, 0)) * 12px));
}

.props span {
  display: flex;
  justify-content: space-between;
  font-family: var(--lp-mono);
}

.props span span {
  color: var(--lp-night-muted);
}

.toast {
  position: absolute;
  bottom: 22px;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--lp-ink);
  color: #fff;
  font-size: 13px;
  white-space: nowrap;
  transform: translate(-50%, calc((1 - var(--shown, 0)) * 16px));
}

.toast svg {
  width: 14px;
  height: 14px;
}

.toast strong {
  color: var(--lp-human);
}

.link {
  align-self: start;
  padding: 200px 10px 0;
}

.link-second {
  padding-top: 220px;
}

@media (max-width: 1023px) {
  .steps {
    grid-template-columns: minmax(0, 1fr);
    gap: 48px;
    max-width: 420px;
  }

  .step:nth-child(3) {
    margin-top: 0;
  }

  .link {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .steps * {
    animation: none !important;
    transition: none !important;
  }
}
</style>
