import { computed } from 'vue'
import type { ComputedRef } from 'vue'

import type { Editor } from '@pairdraw/core'
import { BUILTIN_IO_FORMATS, IORegistry, type BuiltinIOFormatId } from '@pairdraw/core/io'
import type { ExportSetting, PluginDataEntry } from '@pairdraw/scene-graph'
import {
  DEFAULT_EXPORT_QUALITY,
  EXPORT_FORMAT_IDS,
  MAX_EXPORT_QUALITY,
  MIN_EXPORT_QUALITY,
  clampExportQuality,
  type ExportFormatId
} from '@pairdraw/scene-graph/export-format'
import {
  MAX_EXPORT_SCALE,
  MIN_EXPORT_SCALE,
  clampExportScale
} from '@pairdraw/scene-graph/export-scale'
import { PAIRDRAW_PLUGIN_DATA, withPluginData } from '@pairdraw/scene-graph/plugin-data'

import { useSceneComputed } from '#vue/internal/scene-computed/use'

export const EXPORT_SCALES = [0.5, 0.75, 1, 1.5, 2, 3, 4] as const
// Persisted export-setting formats must name built-in IO adapters.
export const EXPORT_FORMATS = EXPORT_FORMAT_IDS satisfies readonly BuiltinIOFormatId[]

export interface ExportFormatOption {
  value: ExportFormatId
  label: string
}

export type ExportPanelTarget = 'selection' | 'page'

// Re-exported from core so the UI and the .fig file-format boundary share one
// definition of the export-scale bounds (see scene-graph/export-scale).
export { MIN_EXPORT_SCALE, MAX_EXPORT_SCALE, clampExportScale }
export { MIN_EXPORT_QUALITY, MAX_EXPORT_QUALITY, DEFAULT_EXPORT_QUALITY }

const io = new IORegistry(BUILTIN_IO_FORMATS)

/** Formats known by a product name rather than their extension. */
const PRODUCT_LABELS: Partial<Record<ExportFormatId, string>> = { drawio: 'draw.io' }

/** Short, extension-style labels for the node export formats (PNG, PDF, PPTX, …). */
export const EXPORT_FORMAT_OPTIONS: ExportFormatOption[] = EXPORT_FORMATS.map((id) => ({
  value: id,
  label: PRODUCT_LABELS[id] ?? (io.getFormat(id)?.extensions[0] ?? id).toUpperCase()
}))

function createDefaultExportSetting(): ExportSetting {
  return { scale: 1, format: 'png' }
}

export function formatSupportsScale(format: ExportFormatId) {
  return io.getFormat(format)?.exportOptions?.scale ?? false
}

/** Whether the format compresses with a quality, as JPG and WEBP do. */
export function formatSupportsQuality(format: ExportFormatId) {
  return io.getFormat(format)?.exportOptions?.quality ?? false
}

export function createExportTargetState(editor: Editor, selectedIds: ComputedRef<string[]>) {
  const hasSelection = computed(() => selectedIds.value.length > 0)
  const activeTarget = computed<ExportPanelTarget>(() =>
    hasSelection.value ? 'selection' : 'page'
  )
  const targetIds = useSceneComputed(() =>
    selectedIds.value.length > 0 ? selectedIds.value : [editor.state.currentPageId]
  )

  const selectedNodeName = computed(() => {
    const ids = editor.state.selectedIds
    if (ids.size === 1) {
      const id = [...ids][0]
      return editor.graph.getNode(id)?.name ?? 'Export'
    }
    if (ids.size > 1) return `${ids.size} layers`
    return null
  })

  const currentPageName = computed(() => {
    const page = editor.graph.getNode(editor.state.currentPageId)
    return page?.name ?? 'Page'
  })

  const activeName = computed(() =>
    activeTarget.value === 'selection'
      ? (selectedNodeName.value ?? 'Export')
      : currentPageName.value
  )
  const activeSettings = useSceneComputed(() => {
    const firstId = targetIds.value[0]
    return firstId ? [...(editor.graph.getNode(firstId)?.exportSettings ?? [])] : []
  })
  const mixed = useSceneComputed(() => {
    const [firstId, ...otherIds] = targetIds.value
    if (!firstId || otherIds.length === 0) return false
    const first = editor.graph.getNode(firstId)?.exportSettings ?? []
    return otherIds.some((id) => {
      const settings = editor.graph.getNode(id)?.exportSettings ?? []
      return !exportSettingsEqual(first, settings)
    })
  })

  return {
    hasSelection,
    activeTarget,
    targetIds,
    selectedNodeName,
    currentPageName,
    activeName,
    activeSettings,
    mixed
  }
}

function exportSettingsEqual(a: ExportSetting[], b: ExportSetting[]) {
  if (a.length !== b.length) return false
  return a.every((setting, index) => {
    const other = b[index]
    return (
      setting.scale === other.scale &&
      setting.format === other.format &&
      setting.quality === other.quality
    )
  })
}

function nextExportSetting(settings: ExportSetting[]): ExportSetting {
  const last = settings.at(-1)
  if (!last) return createDefaultExportSetting()
  // Each added row doubles the previous scale (1x → 2x → 4x …).
  return {
    scale: clampExportScale(last.scale * 2),
    format: last.format,
    ...(last.quality === undefined ? {} : { quality: last.quality })
  }
}

function syncExportSettingsPluginData(
  pluginData: PluginDataEntry[],
  settings: ExportSetting[]
): PluginDataEntry[] {
  return withPluginData(
    pluginData,
    PAIRDRAW_PLUGIN_DATA.exportSettings,
    settings.length > 0 ? settings : undefined
  )
}

function updateEveryTarget(
  editor: Editor,
  targetIds: ComputedRef<string[]>,
  label: string,
  update: (settings: ExportSetting[]) => ExportSetting[]
) {
  editor.undo.runBatch(label, () => {
    for (const id of targetIds.value) {
      const node = editor.graph.getNode(id)
      if (!node) continue
      const exportSettings = update(node.exportSettings)
      editor.updateNodeWithUndo(
        id,
        {
          exportSettings,
          pluginData: syncExportSettingsPluginData(node.pluginData, exportSettings)
        },
        label
      )
    }
  })
}

export function createExportSettingActions(editor: Editor, targetIds: ComputedRef<string[]>) {
  function addSetting() {
    updateEveryTarget(editor, targetIds, 'Add export setting', (settings) => [
      ...settings,
      nextExportSetting(settings)
    ])
  }

  function removeSetting(index: number) {
    updateEveryTarget(editor, targetIds, 'Remove export setting', (settings) =>
      settings.filter((_, i) => i !== index)
    )
  }

  function updateScale(index: number, scale: number) {
    updateEveryTarget(editor, targetIds, 'Update export scale', (settings) =>
      settings.map((setting, i) =>
        i === index ? { ...setting, scale: clampExportScale(scale) } : setting
      )
    )
  }

  function updateFormat(index: number, format: ExportFormatId) {
    updateEveryTarget(editor, targetIds, 'Update export format', (settings) =>
      settings.map((setting, i) => {
        if (i !== index) return setting
        // A quality only means something to the formats that compress with one.
        if (formatSupportsQuality(format)) return { ...setting, format }
        return { scale: setting.scale, format }
      })
    )
  }

  /** Sets a JPG or WEBP row's quality, from 1 to 100. */
  function updateQuality(index: number, quality: number) {
    updateEveryTarget(editor, targetIds, 'Update export quality', (settings) =>
      settings.map((setting, i) =>
        i === index ? { ...setting, quality: clampExportQuality(quality) } : setting
      )
    )
  }

  return {
    addSetting,
    removeSetting,
    updateScale,
    updateFormat,
    updateQuality,
    addSelectionSetting: addSetting,
    addPageSetting: addSetting,
    removeSelectionSetting: removeSetting,
    removePageSetting: removeSetting,
    updateSelectionScale: updateScale,
    updatePageScale: updateScale,
    updateSelectionFormat: updateFormat,
    updatePageFormat: updateFormat
  }
}
