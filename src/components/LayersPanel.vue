<script setup lang="ts">
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, watch } from 'vue'

import { useI18n, useSlidesMessages } from '@pairdraw/vue/i18n'
import { vTestId } from '@pairdraw/vue/testing'

import { isVersionHistoryOpen } from '@/app/cloud/integration'
import { useEditorStore } from '@/app/editor/active-store'
import { leftPanelView, showDesignPanel, type LeftPanelView } from '@/app/shell/side-panels'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'
import sidePanelTheme from '@/theme/panel/side'
import splitterTheme from '@/theme/splitter'

import AssetsPanel from './assets-panel/AssetsPanel.vue'
import LayerTree from './LayerTree/LayerTree.vue'
import PagesPanel from './PagesPanel.vue'
import PropertiesPanel from './PropertiesPanel.vue'
import SlidesPanel from './slides/SlidesPanel.vue'

const { panels } = useI18n()
const slidesMessages = useSlidesMessages()
const PANEL_VIEWS = ['file', 'assets', 'slides', 'design'] as const
const PANEL_TAB_TEST_IDS: Readonly<Partial<Record<LeftPanelView, string>>> = {
  file: 'left-panel-layers-tab',
  assets: 'left-panel-assets-tab',
  slides: 'left-panel-slides-tab',
  design: 'left-panel-design-tab'
}
const panelModel = computed({
  get: () => leftPanelView.value,
  set: (value: string) => {
    const view = PANEL_VIEWS.find((candidate) => candidate === value)
    if (view) leftPanelView.value = view
  }
})
/** The tab the segment is, which the test ids name; the control hands back a plain string. */
function tabTestId(value: string): string | undefined {
  const view = PANEL_VIEWS.find((candidate) => candidate === value)
  return view ? PANEL_TAB_TEST_IDS[view] : undefined
}
const panelOptions = computed(() => [
  { value: 'file', label: panels.value.layers },
  { value: 'assets', label: panels.value.assets },
  { value: 'slides', label: slidesMessages.value.title },
  { value: 'design', label: panels.value.design }
])
const panelTabsUI = { root: 'w-full' }
const splitterStyles = tv(splitterTheme)({ direction: 'vertical' })
const sideStyles = tv(sidePanelTheme)()

/**
 * The comment tool and version history take over the design view, as they took over the panel
 * that used to hold it. A selection never changes the view.
 */
const store = useEditorStore()
watch(
  () => store.state.activeTool === 'COMMENT' || isVersionHistoryOpen(store),
  (needed) => {
    if (needed) showDesignPanel()
  }
)
</script>

<template>
  <aside data-test-id="layers-panel" :class="sideStyles.root()">
    <div :class="sideStyles.switcher()">
      <SegmentedControl
        v-model="panelModel"
        :options="panelOptions"
        :label="panels.leftPanelView"
        :ui="panelTabsUI"
      >
        <template #option="{ option }">
          <span v-test-id="tabTestId(option.value)" class="truncate">
            {{ option.label }}
          </span>
        </template>
      </SegmentedControl>
    </div>
    <AssetsPanel v-if="leftPanelView === 'assets'" />
    <SlidesPanel v-else-if="leftPanelView === 'slides'" />
    <PropertiesPanel v-else-if="leftPanelView === 'design'" />
    <SplitterGroup
      v-else
      direction="vertical"
      auto-save-id="layers-layout"
      class="flex-1 overflow-hidden"
    >
      <SplitterPanel
        :default-size="30"
        :min-size="10"
        :max-size="60"
        class="flex flex-col overflow-hidden"
      >
        <PagesPanel />
      </SplitterPanel>
      <SplitterResizeHandle :class="splitterStyles.handle()">
        <div :class="splitterStyles.divider()" />
      </SplitterResizeHandle>
      <SplitterPanel :default-size="70" :min-size="20" class="flex flex-col overflow-hidden">
        <header data-test-id="layers-header" :class="sideStyles.heading()">
          {{ panels.layers }}
        </header>
        <LayerTree data-test-id="layers-tree" />
      </SplitterPanel>
    </SplitterGroup>
  </aside>
</template>
