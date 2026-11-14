import { afterEach, expect, mock, test } from 'bun:test'

import { createEditor, type Editor } from '@pairdraw/core'
import { SceneGraph } from '@pairdraw/scene-graph'

import { createVectorEditActions } from '@/app/editor/vector/create'
import type { VectorEditState } from '@/app/editor/vector/types'
import { runNodeEditKey } from '@/app/shell/keyboard/node-edit'

import { expectDefined } from '#tests/helpers/assert'

let editor: Editor

afterEach(() => editor.dispose())

const zero = () => ({ x: 0, y: 0 })

/** A store whose open path (0,0) → (100,0) → (100,100) is being edited, its actions recorded. */
function editing(cutTool = false) {
  const graph = new SceneGraph()
  const pageId = expectDefined(graph.getPages()[0]).id
  const vector = graph.createNode('VECTOR', pageId, {
    width: 100,
    height: 100,
    vectorNetwork: {
      vertices: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 }
      ],
      segments: [
        { start: 0, end: 1, tangentStart: zero(), tangentEnd: zero() },
        { start: 1, end: 2, tangentStart: zero(), tangentEnd: zero() }
      ],
      regions: []
    }
  })
  editor = createEditor({ graph })
  const state: VectorEditState = Object.assign(editor.state, { nodeEditState: null })
  const actions = createVectorEditActions(editor, state)
  actions.enterNodeEditMode(vector.id)
  if (cutTool) actions.nodeEditSetCutTool(true)
  return {
    state,
    nodeEditSetCutTool: mock(actions.nodeEditSetCutTool),
    nodeEditJoinEndpoints: mock(actions.nodeEditJoinEndpoints),
    nodeEditNudgeSelected: mock(actions.nodeEditNudgeSelected)
  }
}

function key(code: string, init: Partial<KeyboardEvent> = {}): KeyboardEvent {
  const letter = code.startsWith('Key') ? code.slice(3).toLowerCase() : code
  return {
    code,
    key: letter,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    ...init
  } as KeyboardEvent
}

test('⌘/Ctrl+J joins the selected end points instead of opening the chat column', () => {
  const store = editing()
  expect(runNodeEditKey(store, key('KeyJ', { metaKey: true }))).toBe(true)
  expect(runNodeEditKey(store, key('KeyJ', { ctrlKey: true }))).toBe(true)
  expect(store.nodeEditJoinEndpoints).toHaveBeenCalledTimes(2)
})

test('X picks up and puts down the cut tool, and Escape puts it down', () => {
  const store = editing()
  expect(runNodeEditKey(store, key('KeyX'))).toBe(true)
  expect(store.nodeEditSetCutTool).toHaveBeenLastCalledWith(true)
  expect(runNodeEditKey(store, key('KeyX'))).toBe(true)
  expect(store.nodeEditSetCutTool).toHaveBeenLastCalledWith(false)

  runNodeEditKey(store, key('KeyX'))
  expect(runNodeEditKey(store, key('Escape'))).toBe(true)
  expect(store.state.nodeEditState?.cutTool).toBe(false)
  // Without the cut tool, Escape leaves the path as before.
  expect(runNodeEditKey(store, key('Escape'))).toBe(false)
})

test('a tool key puts the cut tool down and still picks its tool', () => {
  const store = editing(true)
  expect(runNodeEditKey(store, key('KeyV'))).toBe(false)
  expect(store.nodeEditSetCutTool).toHaveBeenLastCalledWith(false)
})

test('the arrow keys move the selected points by the nudge distances', () => {
  const store = editing()
  expect(runNodeEditKey(store, key('ArrowRight'))).toBe(true)
  expect(store.nodeEditNudgeSelected).toHaveBeenLastCalledWith(1, 0, true)
  expect(runNodeEditKey(store, key('ArrowUp', { shiftKey: true, repeat: true }))).toBe(true)
  expect(store.nodeEditNudgeSelected).toHaveBeenLastCalledWith(0, -10, false)
})

test('other keys and other modes are left to the editor', () => {
  const store = editing()
  expect(runNodeEditKey(store, key('KeyX', { shiftKey: true }))).toBe(false)
  expect(runNodeEditKey(store, key('ArrowLeft', { altKey: true }))).toBe(false)
  expect(runNodeEditKey(store, key('KeyK', { metaKey: true }))).toBe(false)

  store.state.nodeEditState = null
  expect(runNodeEditKey(store, key('KeyJ', { metaKey: true }))).toBe(false)
  expect(store.nodeEditJoinEndpoints).not.toHaveBeenCalled()
})

test('away from the canvas only ⌘/Ctrl+J runs, so a focused panel keeps its arrow keys', () => {
  const store = editing(true)
  expect(runNodeEditKey(store, key('ArrowRight'), false)).toBe(false)
  expect(runNodeEditKey(store, key('KeyX'), false)).toBe(false)
  expect(runNodeEditKey(store, key('Escape'), false)).toBe(false)
  expect(store.nodeEditNudgeSelected).not.toHaveBeenCalled()
  expect(store.nodeEditSetCutTool).not.toHaveBeenCalled()
  expect(runNodeEditKey(store, key('KeyJ', { metaKey: true }), false)).toBe(true)
  expect(store.nodeEditJoinEndpoints).toHaveBeenCalledTimes(1)
})
