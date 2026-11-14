<script setup lang="ts">
import { computed } from 'vue'

import { useCodeMessages, usePanelMessages } from '@pairdraw/vue/i18n'

import type { HTMLExportSettings } from '@/app/document/export/types'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'

/**
 * How an HTML export is written: a whole page or a fragment, its styling, where its images go,
 * and which layer attributes it keeps.
 */
const { showStyling = true } = defineProps<{
  /** Off where the host already chooses the styling, as the Code panel does. */
  showStyling?: boolean
}>()

const settings = defineModel<HTMLExportSettings>({ required: true })

const panels = usePanelMessages()
const code = useCodeMessages()

function update(patch: Partial<HTMLExportSettings>) {
  settings.value = { ...settings.value, ...patch }
}

const scaffold = computed({
  get: () => settings.value.html === 'standalone',
  set: (on: boolean) => update({ html: on ? 'standalone' : 'fragment' })
})
const layerNames = computed({
  get: () => settings.value.layerNames,
  set: (layerNames: boolean) => update({ layerNames })
})
const layerIds = computed({
  get: () => settings.value.layerIds,
  set: (layerIds: boolean) => update({ layerIds })
})

const stylingOptions = computed(() => [
  { value: 'inline', label: code.value.stylingCSS },
  { value: 'tailwind', label: code.value.stylingTailwind }
])
const imageOptions = computed(() => [
  { value: 'inline', label: panels.value.exportHTMLImagesEmbedded },
  { value: 'external', label: panels.value.exportHTMLImagesSeparate }
])

function changeStyling(value: string) {
  if (value === 'inline' || value === 'tailwind') update({ style: value })
}

function changeImages(value: string) {
  if (value === 'inline' || value === 'external') update({ assets: value })
}
</script>

<template>
  <div class="flex flex-col gap-2.5 text-xs text-surface" data-test-id="html-export-fields">
    <div class="flex items-center justify-between gap-3">
      <span>{{ panels.exportHTMLScaffold }}</span>
      <AppSwitch
        v-model="scaffold"
        :label="panels.exportHTMLScaffold"
        data-test-id="html-export-scaffold"
      />
    </div>
    <div v-if="showStyling" class="flex items-center justify-between gap-3">
      <span>{{ code.styling }}</span>
      <SegmentedControl
        :model-value="settings.style"
        :options="stylingOptions"
        :label="code.styling"
        data-test-id="html-export-styling"
        @update:model-value="changeStyling"
      />
    </div>
    <div class="flex items-center justify-between gap-3">
      <span>{{ panels.exportHTMLImages }}</span>
      <SegmentedControl
        :model-value="settings.assets"
        :options="imageOptions"
        :label="panels.exportHTMLImages"
        data-test-id="html-export-images"
        @update:model-value="changeImages"
      />
    </div>
    <div class="flex items-center justify-between gap-3">
      <span>{{ panels.exportHTMLLayerNames }}</span>
      <AppSwitch
        v-model="layerNames"
        :label="panels.exportHTMLLayerNames"
        data-test-id="html-export-layer-names"
      />
    </div>
    <div class="flex items-center justify-between gap-3">
      <span>{{ panels.exportHTMLLayerIds }}</span>
      <AppSwitch
        v-model="layerIds"
        :label="panels.exportHTMLLayerIds"
        data-test-id="html-export-layer-ids"
      />
    </div>
  </div>
</template>
