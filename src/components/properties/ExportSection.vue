<script setup lang="ts">
import { tryOnScopeDispose, useObjectUrl } from '@vueuse/core'
import { computed, onActivated, onDeactivated, ref, shallowRef, watch } from 'vue'

import type { ExportSetting } from '@pairdraw/scene-graph'
import { useExport } from '@pairdraw/vue/document/export'
import { useI18n } from '@pairdraw/vue/i18n'
import { useRetainedActivity } from '@pairdraw/vue/lifecycle/retention'

import type { ExportTargetRequest } from '@/app/document/export/create'
import { htmlExportSettings } from '@/app/document/export/html'
import type { ExportOptions } from '@/app/document/export/types'
import { useEditorStore } from '@/app/editor/active-store'
import HTMLExportOptionsPopover from '@/components/export/HTMLExportOptionsPopover.vue'
import NumberField from '@/components/inputs/NumberField.vue'
import ExportScaleInput from '@/components/properties/ExportScaleInput.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import PanelItemRow from '@/components/ui/panel/PanelItemRow.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import { CHECKERBOARD_BACKGROUND } from '@/theme/paint/checkerboard'

const editorStore = useEditorStore()
const { panels } = useI18n()
const {
  activeTarget,
  activeName,
  activeSettings,
  targetIds,
  mixed,
  addSetting,
  removeSetting,
  updateScale,
  updateFormat,
  updateQuality,
  formatSupportsScale,
  formatSupportsQuality,
  minQuality,
  maxQuality,
  defaultQuality,
  formatOptions,
  scales,
  clampExportScale
} = useExport()

const previewBlob = shallowRef<Blob | null>(null)
const previewURL = useObjectUrl(previewBlob)
const showPreview = ref(false)
const exporting = ref(false)
const retainedActivity = useRetainedActivity()
let previewVersion = 0

function clearPreview() {
  previewVersion++
  previewBlob.value = null
}

onDeactivated(clearPreview)
tryOnScopeDispose(clearPreview)
onActivated(() => {
  void updatePreview()
})

const PREVIEW_WIDTH = 480

/** Several selected layers export to PDF as one file, a page each in the order selected. */
const pdfTogether = computed(() => activeTarget.value === 'selection' && targetIds.value.length > 1)
const showsPDFPages = computed(
  () => pdfTogether.value && activeSettings.value.some((setting) => setting.format === 'pdf')
)

function exportOptions(setting: ExportSetting): ExportOptions {
  return {
    scale: setting.scale,
    quality: setting.quality,
    html: setting.format === 'html' ? htmlExportSettings.value : undefined
  }
}

async function doExport() {
  exporting.value = true
  try {
    const requests: ExportTargetRequest[] = []
    const ids = targetIds.value.filter((id) => editorStore.graph.getNode(id))
    // Export exactly the rows shown in the panel (activeSettings) for every target,
    // so a multi-selection exports what the user sees rather than each node's own
    // (possibly hidden / divergent) settings.
    for (const setting of activeSettings.value) {
      const options = exportOptions(setting)
      if (setting.format === 'pdf' && pdfTogether.value && ids.length > 1) {
        requests.push({ target: { scope: 'selection', nodeIds: ids }, formatId: 'pdf', options })
        continue
      }
      for (const id of ids) {
        const target =
          activeTarget.value === 'page'
            ? ({ scope: 'page', pageId: id } as const)
            : ({ scope: 'node', nodeId: id } as const)
        requests.push({ target, formatId: setting.format, options })
      }
    }
    // A single file downloads directly; multiple files bundle into one zip.
    await editorStore.exportTargets(requests)
  } finally {
    exporting.value = false
  }
}

/** A quality being scrubbed, shown until it commits. */
const qualityDraft = ref<{ index: number; value: number } | null>(null)

function shownQuality(index: number, setting: ExportSetting): number {
  const draft = qualityDraft.value
  if (draft?.index === index) return draft.value
  return setting.quality ?? defaultQuality
}

function commitQuality(index: number, value: number) {
  qualityDraft.value = null
  updateQuality(index, value)
}

async function updatePreview() {
  const version = ++previewVersion
  if (retainedActivity?.value === false || !showPreview.value) {
    previewBlob.value = null
    return
  }

  const ids =
    activeTarget.value === 'selection'
      ? [...editorStore.state.selectedIds]
      : editorStore.graph.getChildren(editorStore.state.currentPageId).map((n) => n.id)

  if (ids.length === 0) {
    previewBlob.value = null
    return
  }

  let maxW = 0
  for (const id of ids) {
    const node = editorStore.getNode(id)
    if (node) maxW = Math.max(maxW, node.width)
  }
  const scale = maxW > 0 ? Math.min(PREVIEW_WIDTH / maxW, 2) : 1
  const data = await editorStore.renderExportImage(ids, scale, 'PNG')
  if (version !== previewVersion) return
  previewBlob.value = data ? new Blob([data], { type: 'image/png' }) : null
}

const previewKey = computed(
  () =>
    `${activeTarget.value}:${editorStore.state.sceneVersion}:${editorStore.state.currentPageId}:${[
      ...editorStore.state.selectedIds
    ]
      .sort()
      .join(',')}`
)

watch(() => showPreview.value, updatePreview, { flush: 'post' })
watch(previewKey, updatePreview, { flush: 'post' })
</script>

<template>
  <PanelSection :label="panels.export" :empty="activeSettings.length === 0">
    <template #actions>
      <IconButton :label="panels.addExport" @click="addSetting">
        <icon-lucide-plus class="size-3.5" />
      </IconButton>
    </template>
    <p v-if="mixed" class="text-[11px] text-muted">
      {{ panels.mixed }}
    </p>

    <PanelItemRow
      v-for="(setting, index) in activeSettings"
      :key="`${targetIds.join(',')}:${index}`"
      data-property="exportSettings"
      :data-index="index"
    >
      <div v-if="formatSupportsScale(setting.format)" class="w-24 shrink-0">
        <ExportScaleInput
          :model-value="setting.scale"
          :presets="scales"
          :clamp="clampExportScale"
          :label="panels.exportScale"
          data-property="export-scale"
          @update:model-value="updateScale(index, $event)"
        />
      </div>
      <AppSelect
        :model-value="setting.format"
        :options="formatOptions"
        :label="panels.exportFormat"
        :ui="{ trigger: 'w-auto min-w-0 flex-1' }"
        data-property="export-format"
        @update:model-value="updateFormat(index, $event)"
      />
      <Tip v-if="formatSupportsQuality(setting.format)" :label="panels.exportQuality">
        <NumberField
          :model-value="shownQuality(index, setting)"
          :min="minQuality"
          :max="maxQuality"
          :step="1"
          :aria-label="panels.exportQuality"
          :ui="{ root: 'w-14 shrink-0' }"
          data-property="export-quality"
          @update:model-value="qualityDraft = { index, value: $event }"
          @commit="commitQuality(index, $event)"
          @cancel="qualityDraft = null"
        />
      </Tip>
      <HTMLExportOptionsPopover v-if="setting.format === 'html'" />
      <template #rail="{ removeClass }">
        <IconButton
          :label="panels.removeExport"
          :class="[removeClass, 'shrink-0']"
          @click="removeSetting(index)"
        >
          <icon-lucide-minus class="size-3.5" />
        </IconButton>
      </template>
    </PanelItemRow>

    <p v-if="showsPDFPages" class="text-[11px] text-muted" data-test-id="export-pdf-pages">
      {{ panels.exportPDFPages }}
    </p>

    <AppButton
      v-if="activeSettings.length > 0"
      color="primary"
      variant="solid"
      data-test-id="export-button"
      class="mt-1.5 w-full"
      :disabled="exporting"
      @click="doExport"
    >
      <span class="truncate">{{ panels.export }} {{ activeName }}</span>
    </AppButton>

    <Tip v-if="activeSettings.length > 0" :label="panels.toggleExportPreview">
      <button
        data-test-id="export-preview-toggle"
        class="mt-1 flex w-full cursor-pointer items-center gap-1 rounded border-none bg-transparent px-0 py-1 text-[11px] text-muted hover:text-surface"
        @click="showPreview = !showPreview"
      >
        <icon-lucide-chevron-down v-if="showPreview" class="size-3" />
        <icon-lucide-chevron-right v-else class="size-3" />
        {{ panels.exportPreview }}
      </button>
    </Tip>

    <div v-if="showPreview && previewURL" class="mt-1 overflow-hidden rounded border border-border">
      <img :src="previewURL" :class="['block w-full', CHECKERBOARD_BACKGROUND]" />
    </div>
    <div
      v-else-if="showPreview"
      class="mt-1 rounded border border-border px-3 py-2 text-[11px] text-muted"
    >
      {{ panels.exportRenderingPreview }}
    </div>
  </PanelSection>
</template>
