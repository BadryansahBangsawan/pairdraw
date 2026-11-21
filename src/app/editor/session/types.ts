import { createDefaultEditorState, type EditorState } from '@pairdraw/core'
import type { DocumentColorSpace } from '@pairdraw/scene-graph'
import type { PresentationColorSpace } from '@pairdraw/vue/canvas/surface'

import type { SaveFailure } from '@/app/document/save-failure'
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
    saveFailure: null,
    cursorCanvasX: null,
    cursorCanvasY: null,
    nodeEditState: null,
    renameSelectionOpen: false,
    variablesOpen: false,
    statusesOpen: false,
    designMemoryOpen: false,
    designMemoryLearnFrom: null,
    iconPickerOpen: false,
    findLayersOpen: false,
    goodiesOpen: false,
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
  /** Set when a save fails, and cleared by the next save that lands. */
  saveFailure: SaveFailure | null
  cursorCanvasX: number | null
  cursorCanvasY: number | null
  nodeEditState: NodeEditState | null
  renameSelectionOpen: boolean
  /** The variables dialog, opened from the Design panel, the View menu, or the palette. */
  variablesOpen: boolean
  /** The statuses dialog, opened from the Status section, the canvas menu, or the page panel. */
  statusesOpen: boolean
  /** The design memory dialog, opened from the Design memory section or a selection's. */
  designMemoryOpen: boolean
  /** The layers the dialog proposes rules from, as Learn asks; null shows the rules. */
  designMemoryLearnFrom: string[] | null
  /** The icon picker, opened from the toolbar, the Object menu, or the palette. */
  iconPickerOpen: boolean
  /** Find layers, opened from the Edit menu, its key, or the palette. */
  findLayersOpen: boolean
  /** Goodies, opened from the top bar, the Object menu, or the palette. */
  goodiesOpen: boolean
  renameNodeId: string | null
  numberFieldFocused: boolean
  preparation: EditorPreparation | null
  /** Color space the canvas is presenting, reported by the surface. */
  canvasPresentation: PresentationColorSpace | null
  /** Mirror of the document's color space, kept reactive for UI. */
  documentColorSpace: DocumentColorSpace
}
