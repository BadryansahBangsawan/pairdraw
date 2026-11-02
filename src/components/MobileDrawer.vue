<script setup lang="ts">
import { useElementSize, useWindowSize } from '@vueuse/core'
import { motion } from 'motion-v'
import type { PanInfo } from 'motion-v'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, ref } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { useMotionTransition } from '@/app/shell/motion/transitions'
import ChatPanel from '@/components/chat/ChatPanel.vue'
import {
  DRAWER_SPRING_DAMPING,
  DRAWER_SPRING_STIFFNESS,
  HALF_FRAC,
  HUD_TOP,
  SWIPE_THRESHOLD,
  SWIPE_VELOCITY_THRESHOLD
} from '@/constants'
import drawerTheme from '@/theme/mobile/drawer'

import CodePanel from './CodePanel.vue'
import CommentsPanel from './comments/CommentsPanel.vue'
import DesignPanel from './DesignPanel.vue'
import LayerTree from './LayerTree/LayerTree.vue'
import PagesPanel from './PagesPanel.vue'

type Snap = 'closed' | 'half' | 'full'
type DrawerTab = 'layers' | 'design' | 'code' | 'ai'

const store = useEditorStore()
const { settings, panels } = useI18n()
const styles = tv(drawerTheme)()

const headerRef = ref<HTMLElement | null>(null)

const { height: headerH } = useElementSize(headerRef, { width: 0, height: 56 })
const { height: windowH } = useWindowSize()

const snap = computed({
  get: (): Snap => store.state.mobileDrawerSnap,
  set: (v: Snap) => {
    store.state.mobileDrawerSnap = v
  }
})

function getDrawerTab(): DrawerTab {
  if (store.state.activeRibbonTab === 'code') return 'code'
  if (store.state.activeRibbonTab === 'ai') return 'ai'
  return store.state.panelMode === 'design' ? 'design' : 'layers'
}

function setDrawerTab(tab: DrawerTab) {
  if (tab === 'code' || tab === 'ai') {
    store.state.activeRibbonTab = tab
    return
  }
  store.state.activeRibbonTab = 'panels'
  store.state.panelMode = tab
}

const isOpen = computed(() => snap.value !== 'closed')

function toggleTab(tab: DrawerTab) {
  if (getDrawerTab() === tab && isOpen.value) {
    snap.value = 'closed'
    targetHeight.value = snapHeight('closed')
    return
  }

  setDrawerTab(tab)
  if (!isOpen.value) {
    snap.value = 'half'
    targetHeight.value = snapHeight('half')
  }
}

function snapHeight(s: Snap): number {
  switch (s) {
    case 'full':
      return windowH.value - HUD_TOP
    case 'half':
      return Math.round(windowH.value * HALF_FRAC)
    default:
      return headerH.value
  }
}

const targetHeight = ref(snapHeight(snap.value))

function onPan(_e: PointerEvent, info: PanInfo) {
  const maxHeight = snapHeight('full')
  const raw = snapHeight(snap.value) - info.offset.y
  targetHeight.value = Math.max(headerH.value, Math.min(maxHeight, raw))
}

function onPanEnd(_e: PointerEvent, info: PanInfo) {
  const isSwipeUp = info.offset.y < -SWIPE_THRESHOLD || info.velocity.y < -SWIPE_VELOCITY_THRESHOLD
  const isSwipeDown = info.offset.y > SWIPE_THRESHOLD || info.velocity.y > SWIPE_VELOCITY_THRESHOLD

  if (isSwipeUp) {
    if (snap.value === 'closed') snap.value = 'half'
    else snap.value = 'full'
  } else if (isSwipeDown) {
    if (snap.value === 'full') snap.value = 'half'
    else snap.value = 'closed'
  }

  targetHeight.value = snapHeight(snap.value)
}

const drawerTransition = useMotionTransition({
  type: 'spring',
  stiffness: DRAWER_SPRING_STIFFNESS,
  damping: DRAWER_SPRING_DAMPING
})
</script>

<template>
  <motion.div
    data-test-id="mobile-drawer"
    :class="styles.root()"
    :animate="{ height: `${targetHeight}px` }"
    :transition="drawerTransition"
    @pan="onPan"
    @panEnd="onPanEnd"
  >
    <TabsRoot :model-value="getDrawerTab()" :class="styles.tabs()">
      <nav ref="headerRef" :aria-label="settings.mobilePanelNavigation" :class="styles.header()">
        <div :class="styles.grabber()">
          <div :class="styles.grabberBar()" />
        </div>
        <TabsList :class="styles.list()">
          <TabsTrigger
            data-test-id="mobile-ribbon-layers"
            value="layers"
            :aria-label="panels.layers"
            :class="styles.trigger()"
            @click="toggleTab('layers')"
          >
            <icon-lucide-layers :class="styles.triggerIcon()" />
          </TabsTrigger>

          <TabsTrigger
            data-test-id="mobile-ribbon-design"
            value="design"
            :aria-label="panels.design"
            :class="styles.trigger()"
            @click="toggleTab('design')"
          >
            <icon-lucide-sliders-horizontal :class="styles.triggerIcon()" />
          </TabsTrigger>

          <div :class="styles.spacer()" />

          <TabsTrigger
            data-test-id="mobile-ribbon-code"
            value="code"
            :aria-label="panels.code"
            :class="styles.trigger()"
            @click="toggleTab('code')"
          >
            <icon-lucide-code :class="styles.triggerIcon()" />
          </TabsTrigger>

          <TabsTrigger
            data-test-id="mobile-ribbon-ai"
            value="ai"
            :aria-label="panels.ai"
            :class="styles.trigger()"
            @click="toggleTab('ai')"
          >
            <icon-lucide-sparkles :class="styles.triggerIcon()" />
          </TabsTrigger>
        </TabsList>
      </nav>

      <div data-test-id="mobile-drawer-content" :class="styles.content()">
        <TabsContent value="layers" :class="styles.page()">
          <div data-test-id="mobile-drawer-layers" :class="styles.pageBody()">
            <PagesPanel />
            <div :class="styles.divider()" />
            <header :class="styles.heading()">{{ panels.layers }}</header>
            <LayerTree :class="styles.layers()" />
          </div>
        </TabsContent>

        <TabsContent value="design" :class="styles.page()">
          <div data-test-id="mobile-drawer-design" :class="styles.pageBody()">
            <!-- The Comment tool turns the properties into the comments list, as on desktop. -->
            <CommentsPanel v-if="store.state.activeTool === 'COMMENT'" />
            <DesignPanel v-else />
          </div>
        </TabsContent>

        <TabsContent value="code" :class="styles.page()">
          <div data-test-id="mobile-drawer-code" :class="styles.pageBody()">
            <CodePanel :active="isOpen && getDrawerTab() === 'code'" />
          </div>
        </TabsContent>

        <TabsContent value="ai" :class="styles.page()">
          <div data-test-id="mobile-drawer-ai" :class="styles.pageBody()">
            <ChatPanel />
          </div>
        </TabsContent>
      </div>
    </TabsRoot>
  </motion.div>
</template>
