<script setup lang="ts">
import { useDebounceFn, useElementVisibility, useEventListener, useMediaQuery } from '@vueuse/core'
import { MotionConfig, motion, useMotionValueEvent, useScroll } from 'motion-v'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { computed, ref, useTemplateRef, watch, type Component } from 'vue'
import IconGlobe from '~icons/lucide/globe'
import IconLayoutGrid from '~icons/lucide/layout-grid'
import IconPlay from '~icons/lucide/play'
import IconSparkles from '~icons/lucide/sparkles'
import IconToggleRight from '~icons/lucide/toggle-right'

import { FEATURE_TABS, type FeatureTab } from '../content/features'
import { useLandingMessages } from '../content/messages'
import { fill } from '../content/messages/fill'
import { data as stats } from '../content/stats.data'
import AiPanel from '../features/AiPanel.vue'
import BrowserPanel from '../features/BrowserPanel.vue'
import ControlsPanel from '../features/ControlsPanel.vue'
import LayoutPanel from '../features/LayoutPanel.vue'
import PrototypesPanel from '../features/PrototypesPanel.vue'
import { useTabScene } from '../features/useTabScene'
import { useSceneActivity } from '../ui/useSceneActivity'

/**
 * The editor's features as a layers panel. On a large screen the panel stays in view while the
 * page scrolls past it, and scrolling moves through the tabs; clicking or arrowing to a tab
 * scrolls to its place. On smaller screens it is an ordinary tab list.
 */
const messages = useLandingMessages()

const ICONS: Record<FeatureTab, Component> = {
  ai: IconSparkles,
  browser: IconGlobe,
  controls: IconToggleRight,
  prototypes: IconPlay,
  layout: IconLayoutGrid
}

const active = ref<FeatureTab>('ai')
const track = useTemplateRef<HTMLElement>('track')
const panel = useTemplateRef<HTMLElement>('panel')
const { reduced, running } = useSceneActivity(panel)

// The app's components the panels mount load a screen before the section arrives, not with
// the page.
const approaching = useElementVisibility(track, { rootMargin: '100% 0px' })
const near = ref(false)
watch(approaching, (now) => (near.value ||= now))

/** Pinned while scrolling needs room for the panel beside the toolbar. */
const pinned = useMediaQuery('(min-width: 1024px) and (min-height: 760px)')
const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] })

// A click scrolls the page to its tab; until that scroll settles, the tabs it passes stay shut.
let steering = false
const settle = useDebounceFn(() => (steering = false), 160)
useEventListener('scroll', () => steering && void settle(), { passive: true })

useMotionValueEvent(scrollYProgress, 'change', (progress) => {
  if (!pinned.value || steering) return
  const index = Math.min(FEATURE_TABS.length - 1, Math.floor(progress * FEATURE_TABS.length))
  const tab = FEATURE_TABS[index]
  if (tab && tab !== active.value) active.value = tab
})

function choose(value: string | number): void {
  const tab = FEATURE_TABS.find((candidate) => candidate === value)
  if (!tab) return
  active.value = tab
  const element = track.value
  if (!pinned.value || !element) return
  // The middle of the tab's stretch of the scroll, so a small scroll does not leave it.
  const span = element.offsetHeight - window.innerHeight
  const top = element.getBoundingClientRect().top + window.scrollY
  const index = FEATURE_TABS.indexOf(tab)
  steering = true
  window.scrollTo({
    top: top + (span * (index + 0.5)) / FEATURE_TABS.length,
    behavior: reduced.value ? 'auto' : 'smooth'
  })
  void settle()
}

const isOpen = (tab: FeatureTab) => () => active.value === tab
const scenes = {
  ai: useTabScene(isOpen('ai'), running, reduced, 3, 900),
  browser: useTabScene(isOpen('browser'), running, reduced, 1, 600),
  prototypes: useTabScene(isOpen('prototypes'), running, reduced, 1, 500)
}

const detail = (tab: FeatureTab) =>
  fill(messages.value.features.tabs[tab].detail, { count: stats.mcpTools })
const tabCount = computed(() => FEATURE_TABS.length)
</script>

<template>
  <section id="features" class="lp-section" aria-labelledby="features-title">
    <div class="lp-column lp-intro">
      <h2 id="features-title" class="lp-heading">{{ messages.features.title }}</h2>
      <p class="lp-lede">{{ messages.features.lede }}</p>
    </div>

    <div ref="track" class="track" :style="{ '--tabs': tabCount }">
      <div class="sticky lp-column">
        <span class="lp-frame-title">{{ messages.features.frame }}</span>
        <MotionConfig reduced-motion="user">
          <TabsRoot
            ref="panel"
            :model-value="active"
            orientation="vertical"
            class="tabs"
            data-draw
            @update:model-value="choose"
          >
            <div class="list">
              <span class="list-title">{{ messages.features.list }}</span>
              <TabsList class="triggers" :aria-label="messages.features.list">
                <TabsTrigger v-for="tab in FEATURE_TABS" :key="tab" :value="tab" class="trigger">
                  <motion.span
                    v-if="tab === active"
                    layout-id="feature-tab"
                    class="lit"
                    :transition="{ type: 'spring', damping: 32, stiffness: 420 }"
                  />
                  <component :is="ICONS[tab]" class="icon" aria-hidden="true" />
                  <span class="name">{{ messages.features.tabs[tab].label }}</span>
                </TabsTrigger>
              </TabsList>
            </div>
            <div class="panels">
              <TabsContent v-for="tab in FEATURE_TABS" :key="tab" :value="tab" class="panel">
                <div class="demo">
                  <AiPanel v-if="tab === 'ai'" :stage="scenes.ai.value" :near="near" />
                  <BrowserPanel
                    v-else-if="tab === 'browser'"
                    :stage="scenes.browser.value"
                    :active="active === 'browser'"
                  />
                  <ControlsPanel v-else-if="tab === 'controls'" />
                  <PrototypesPanel
                    v-else-if="tab === 'prototypes'"
                    :stage="scenes.prototypes.value"
                    :active="active === 'prototypes'"
                  />
                  <LayoutPanel v-else />
                </div>
                <div class="caption">
                  <h3>{{ messages.features.tabs[tab].title }}</h3>
                  <p>{{ detail(tab) }}</p>
                </div>
              </TabsContent>
            </div>
          </TabsRoot>
        </MotionConfig>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lp-intro {
  margin-bottom: 48px;
}

/* Scrolling through this stretch moves through the tabs while the panel stays pinned. */
.track {
  height: calc(var(--tabs) * 70vh + 100vh - 140px);
}

.sticky {
  position: sticky;
  top: 96px;
}

.tabs {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  height: min(560px, 100vh - 140px);
  overflow: hidden;
  border-radius: 20px;
  background: var(--lp-night);
  color: #fff;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border-right: 1px solid var(--lp-night-line);
}

.list-title {
  color: var(--lp-night-muted);
  font-family: var(--lp-mono);
  font-size: 12px;
}

.triggers {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trigger {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 0;
  border-radius: 12px;
  background: none;
  color: var(--lp-night-muted);
  cursor: pointer;
  font-size: 17px;
  font-weight: 500;
  text-align: left;
  transition: color 200ms;
}

.trigger:hover {
  color: #fff;
}

.trigger[data-state='active'] {
  color: #fff;
  font-weight: 700;
}

.trigger:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

/* The selected layer's highlight moves between rows rather than blinking from one to the next. */
.lit {
  position: absolute;
  inset: 0;
  border: 1px solid var(--lp-agent);
  border-radius: 12px;
  background: var(--lp-night-3);
}

.icon,
.name {
  position: relative;
}

.icon {
  flex: none;
  width: 18px;
  height: 18px;
}

.trigger[data-state='active'] .icon {
  color: var(--lp-agent);
}

.panels {
  display: grid;
  min-width: 0;
}

.panel {
  display: grid;
  grid-area: 1 / 1;
  grid-template-rows: minmax(0, 1fr) auto;
  min-height: 0;
  outline: none;
}

.panel[data-state='active'] {
  animation: panel-in 380ms var(--lp-ease-out);
}

.panel[data-state='inactive'] {
  animation: panel-out 200ms ease-in forwards;
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
}

@keyframes panel-out {
  to {
    opacity: 0;
    transform: translateY(-8px);
  }
}

.demo {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 32px;
  overflow: hidden;
  background: var(--lp-night-2);
}

.caption {
  padding: 28px 36px;
  border-top: 1px solid var(--lp-night-line);
}

h3 {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.015em;
}

.caption p {
  max-width: 560px;
  margin-top: 8px;
  color: var(--lp-night-muted);
  font-size: 17px;
  line-height: 26px;
}

@media (max-width: 1023px), (max-height: 759px) {
  .track {
    height: auto;
  }

  .sticky {
    position: static;
  }

  .tabs {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
  }

  .list {
    border-right: 0;
    border-bottom: 1px solid var(--lp-night-line);
  }

  /* The layers become a row that scrolls sideways when it does not fit. */
  .triggers {
    flex-direction: row;
    margin: 0 -20px;
    padding: 0 20px 2px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .trigger {
    flex: none;
    padding: 10px 12px;
    font-size: 15px;
  }

  .demo {
    min-height: 340px;
    padding: 24px 16px;
  }

  .caption {
    padding: 20px;
  }

  h3 {
    font-size: 22px;
  }

  .caption p {
    font-size: 16px;
    line-height: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .panel[data-state] {
    animation: none;
  }
}
</style>
