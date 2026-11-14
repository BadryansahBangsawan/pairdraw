import { createDefaultEditorState, type EditorState } from '@open-pencil/core'
import type { DocumentColorSpace } from '@open-pencil/scene-graph'
import type { PresentationColorSpace } from '@open-pencil/vue/canvas/surface'

import type { EditorPreparation } from '@/app/editor/preparation/types'
import type { NodeEditState } from '@/app/editor/vector/types'
import { appPreferences } from '@/app/settings/preferences/store'
import { resolvedAppTheme } from '@/app/shell/theme'

export function createInitialAppEditorState(pageId: string): AppEditorState {
  return {
    ...createDefaultEditorState(pageId),
    // New pages and sections take their colors from the interface theme, as in Figma.
    theme: resolvedAppTheme.value,
    snappingPreferences: { ...appPreferences.value.editing.snapping },
    // The pixel grid stays as the person last left it, View → Pixel grid or Shift+'.
    showPixelGrid: appPreferences.value.view.pixelGrid,
    showUI: true,
    // Rulers stay out of the way until asked for, with Shift+R or View › Rulers.
    showRulers: false,
    showRemoteCursors: true,
    activeRibbonTab: 'panels',
    panelMode: 'design',
    actionToast: null,
    mobileDrawerSnap: 'closed',
    autosaveEnabled: false,
    cursorCanvasX: null,
    cursorCanvasY: null,
    nodeEditState: null,
    renameSelectionOpen: false,
    variablesOpen: false,
    statusesOpen: false,
    iconPickerOpen: false,
    findLayersOpen: false,
    renameNodeId: null,
    numberFieldFocused: false,
    preparation: null,
    canvasPresentation: null,
    documentColorSpace: 'srgb'
  }
}

export type AppEditorState = EditorState & {
  showUI: boolean
  showRulers: boolean
  showRemoteCursors: boolean
  activeRibbonTab: 'panels' | 'code' | 'ai'
  panelMode: 'layers' | 'design'
  actionToast: string | null
  mobileDrawerSnap: 'closed' | 'half' | 'full'
  autosaveEnabled: boolean
  cursorCanvasX: number | null
  cursorCanvasY: number | null
  nodeEditState: NodeEditState | null
  renameSelectionOpen: boolean
  /** The variables dialog, opened from the Design panel, the View menu, or the palette. */
  variablesOpen: boolean
  /** The statuses dialog, opened from the Status section, the canvas menu, or the page panel. */
  statusesOpen: boolean
  /** The icon picker, opened from the toolbar, the Object menu, or the palette. */
  iconPickerOpen: boolean
  /** Find layers, opened from the Edit menu, its key, or the palette. */
  findLayersOpen: boolean
  renameNodeId: string | null
  numberFieldFocused: boolean
  preparation: EditorPreparation | null
  /** Color space the canvas is presenting, reported by the surface. */
  canvasPresentation: PresentationColorSpace | null
  /** Mirror of the document's color space, kept reactive for UI. */
  documentColorSpace: DocumentColorSpace
}
