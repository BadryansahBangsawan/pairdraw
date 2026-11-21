import { emitNavigationTrace } from '#core/profiler'

import type { EditorEventName, EditorEvents, EditorState } from './types'

type EmitEditorEvent = <K extends EditorEventName>(
  event: K,
  ...args: Parameters<EditorEvents[K]>
) => void

/**
 * How the editor asks the canvas and its views to catch up: a full render after a document
 * change, a repaint of the canvas alone, a refresh of graph views, a text selection change, and
 * the navigation phase that tells drawing a pan or zoom is under way.
 */
export function createRenderRequests(state: EditorState, emitEditorEvent: EmitEditorEvent) {
  function requestRender() {
    state.renderVersion++
    state.sceneVersion++
    state.canvasVersion++
    emitNavigationTrace('render:requested', {
      kind: 'render',
      renderVersion: state.renderVersion,
      sceneVersion: state.sceneVersion
    })
    emitEditorEvent('render:requested', {
      renderVersion: state.renderVersion,
      sceneVersion: state.sceneVersion
    })
  }

  /**
   * The caret or selection of the edited text moved: the canvas repaints its overlay and the
   * views that follow the selection update, without the document counting as changed.
   */
  function textSelectionChanged() {
    state.textSelectionVersion++
    requestRepaint()
  }

  function requestRefresh() {
    state.sceneVersion++
  }

  function requestRepaint() {
    state.renderVersion++
    emitNavigationTrace('render:requested', {
      kind: 'repaint',
      renderVersion: state.renderVersion,
      sceneVersion: state.sceneVersion
    })
    emitEditorEvent('repaint:requested', {
      renderVersion: state.renderVersion,
      sceneVersion: state.sceneVersion
    })
  }

  function setNavigationPhase(phase: EditorState['navigation']['phase'], inputAt = 0) {
    const previous = { ...state.navigation }
    const active = phase === 'pan' || phase === 'zoom' || phase === 'momentum'
    const wasActive =
      previous.phase === 'pan' || previous.phase === 'zoom' || previous.phase === 'momentum'
    state.navigation = {
      phase,
      generation: active && !wasActive ? previous.generation + 1 : previous.generation,
      lastInputAt: inputAt || previous.lastInputAt
    }
    if (
      state.navigation.phase !== previous.phase ||
      state.navigation.generation !== previous.generation ||
      state.navigation.lastInputAt !== previous.lastInputAt
    ) {
      emitNavigationTrace('navigation:phase', {
        phase: state.navigation.phase,
        previousPhase: previous.phase,
        generation: state.navigation.generation,
        lastInputAt: state.navigation.lastInputAt
      })
      emitEditorEvent('navigation:changed', state.navigation, previous)
    }
  }

  return { requestRender, requestRefresh, requestRepaint, textSelectionChanged, setNavigationPhase }
}
