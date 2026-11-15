<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { resolvedAppTheme } from '@/app/shell/theme'
import { activeTab } from '@/app/tabs'
import { useWindowControlsOverTopBar } from '@/app/window/controls'
import BrandMark from '@/components/brand/BrandMark.vue'
import TabBar from '@/components/TabBar.vue'
import { APP_NAME, IS_TAURI } from '@/constants'
import topBarTheme from '@/theme/top-bar'

import AppMenu from './AppMenu.vue'
import { SHELL_TOP_BAR_ACTIONS_ID } from './top-bar'

/**
 * The window's one bar: the brand, the document tabs, and the open document's actions, which its
 * workspace teleports in. The brand opens the app menus in the browser while a document is in
 * front; the desktop app has native menus, and Home has no document for them to act on.
 *
 * The desktop app has no title bar, so the bar's empty parts move the window, and a double click
 * there zooms it, as a title bar does.
 */
const topBar = tv(topBarTheme)
const windowControls = useWindowControlsOverTopBar()
const ui = computed(() => topBar({ interactive: false, windowControls: windowControls.value }))
const dragRegion = IS_TAURI ? '' : undefined
const menuTab = computed(() =>
  !IS_TAURI && activeTab.value?.kind === 'document' ? activeTab.value.id : null
)
</script>

<template>
  <header data-slot="top-bar" :data-tauri-drag-region="dragRegion" :class="ui.root()">
    <AppMenu v-if="menuTab" :key="menuTab" />
    <div v-else :data-tauri-drag-region="dragRegion" :class="ui.brand()">
      <BrandMark
        data-test-id="app-logo"
        variant="app-icon"
        :appearance="resolvedAppTheme"
        :class="ui.brandMark()"
      />
      <span aria-hidden="true" :class="ui.brandName()">{{ APP_NAME }}</span>
    </div>
    <TabBar />
    <div :data-tauri-drag-region="dragRegion" :class="ui.spacer()" />
    <div :id="SHELL_TOP_BAR_ACTIONS_ID" :class="ui.actions()" />
  </header>
</template>
