<script setup lang="ts">
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, ref } from 'vue'

import { useI18n, useSlidesMessages } from '@pairdraw/vue/i18n'
import { vTestId } from '@pairdraw/vue/testing'

import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'
import sidePanelTheme from '@/theme/panel/side'
import splitterTheme from '@/theme/splitter'

import AssetsPanel from './assets-panel/AssetsPanel.vue'
import LayerTree from './LayerTree/LayerTree.vue'
import PagesPanel from './PagesPanel.vue'
import SlidesPanel from './slides/SlidesPanel.vue'

const { panels } = useI18n()
const slidesMessages = useSlidesMessages()
const PANEL_VIEWS = ['file', 'assets', 'slides'] as const
type PanelView = (typeof PANEL_VIEWS)[number]
const PANEL_TAB_TEST_IDS: Readonly<Partial<Record<string, string>>> = {
  file: 'left-panel-layers-tab',
  assets: 'left-panel-assets-tab',
  slides: 'left-panel-slides-tab'
}
const activePanel = ref<PanelView>('file')
const panelModel = computed({
  get: () => activePanel.value,
  set: (value: string) => {
    const view = PANEL_VIEWS.find((candidate) => candidate === value)
    if (view) activePanel.value = view
  }
})
const panelOptions = computed(() => [
  { value: 'file', label: panels.value.layers },
  { value: 'assets', label: panels.value.assets },
  { value: 'slides', label: slidesMessages.value.title }
])
const panelTabsUI = { root: 'w-full' }
const splitterStyles = tv(splitterTheme)({ direction: 'vertical' })
const sideStyles = tv(sidePanelTheme)()
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
          <span v-test-id="PANEL_TAB_TEST_IDS[option.value]" class="truncate">
            {{ option.label }}
          </span>
        </template>
      </SegmentedControl>
    </div>
    <AssetsPanel v-if="activePanel === 'assets'" />
    <SlidesPanel v-else-if="activePanel === 'slides'" />
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
