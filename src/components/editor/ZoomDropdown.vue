<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from 'reka-ui'
import { tv } from 'tailwind-variants'
import { nextTick, ref, watch } from 'vue'

import { animateViewport } from '@pairdraw/vue/canvas'
import { useEditorCommands } from '@pairdraw/vue/editor/commands'
import { useI18n } from '@pairdraw/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { toggleRemoteCursors } from '@/app/presence/cursor-motion'
import {
  setCommentsOnCanvas,
  setDesignIssuesOnCanvas,
  setSnappingPreference,
  togglePixelGrid
} from '@/app/settings/preferences/apply'
import { appPreferences } from '@/app/settings/preferences/store'
import { appMenuShortcutLabel } from '@/app/shell/menu/shortcut'
import AppShortcutText from '@/components/ui/menu/AppShortcutText.vue'
import { menuItem, useMenuUI } from '@/components/ui/menu/menu'
import MenuScrollArea from '@/components/ui/menu/MenuScrollArea.vue'
import { DESIGN_ISSUES_ON_CANVAS_INCLUDED } from '@/constants'
import zoomDropdownTheme from '@/theme/zoom-dropdown'

const store = useEditorStore()
const { getCommand } = useEditorCommands()
const { menu: menuText, commands, panels } = useI18n()

const open = ref(false)
const editing = ref(false)
const inputRef = ref<HTMLInputElement | null>()
const inputValue = ref('')

const zoom = tv(zoomDropdownTheme)()
const menuCls = useMenuUI({ content: 'min-w-52' })
const itemCls = menuItem({ justify: 'start', class: 'relative pl-7' })

function zoomPercent() {
  return Math.round(store.state.zoom * 100)
}

function startEditing() {
  editing.value = true
  inputValue.value = String(zoomPercent())
  void nextTick(() => inputRef.value?.select())
}

function commitInput() {
  const parsed = Number.parseInt(inputValue.value, 10)
  if (!Number.isNaN(parsed) && parsed > 0) {
    zoomToLevel(parsed / 100)
  }
  editing.value = false
}

function cancelInput() {
  editing.value = false
}

function toggleRulers() {
  store.state.showRulers = !store.state.showRulers
  store.requestRepaint()
}

/** Glides to a zoom level, keeping the view's center. */
function zoomToLevel(level: number) {
  animateViewport(store, () => store.zoomToLevel(level))
}

function zoomIn() {
  const center = store.viewportScreenCenter()
  animateViewport(store, () => store.applyZoom(-100, center.x, center.y))
}

function zoomOut() {
  const center = store.viewportScreenCenter()
  animateViewport(store, () => store.applyZoom(100, center.x, center.y))
}

const ZOOM_PRESETS = [
  { level: 0.5, label: () => commands.value.zoomTo50 },
  {
    level: 1,
    label: () => commands.value.zoomTo100,
    shortcut: appMenuShortcutLabel('view.zoom100')
  },
  { level: 2, label: () => commands.value.zoomTo200 }
]

function isActivePreset(level: number) {
  return Math.abs(store.state.zoom - level) < 0.005
}

watch(open, (v) => {
  if (!v) editing.value = false
})
</script>

<template>
  <DropdownMenuRoot v-model:open="open">
    <DropdownMenuTrigger as-child>
      <button type="button" data-test-id="zoom-dropdown-trigger" :class="zoom.trigger()">
        {{ zoomPercent() }}%
        <icon-lucide-chevron-down :class="zoom.chevron()" aria-hidden="true" />
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent
        side="bottom"
        :side-offset="4"
        align="end"
        :class="menuCls.content"
        @escape-key-down="cancelInput"
      >
        <MenuScrollArea>
          <div class="px-1 py-1">
            <input
              v-if="editing"
              ref="inputRef"
              v-model="inputValue"
              data-test-id="zoom-input"
              :class="zoom.input()"
              @blur="commitInput"
              @keydown.enter="commitInput"
              @keydown.escape.stop="cancelInput"
            />
            <button
              v-else
              data-test-id="zoom-input-trigger"
              :class="zoom.inputTrigger()"
              @click="startEditing"
            >
              {{ zoomPercent() }}%
            </button>
          </div>

          <DropdownMenuSeparator :class="menuCls.separator" />

          <DropdownMenuItem :class="itemCls" @select="zoomIn">
            <span class="flex-1">{{ menuText.zoomIn }}</span>
            <AppShortcutText>{{ appMenuShortcutLabel('zoom-in') }}</AppShortcutText>
          </DropdownMenuItem>
          <DropdownMenuItem :class="itemCls" @select="zoomOut">
            <span class="flex-1">{{ menuText.zoomOut }}</span>
            <AppShortcutText>{{ appMenuShortcutLabel('zoom-out') }}</AppShortcutText>
          </DropdownMenuItem>
          <DropdownMenuItem :class="itemCls" @select="getCommand('view.zoomFit').run()">
            <span class="flex-1">{{ commands.zoomToFit }}</span>
            <AppShortcutText>{{ appMenuShortcutLabel('view.zoomFit') }}</AppShortcutText>
          </DropdownMenuItem>
          <DropdownMenuItem
            v-for="preset in ZOOM_PRESETS"
            :key="preset.level"
            :class="itemCls"
            @select="zoomToLevel(preset.level)"
          >
            <icon-lucide-check
              v-if="isActivePreset(preset.level)"
              class="absolute left-2 size-3.5"
            />
            <span class="flex-1">{{ preset.label() }}</span>
            <AppShortcutText v-if="preset.shortcut">{{ preset.shortcut }}</AppShortcutText>
          </DropdownMenuItem>

          <DropdownMenuSeparator :class="menuCls.separator" />

          <DropdownMenuItem :class="itemCls" @select.prevent="togglePixelGrid(store)">
            <icon-lucide-check
              v-if="store.state.showPixelGrid !== false"
              class="absolute left-2 size-3.5"
            />
            <span class="flex-1">{{ menuText.pixelGrid }}</span>
            <AppShortcutText>{{ appMenuShortcutLabel('view-pixel-grid') }}</AppShortcutText>
          </DropdownMenuItem>
          <DropdownMenuItem
            :class="itemCls"
            @select.prevent="
              setSnappingPreference('pixelGrid', !store.state.snappingPreferences.pixelGrid)
            "
          >
            <icon-lucide-check
              v-if="store.state.snappingPreferences.pixelGrid"
              class="absolute left-2 size-3.5"
            />
            <span class="flex-1">{{ menuText.snapToPixelGrid }}</span>
            <AppShortcutText>{{ appMenuShortcutLabel('snap-pixel-grid') }}</AppShortcutText>
          </DropdownMenuItem>
          <DropdownMenuItem :class="itemCls" @select.prevent="toggleRulers">
            <icon-lucide-check v-if="store.state.showRulers" class="absolute left-2 size-3.5" />
            <span class="flex-1">{{ panels.rulers }}</span>
            <AppShortcutText>{{ appMenuShortcutLabel('view-rulers') }}</AppShortcutText>
          </DropdownMenuItem>
          <DropdownMenuItem :class="itemCls" @select.prevent="toggleRemoteCursors(store)">
            <icon-lucide-check
              v-if="store.state.showRemoteCursors"
              class="absolute left-2 size-3.5"
            />
            <span class="flex-1">{{ panels.multiplayerCursors }}</span>
            <AppShortcutText>{{
              appMenuShortcutLabel('view-multiplayer-cursors')
            }}</AppShortcutText>
          </DropdownMenuItem>
          <DropdownMenuItem
            v-if="DESIGN_ISSUES_ON_CANVAS_INCLUDED"
            :class="itemCls"
            @select.prevent="setDesignIssuesOnCanvas(!appPreferences.designCheck.showOnCanvas)"
          >
            <icon-lucide-check
              v-if="appPreferences.designCheck.showOnCanvas"
              class="absolute left-2 size-3.5"
            />
            <span class="flex-1">{{ menuText.designIssues }}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            :class="itemCls"
            @select.prevent="setCommentsOnCanvas(!appPreferences.comments.showOnCanvas)"
          >
            <icon-lucide-check
              v-if="appPreferences.comments.showOnCanvas"
              class="absolute left-2 size-3.5"
            />
            <span class="flex-1">{{ menuText.comments }}</span>
            <AppShortcutText>{{ appMenuShortcutLabel('view-comments') }}</AppShortcutText>
          </DropdownMenuItem>
        </MenuScrollArea>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
