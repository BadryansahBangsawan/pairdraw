import { computed } from 'vue'

import type { Editor } from '@pairdraw/core'
import type { IORegistry } from '@pairdraw/core/io'
import { createSelectedNodeState } from '@pairdraw/vue/editor/selection-state'

import { createDocumentExportActions } from '@/app/document/export'
import { createDocumentIOActions } from '@/app/document/io'
import type { ViewportSize } from '@/app/document/io/types'
import { createDesignCheck } from '@/app/editor/design-check/session'
import { createFlashActions } from '@/app/editor/flash'
import { createMobileClipboardActions } from '@/app/editor/mobile-clipboard'
import { createPenActions } from '@/app/editor/pen'
import type { EditorPreparationController } from '@/app/editor/preparation/controller'
import { createProfilerActions } from '@/app/editor/profiler'
import { createDisposeListeners } from '@/app/editor/session/dispose'
import type { AppEditorState } from '@/app/editor/session/types'
import { createShaderClock } from '@/app/editor/shader-clock/create'
import { createVectorEditActions } from '@/app/editor/vector'

export function defineEditorStoreAccessors(store: object, editor: Editor) {
  Object.defineProperties(store, {
    graph: {
      enumerable: true,
      get: () => editor.graph
    },
    renderer: {
      enumerable: true,
      get: () => editor.renderer
    },
    canvasRenderers: {
      enumerable: true,
      get: () => editor.canvasRenderers
    },
    textEditor: {
      enumerable: true,
      get: () => editor.textEditor
    }
  })
}

export function createEditorComputedRefs(editor: Editor, state: AppEditorState) {
  const { nodes: selectedNodes, dispose: disposeSelection } = createSelectedNodeState(editor)

  const selectedNode = computed(() =>
    selectedNodes.value.length === 1 ? selectedNodes.value[0] : undefined
  )

  const layerTree = computed(() => {
    void state.sceneVersion
    return editor.getLayerTree()
  })

  return { selectedNodes, selectedNode, layerTree, disposeSelection }
}

export function createEditorStoreModules(
  editor: Editor,
  state: AppEditorState,
  io: IORegistry,
  viewportSize: ViewportSize,
  preparationController: EditorPreparationController
) {
  const { disposeFlashes, ...flash } = createFlashActions(editor)
  const pen = createPenActions(editor, state)
  const vectorEdit = createVectorEditActions(editor, state)
  const documentIO = createDocumentIOActions(editor, state, viewportSize, preparationController)
  const documentExport = createDocumentExportActions(editor, state, io, documentIO.downloadBlob)
  const mobileClipboard = createMobileClipboardActions(editor)
  const profiler = createProfilerActions(editor)
  const designCheck = createDesignCheck(editor, state)
  const shaderClock = createShaderClock(editor)
  const { onDispose, notifyDispose } = createDisposeListeners()

  return {
    ...flash,
    ...pen,
    ...vectorEdit,
    /** Going read-only keeps a vector edit in progress, as the editor keeps edited text. */
    setReadOnly(readOnly: boolean, options?: { comments?: boolean }) {
      if (readOnly) vectorEdit.exitNodeEditMode(true)
      editor.setReadOnly(readOnly, options)
    },
    openFigFile: documentIO.openFigFile,
    openDOMFile: documentIO.openDOMFile,
    importDOMText: documentIO.importDOMText,
    setViewportSize: documentIO.setViewportSize,
    getViewportSize: documentIO.getViewportSize,
    fitCurrentPageToViewport: documentIO.fitCurrentPageToViewport,
    hasUnsavedChanges: documentIO.hasUnsavedChanges,
    /** Whether the tab still holds the empty design it started with, so a document may take it. */
    isBlankDocument: documentIO.isBlankDocument,
    renameDocument: documentIO.renameDocument,
    /** Calls back with each name the person gives the document. */
    onDocumentRenamed: documentIO.onDocumentRenamed,
    /** Takes the document as it is now as its saved state, so closing it asks nothing. */
    markDocumentSaved: documentIO.markDocumentSaved,
    /** Counts the document changed by something outside its history, so it gets saved. */
    markDocumentChanged: documentIO.markDocumentChanged,
    /** Applies changes the document already has elsewhere, such as its room's, as no edit. */
    adoptChanges: documentIO.adoptChanges,
    saveFigFile: documentIO.saveFigFile,
    saveFigFileAs: documentIO.saveFigFileAs,
    getDocumentFilePath: documentIO.getDocumentFilePath,
    hasWritableSource: documentIO.hasWritableSource,
    getSourceIdentity: documentIO.getSourceIdentity,
    getStorageBinding: documentIO.getStorageBinding,
    getRecoveryId: documentIO.getRecoveryId,
    adoptRecoverySnapshot: documentIO.adoptRecoverySnapshot,
    persistRecoveryNow: documentIO.persistRecoveryNow,
    discardRecovery: documentIO.discardRecovery,
    /** The draft a new document keeps its changes in, once it has one. */
    getDraftId: documentIO.getDraftId,
    adoptDraft: documentIO.adoptDraft,
    persistDraftNow: documentIO.persistDraftNow,
    discardDraft: documentIO.discardDraft,
    /** Holds drafting while the document is someone else's, such as a joined room's. */
    suspendDraft: documentIO.suspendDraft,
    setDocumentSource: documentIO.setDocumentSource,
    setStorageDocumentSource: documentIO.setStorageDocumentSource,
    setPlannedFilePath: documentIO.setPlannedFilePath,
    saveFigFileToPath: documentIO.saveFigFileToPath,
    saveFigFileCopy: documentIO.saveFigFileCopy,
    saveFigFileToStorage: documentIO.saveFigFileToStorage,
    startWatchingCurrentFile: documentIO.startWatchingCurrentFile,
    designCheck,
    onDispose,
    dispose: () => {
      disposeFlashes()
      shaderClock.dispose()
      notifyDispose()
      designCheck.dispose()
      editor.releaseGraphResources()
      editor.dispose()
      editor.clearPageViewports()
      documentIO.disposeDocumentIO()
      preparationController.dispose()
    },
    ...documentExport,
    ...mobileClipboard,
    ...profiler
  }
}
