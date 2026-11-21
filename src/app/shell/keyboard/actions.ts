import type { Ref } from 'vue'

import { opacityFromBuffer } from '@pairdraw/core'
import { generatedFrameText } from '@pairdraw/scene-graph/generated'
import type { useEditorCommands } from '@pairdraw/vue/editor/commands'
import type { useViewportKind } from '@pairdraw/vue/editor/viewport-kind'

import { useComments } from '@/app/comments/use'
import type { EditorStore } from '@/app/editor/active-store'

type KeyboardActionsOptions = {
  store: EditorStore
  chatColumnOpen: Ref<boolean>
  isMobile: ReturnType<typeof useViewportKind>['isMobile']
  runCommand: ReturnType<typeof useEditorCommands>['runCommand']
  setOpacityTarget: ReturnType<typeof useEditorCommands>['setOpacityTarget']
}

export function createKeyboardActions({
  store,
  chatColumnOpen,
  isMobile,
  runCommand,
  setOpacityTarget
}: KeyboardActionsOptions) {
  function hasNodeEditSelection() {
    return (
      store.state.nodeEditState &&
      (store.state.nodeEditState.selectedVertexIndices.size > 0 ||
        store.state.nodeEditState.selectedSegmentIndices.size > 0 ||
        store.state.nodeEditState.selectedHandles.size > 0)
    )
  }

  function smartDelete(altKey: boolean) {
    if (hasNodeEditSelection()) {
      if (altKey) store.nodeEditBreakAtVertex()
      else store.nodeEditDeleteSelected()
      return
    }
    runCommand('selection.delete')
  }

  function confirmOrEditSelection() {
    if (store.state.imageEdit) {
      store.endImageEdit()
      return
    }
    if (store.state.nodeEditState) {
      store.exitNodeEditMode(true)
      return
    }
    if (store.state.penState) {
      store.penCommit(false)
      return
    }
    const node = store.selectedNode.value
    // Figma opens a selected vector's path, as a double-click does.
    if (node?.type === 'VECTOR') {
      store.enterNodeEditMode(node.id)
      return
    }
    // A layer without children that shows an image opens it for cropping, as a double-click does.
    if (node?.childIds.length === 0 && store.canEditImage(node.id)) {
      store.startImageEdit(node.id)
      return
    }
    // A sticky note opens its body and a connector its label, all of it selected, keeping the
    // note or connector selected.
    const text = (node && generatedFrameText(store.graph, node)) ?? node
    if (text?.type === 'TEXT') {
      requestAnimationFrame(() => {
        store.startTextEditing(text.id)
        store.textEditor?.selectAll()
        store.requestRender()
      })
      return
    }
    runCommand('selection.selectChildren')
  }

  function escapeOrDeselect() {
    if (store.leaveCanvasView()) return
    if (store.state.rotationPreview) {
      store.setRotationPreview(null)
      return
    }
    if (store.state.imageEdit) {
      // Escape during a crop or reframe drag only puts the layer back, which the canvas does;
      // the image stays open, as in Figma.
      if (!store.isInteractiveEditing()) store.endImageEdit()
      return
    }
    if (store.state.nodeEditState) {
      store.exitNodeEditMode(true)
      return
    }
    if (store.state.pencilState) {
      store.pencilCancel()
      return
    }
    // Figma keeps the path drawn so far; a lone point has nothing to keep.
    if (store.state.penState) {
      if (store.state.penState.vertices.length >= 2) store.penCommit(false)
      else store.penCancel()
      return
    }
    // Figma clears the selection at any depth; Shift+Enter is the way up a level.
    if (store.state.enteredContainerId) store.exitContainers()
    if (useComments().closeCard()) return
    store.clearSelection()
    store.setTool('SELECT')
  }

  function toggleAutoLayout() {
    const node = store.selectedNode.value
    if (node?.type === 'FRAME' && store.selectedNodes.value.length === 1) {
      store.setLayoutMode(node.id, node.layoutMode === 'NONE' ? 'VERTICAL' : 'NONE')
    } else if (store.selectedNodes.value.length > 0) {
      runCommand('selection.wrapInAutoLayout')
    }
  }

  function toggleUI() {
    store.state.showUI = !store.state.showUI
  }

  function togglePlay() {
    store.togglePlay()
  }

  function toggleAI() {
    if (isMobile.value) {
      store.state.activeRibbonTab = store.state.activeRibbonTab === 'ai' ? 'panels' : 'ai'
      if (store.state.mobileDrawerSnap === 'closed') {
        store.state.mobileDrawerSnap = 'half'
      }
    } else {
      chatColumnOpen.value = !chatColumnOpen.value
    }
  }

  function exportSelectionPNG() {
    if (store.state.selectedIds.size > 0) void store.exportSelection(1, 'png')
  }

  let opacityBuffer = ''
  let opacitySelectionKey = ''
  let opacityCoalesceKey = ''
  let opacityResetTimer: ReturnType<typeof setTimeout> | undefined

  function resetOpacityBuffer() {
    opacityBuffer = ''
    opacitySelectionKey = ''
    opacityCoalesceKey = ''
    clearTimeout(opacityResetTimer)
  }

  function opacityDigit(digit: string) {
    if (store.state.selectedIds.size === 0) return
    const selectionKey = [...store.state.selectedIds].sort().join('\0')
    if (selectionKey !== opacitySelectionKey) resetOpacityBuffer()
    if (!opacityBuffer) {
      opacitySelectionKey = selectionKey
      opacityCoalesceKey = crypto.randomUUID()
    }
    opacityBuffer += digit
    if (opacityBuffer.length > 3) opacityBuffer = opacityBuffer.slice(-3)
    setOpacityTarget(opacityFromBuffer(opacityBuffer), opacityCoalesceKey)
    runCommand('selection.setOpacity')
    clearTimeout(opacityResetTimer)
    opacityResetTimer = setTimeout(resetOpacityBuffer, 800)
  }

  return {
    smartDelete,
    confirmOrEditSelection,
    escapeOrDeselect,
    toggleAutoLayout,
    toggleUI,
    togglePlay,
    toggleAI,
    exportSelectionPNG,
    opacityDigit
  }
}
