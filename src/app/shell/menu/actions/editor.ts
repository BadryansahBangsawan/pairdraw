import type { SceneNode } from '@pairdraw/scene-graph'

import { insertScriptNode } from '@/app/code/script/create'
import { getActiveEditorStore, useEditorStore } from '@/app/editor/active-store'
import { openFindLayers } from '@/app/editor/layers/find'
import { openTextLinkEditor } from '@/app/editor/links'
import { openPlaceImageDialog } from '@/app/editor/place/dialog'
import { openVariablesDialog } from '@/app/editor/tokens/dialog'
import { openGoodies } from '@/app/goodies/actions'
import { toggleRemoteCursors } from '@/app/presence/cursor-motion'
import {
  setCommentsOnCanvas,
  setSnappingPreference,
  togglePixelGrid
} from '@/app/settings/preferences/apply'
import { appPreferences } from '@/app/settings/preferences/store'
import { onCanvasSelection } from '@/app/shell/commands/focused'
import { removeSelectionAutoLayout } from '@/app/shell/keyboard/auto-layout'
import { exportFramesToPDF } from '@/app/shell/menu/actions/pdf'
import { togglePresentation } from '@/app/slides/present'

type TextFormatUpdates = {
  fontWeight?: number
  italic?: boolean
  textDecoration?: 'NONE' | 'UNDERLINE'
}

const store = useEditorStore()

function alignSelected(axis: 'horizontal' | 'vertical', align: 'min' | 'center' | 'max'): void {
  store.alignNodes([...store.state.selectedIds], axis, align)
}

function updateSelectedText(updates: TextFormatUpdates): void {
  for (const node of store.selectedNodes.value) {
    if (node.type === 'TEXT') store.updateNodeWithUndo(node.id, updates, 'Format text')
  }
}

function selectedTextNode(): SceneNode | undefined {
  return store.selectedNodes.value.find((item) => item.type === 'TEXT')
}

function toggleSelectedTextBold(): void {
  const node = selectedTextNode()
  updateSelectedText({
    fontWeight: node && node.fontWeight >= 700 ? 400 : 700
  })
}

function toggleSelectedTextItalic(): void {
  const node = selectedTextNode()
  updateSelectedText({ italic: node ? !node.italic : true })
}

function toggleSelectedTextUnderline(): void {
  const node = selectedTextNode()
  updateSelectedText({
    textDecoration: node?.textDecoration === 'UNDERLINE' ? 'NONE' : 'UNDERLINE'
  })
}

export function createSharedEditorMenuActions(
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
) {
  return {
    'zoom-in': () => {
      const middle = store.viewportCanvasCenter()
      store.applyZoom(-100, middle.x, middle.y)
    },
    'zoom-out': () => {
      const middle = store.viewportCanvasCenter()
      store.applyZoom(100, middle.x, middle.y)
    },
    'view-split-right': () => store.splitPane(store.activePaneId.value, 'horizontal'),
    'view-split-down': () => store.splitPane(store.activePaneId.value, 'vertical'),
    'view-rulers': () => {
      store.state.showRulers = !store.state.showRulers
      store.requestRepaint()
    },
    'view-pixel-grid': () => togglePixelGrid(store),
    'view-multiplayer-cursors': () => toggleRemoteCursors(store),
    'view-comments': () => setCommentsOnCanvas(!appPreferences.value.comments.showOnCanvas),
    'snap-geometry': () =>
      setSnappingPreference('geometry', !store.state.snappingPreferences.geometry),
    'snap-objects': () =>
      setSnappingPreference('objects', !store.state.snappingPreferences.objects),
    'snap-pixel-grid': () =>
      setSnappingPreference('pixelGrid', !store.state.snappingPreferences.pixelGrid),
    'toggle-ui': () => {
      store.state.showUI = !store.state.showUI
    },
    'toggle-preview': () => store.togglePlay(),
    present: () => togglePresentation(store),
    'view-zoom-tool': () => store.setTool('ZOOM'),
    'view-shader-mode': () => {
      store.startShaderMode()
    },
    // The shell's menu sits outside the tab, so its `store` is the forwarding proxy; the link
    // editor matches the store that opened it, which must be the tab's own.
    'text-add-link': () => openTextLinkEditor(getActiveEditorStore()),
    'insert-icon': () => {
      store.state.iconPickerOpen = true
    },
    variables: () => openVariablesDialog(store),
    'insert-script': () => {
      insertScriptNode(store)
    },
    'place-image': () => openPlaceImageDialog(store),
    goodies: () => openGoodies(store),
    'find-layers': () => openFindLayers(store),
    'export-pdf': () => void exportFramesToPDF(store),
    'theme-light': () => setTheme('light'),
    'theme-dark': () => setTheme('dark'),
    'theme-auto': () => setTheme('auto'),
    'text.bold': onCanvasSelection(toggleSelectedTextBold),
    'text.italic': onCanvasSelection(toggleSelectedTextItalic),
    'text.underline': onCanvasSelection(toggleSelectedTextUnderline),
    'arrange.align-left': onCanvasSelection(() => alignSelected('horizontal', 'min')),
    'arrange.align-center': onCanvasSelection(() => alignSelected('horizontal', 'center')),
    'arrange.align-right': onCanvasSelection(() => alignSelected('horizontal', 'max')),
    'arrange.align-top': onCanvasSelection(() => alignSelected('vertical', 'min')),
    'arrange.align-middle': onCanvasSelection(() => alignSelected('vertical', 'center')),
    'arrange.align-bottom': onCanvasSelection(() => alignSelected('vertical', 'max')),
    'remove-auto-layout': onCanvasSelection(() => void removeSelectionAutoLayout(store))
  }
}
