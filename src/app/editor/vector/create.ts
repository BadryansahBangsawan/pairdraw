import type { Editor } from '@open-pencil/core'

import { createVectorEditHandleActions } from './handle-actions'
import { createVectorEditHistoryActions } from './history'
import { createVectorEditLifecycle } from './lifecycle'
import { createVectorEditNetworkActions, getLiveNetwork, setNodeEditNetwork } from './network'
import { createVectorEditPathActions } from './path-actions'
import { createVectorEditSelectionActions } from './selection'
import type { VectorEditState } from './types'

export function createVectorEditActions(editor: Editor, state: VectorEditState) {
  const { getNodeEditState, commitNodeEditChanges, enterNodeEditMode, exitNodeEditMode } =
    createVectorEditLifecycle(editor, state)
  const {
    nodeEditSelectVertex,
    nodeEditAlignVertices,
    nodeEditDeleteSelected,
    nodeEditBreakAtVertex
  } = createVectorEditSelectionActions(editor, state, exitNodeEditMode)

  const { nodeEditSetHandle, nodeEditBendHandle, nodeEditZeroVertexHandles } =
    createVectorEditHandleActions(editor, getNodeEditState)
  const { nodeEditPushHistory, nodeEditUndo, nodeEditRedo } = createVectorEditHistoryActions(
    editor,
    state
  )
  const { nodeEditConnectEndpoints, nodeEditAddVertex, nodeEditRemoveVertex } =
    createVectorEditNetworkActions(editor, state, getNodeEditState)
  const pathActions = createVectorEditPathActions(editor, state, getNodeEditState)

  function cancelNodeEditDrag() {
    const editState = getNodeEditState()
    if (!editState) return
    const previous = editState.history.at(-1)
    if (!previous) return
    setNodeEditNetwork(editState, previous)
    editState.history.pop()
    // An ⌥/Alt drag selected copies the snapshot does not have; keep only what still exists.
    const below = (indices: Set<number>, length: number) =>
      new Set([...indices].filter((index) => index < length))
    editState.selectedVertexIndices = below(
      editState.selectedVertexIndices,
      previous.vertices.length
    )
    editState.selectedSegmentIndices = below(
      editState.selectedSegmentIndices,
      previous.segments.length
    )
    editState.selectedRegions = below(editState.selectedRegions, previous.regions.length)
    editState.selectedHandles = below(editState.selectedHandles, previous.segments.length * 2)
    editor.requestRender()
  }

  return {
    getNodeEditState,
    setNodeEditNetwork,
    getLiveNetwork,
    commitNodeEditChanges: () => {
      const editState = getNodeEditState()
      if (editState) commitNodeEditChanges(editState)
    },
    nodeEditCancelDrag: () => {
      const editState = getNodeEditState()
      if (editState) cancelNodeEditDrag()
    },
    enterNodeEditMode,
    exitNodeEditMode,
    nodeEditSelectVertex,
    nodeEditSetHandle,
    nodeEditBendHandle,
    nodeEditZeroVertexHandles,
    nodeEditConnectEndpoints,
    nodeEditAddVertex,
    nodeEditRemoveVertex,
    nodeEditAlignVertices,
    nodeEditDeleteSelected,
    nodeEditBreakAtVertex,
    nodeEditPushHistory,
    nodeEditUndo,
    nodeEditRedo,
    ...pathActions
  }
}
