<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, ref, watch } from 'vue'

import type { Fill, MeshGradientPoint } from '@pairdraw/scene-graph'
import { colorToDocumentCSS } from '@pairdraw/scene-graph/color'
import { isMeshFill, resampleMeshPoints } from '@pairdraw/scene-graph/gradient'
import { useI18n } from '@pairdraw/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import ColorPickerPanel from '@/components/color-picker-panel/ColorPickerPanel.vue'
import NumberField from '@/components/inputs/NumberField.vue'
import fillPickerTheme from '@/theme/fill-picker'

const { fill } = defineProps<{ fill: Fill }>()
const emit = defineEmits<{ update: [fill: Fill] }>()
const { panels } = useI18n()
const fillPicker = tv(fillPickerTheme)

const MAX_MESH_CELLS = 4

const points = computed(() => (isMeshFill(fill) ? (fill.meshPoints ?? []) : []))
const columns = computed(() => (isMeshFill(fill) ? (fill.meshColumns ?? 1) : 1))
const rows = computed(() => (isMeshFill(fill) ? (fill.meshRows ?? 1) : 1))
const activeIndex = ref(0)

watch(points, (next) => {
  if (activeIndex.value >= next.length) activeIndex.value = 0
})

const activeColor = computed(() => points.value[activeIndex.value]?.color ?? fill.color)

function pointClass(active: boolean): string {
  return fillPicker({ active }).meshPoint()
}

function updatePoints(next: MeshGradientPoint[]): void {
  emit('update', { ...fill, type: 'MESH', meshPoints: next })
}

function selectPoint(index: number): void {
  activeIndex.value = index
}

function updateActiveColor(color: MeshGradientPoint['color']): void {
  const next = points.value.map((point, index) =>
    index === activeIndex.value ? { position: { ...point.position }, color: { ...color } } : point
  )
  updatePoints(next)
}

function resize(nextColumns: number, nextRows: number): void {
  const clampedColumns = Math.min(MAX_MESH_CELLS, Math.max(1, Math.floor(nextColumns)))
  const clampedRows = Math.min(MAX_MESH_CELLS, Math.max(1, Math.floor(nextRows)))
  emit('update', {
    ...fill,
    type: 'MESH',
    meshColumns: clampedColumns,
    meshRows: clampedRows,
    meshPoints: resampleMeshPoints(
      points.value,
      columns.value,
      rows.value,
      clampedColumns,
      clampedRows
    )
  })
}

const store = useEditorStore()

function pointStyle(point: MeshGradientPoint): string {
  const color = { ...point.color, a: point.color.a * fill.opacity }
  return colorToDocumentCSS(color, store.graph.documentColorSpace)
}
</script>

<template>
  <div>
    <div class="mb-2 flex items-center gap-2">
      <span class="text-[11px] text-muted">{{ panels.meshColumns }}</span>
      <NumberField
        class="w-14 flex-none"
        :model-value="columns"
        :min="1"
        :max="MAX_MESH_CELLS"
        @update:model-value="resize(Number($event), rows)"
      />
      <span class="text-[11px] text-muted">{{ panels.meshRows }}</span>
      <NumberField
        class="w-14 flex-none"
        :model-value="rows"
        :min="1"
        :max="MAX_MESH_CELLS"
        @update:model-value="resize(columns, Number($event))"
      />
    </div>

    <div
      class="mb-2 grid gap-1 p-1"
      :style="{ gridTemplateColumns: `repeat(${columns + 1}, minmax(0, 1fr))` }"
    >
      <button
        v-for="(point, index) in points"
        :key="index"
        type="button"
        :aria-label="`${panels.meshPoint} ${index + 1}`"
        :class="pointClass(index === activeIndex)"
        :style="{ background: pointStyle(point) }"
        @click="selectPoint(index)"
      />
    </div>

    <ColorPickerPanel
      :color="activeColor"
      :color-profile="store.graph.documentColorSpace"
      @update="updateActiveColor"
    />
  </div>
</template>
