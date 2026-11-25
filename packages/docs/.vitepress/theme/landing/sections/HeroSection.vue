<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import IconDownload from '~icons/lucide/download'
import IconPause from '~icons/lucide/pause'
import IconPlay from '~icons/lucide/play'
import IconSparkles from '~icons/lucide/sparkles'
import IconGithub from '~icons/simple-icons/github'

import { LINKS } from '../content/links'
import { useLandingMessages, useLocalePath } from '../content/messages'
import { AGENT, HUMAN } from '../content/people'
import type { VisitorSystem } from '../download/visitor'
import HeroLayers from '../hero/HeroLayers.vue'
import HeroSelection from '../hero/HeroSelection.vue'
import HeroThread from '../hero/HeroThread.vue'
import { heroScene, type HeroScene } from '../hero/storyboard'
import { useHeroLayout } from '../hero/useHeroLayout'
import { useStoryboard } from '../hero/useStoryboard'
import CanvasCursor from '../ui/CanvasCursor.vue'
import LandingButton from '../ui/LandingButton.vue'
import { useDownloadLabel } from '../ui/useDownloadLabel'
import { useSceneActivity } from '../ui/useSceneActivity'

/**
 * The page opens on a frame of the canvas with its copy already written: the agent draws the
 * headline's box and answers the person's comment on it. The heading is the layer the agent
 * edits; screen readers and search read it whole, whatever the scene shows.
 */
const { system } = defineProps<{ system: VisitorSystem | null }>()

const messages = useLandingMessages()
const localePath = useLocalePath()
const downloadLabel = useDownloadLabel(() => system)

const frame = useTemplateRef<HTMLElement>('frame')
const headline = useTemplateRef<HTMLElement>('headline')
const comment = useTemplateRef<HTMLElement>('comment')

const paused = ref(false)
const { reduced, running } = useSceneActivity(frame)
const playing = computed(() => running.value && !paused.value)
const { step, clearing, loops } = useStoryboard(playing, reduced)
const scene = computed<HeroScene>(() => heroScene(step.value))
/** After the first loop the request has been made, and what it produced stays on the page. */
const later = computed(() => loops.value > 0)

const layout = useHeroLayout({ frame, headline, comment })

const agentAt = computed(() => layout.agent[scene.value.agent])
const humanAt = computed(() => (scene.value.human ? layout.human : layout.enter))
</script>

<template>
  <section id="top" class="hero" aria-labelledby="hero-title">
    <div class="lp-column head">
      <span class="lp-frame-title">{{ messages.hero.frame }}</span>
      <button type="button" class="pause" :aria-pressed="paused" @click="paused = !paused">
        <IconPlay v-if="paused" aria-hidden="true" />
        <IconPause v-else aria-hidden="true" />
        {{ paused ? messages.hero.play : messages.hero.pause }}
      </button>
    </div>
    <div
      ref="frame"
      class="frame lp-column"
      :data-measured="layout.measured || undefined"
      :data-clearing="clearing || undefined"
      :data-playing="playing || undefined"
    >
      <p class="kicker">{{ messages.hero.kicker }}</p>

      <div ref="headline" class="headline">
        <h1 id="hero-title" :aria-label="messages.hero.title">
          <span class="ghost">{{ messages.hero.title }}</span>
          <span class="typed" aria-hidden="true">{{ messages.hero.title }}</span>
        </h1>
        <HeroSelection
          class="selection"
          :box="scene.box"
          :width="layout.box.width"
          :height="layout.box.height"
          :label="messages.hero.measure"
        />
      </div>

      <div class="lead-slot">
        <p class="lead" :data-show="scene.lead || later || undefined">{{ messages.hero.lede }}</p>
      </div>

      <div class="actions" :data-show="scene.actions || later || undefined">
        <LandingButton
          :href="localePath(LINKS.downloadPage)"
          :icon="IconDownload"
          tone="accent"
          size="large"
          download
        >
          {{ downloadLabel }}
        </LandingButton>
        <LandingButton :href="LINKS.github" :icon="IconGithub" tone="outline" size="large">
          {{ messages.hero.github }}
        </LandingButton>
      </div>
      <p class="fine-print" :data-show="scene.actions || later || undefined">
        {{ messages.hero.finePrint }}
      </p>

      <div ref="comment" class="comment" :data-show="scene.comment || undefined" aria-hidden="true">
        <HeroThread :replied="scene.reply" />
      </div>

      <HeroLayers class="layers" :scene="scene" :later="later" />

      <div
        class="track agent"
        :data-move="scene.agent"
        :style="{ '--x': `${agentAt.x}px`, '--y': `${agentAt.y}px` }"
      >
        <div class="track-y">
          <CanvasCursor :name="AGENT" actor="agent">
            <template #icon><IconSparkles /></template>
          </CanvasCursor>
        </div>
      </div>
      <div
        class="track human"
        :data-show="scene.human || undefined"
        :style="{ '--x': `${humanAt.x}px`, '--y': `${humanAt.y}px` }"
      >
        <div class="track-y">
          <CanvasCursor :name="HUMAN" actor="human" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: 40px 0 52px;
  background-color: var(--lp-canvas);
  background-image: radial-gradient(circle at 1px 1px, var(--lp-dots) 1.2px, transparent 0);
  background-position: center top;
  background-size: 24px 24px;
}

.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.head .lp-frame-title {
  margin-bottom: 8px;
}

.pause {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--lp-muted);
  cursor: pointer;
  font-family: var(--lp-mono);
  font-size: 12px;
}

.pause:hover {
  background: rgb(21 22 26 / 0.06);
  color: var(--lp-ink);
}

.pause svg {
  width: 12px;
  height: 12px;
}

.frame {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  align-items: start;
  padding: 84px 80px 68px;
  border: 1px solid var(--lp-line);
  background: var(--lp-surface);
}

/* Everything spans the frame but the comment, which sits beside the lead and the buttons. */
.frame > * {
  grid-column: 1 / -1;
}

.frame > .lead-slot,
.frame > .actions {
  grid-column: 1;
}

.kicker {
  color: var(--lp-muted);
  font-size: 17px;
  font-weight: 500;
}

.headline {
  position: relative;
  justify-self: start;
  margin-top: 34px;
}

h1 {
  display: grid;
  max-width: 5.86em;
  font-size: clamp(48px, 10.6vw, 152px);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 0.92;
}

/* The full heading keeps the box its finished size, while the agent's typing is drawn over it. */
.ghost,
.typed {
  grid-area: 1 / 1;
}

.ghost {
  visibility: hidden;
}

.lead-slot {
  position: relative;
  margin-top: 64px;
}

.lead {
  max-width: 600px;
  color: var(--lp-muted);
  font-size: clamp(19px, 1.7vw, 24px);
  line-height: 1.42;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 22px;
}

.fine-print {
  margin-top: 20px;
  color: var(--lp-muted);
  font-size: 15px;
}

.frame > .comment {
  position: relative;
  z-index: 3;
  grid-row: 3 / span 3;
  grid-column: 2;
  width: 300px;
  margin-top: 64px;
  margin-right: -24px;
  justify-self: end;
}

.layers {
  margin-top: 59px;
}

/* What the scene has not reached yet waits out of sight, a few pixels short of its place. */
.lead,
.actions,
.fine-print,
.comment {
  visibility: hidden;
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 300ms ease-out,
    transform 450ms var(--lp-ease-out);
}

.comment {
  transform: translateY(8px) scale(0.96);
  transform-origin: 0 0;
}

:is(.lead, .actions, .fine-print, .comment)[data-show] {
  visibility: visible;
  opacity: 1;
  transform: none;
}

.fine-print[data-show] {
  transition-delay: 120ms;
}

/*
 * A cursor glides in two motions, across and down, eased differently, so it travels in a curve
 * as a hand does. While the agent drags the box, both follow the box's corner exactly.
 */
.frame > .track {
  position: absolute;
  z-index: 4;
  top: 0;
  left: 0;
  /* Placed from the frame's corner, not from a grid area. */
  grid-column: auto;
  opacity: 0;
  transform: translateX(var(--x));
  transition:
    transform 650ms cubic-bezier(0.45, 0, 0.25, 1),
    opacity 250ms;
}

.track-y {
  transform: translateY(var(--y));
  transition: transform 650ms cubic-bezier(0.3, 0.6, 0.35, 1);
}

.frame[data-measured] .track.agent,
.frame[data-measured] .track.human[data-show] {
  opacity: 1;
}

.track.agent[data-move='drawing'],
.track.agent[data-move='drawing'] .track-y {
  transition-duration: 350ms;
  transition-timing-function: cubic-bezier(0.3, 0.7, 0.4, 1);
}

.track.agent[data-move='end'],
.track.agent[data-move='end'] .track-y {
  transition-duration: 450ms;
  transition-timing-function: var(--lp-ease-out);
}

.track.human,
.track.human .track-y {
  transition-duration: 900ms;
}

/* Between loops the finished work fades, and the agent starts over. */
.frame[data-clearing] :is(.typed, .selection, .comment, .track.human) {
  opacity: 0;
  transition: opacity 450ms ease-in;
}

@media (max-width: 1023px) {
  .frame {
    grid-template-columns: minmax(0, 1fr);
    padding: 56px clamp(20px, 6vw, 56px) 40px;
  }

  .lead-slot {
    margin-top: 56px;
  }

  /* No room beside the lead, so the comment follows the buttons. */
  .frame > .comment {
    grid-row: auto;
    grid-column: 1;
    width: min(320px, 100%);
    margin-top: 40px;
    margin-right: 0;
  }

  .layers {
    margin-top: 32px;
  }
}

@media (max-width: 600px) {
  .frame {
    padding-top: 40px;
  }

  .headline {
    margin-top: 24px;
  }

  .actions :deep(a) {
    flex: 1 1 auto;
    justify-content: center;
  }
}

/* For visitors who asked for less motion, the frame shows the finished scene and holds still. */
@media (prefers-reduced-motion: reduce) {
  /* Nothing moves, so there is nothing to pause. */
  .pause {
    display: none;
  }

  .frame :is(.lead, .actions, .fine-print, .comment) {
    visibility: visible;
    opacity: 1;
    transform: none;
  }

  .frame :is(.lead, .actions, .fine-print, .comment, .track, .track-y) {
    animation: none;
    transition: none;
  }
}

/* Without scripts the scene cannot play, so the page shows its finished state. */
@media (scripting: none) {
  .frame :is(.lead, .actions, .fine-print) {
    visibility: visible;
    opacity: 1;
    transform: none;
  }

  .frame :is(.comment, .track) {
    display: none;
  }
}
</style>
