import { describe, expect, test } from 'bun:test'

import {
  createEditor,
  EDIT_VIEW,
  executeAtomicTool,
  type EditorProfileInputs
} from '@pairdraw/core'
import { FigmaAPI } from '@pairdraw/core/figma-api'
import { PairdrawAPI } from '@pairdraw/core/pairdraw-api'
import { ALL_TOOLS, type ToolDef } from '@pairdraw/core/tools'
import { SceneGraph } from '@pairdraw/scene-graph'
import { UndoManager } from '@pairdraw/scene-graph/undo'

function setup() {
  const graph = new SceneGraph()
  const undo = new UndoManager()
  const figma = new FigmaAPI(graph)
  const state: EditorProfileInputs = {
    documentKind: 'design',
    canvasView: EDIT_VIEW,
    hostRestrictions: { readOnly: false }
  }
  const editor = {
    graph,
    state,
    runLayoutForNode: () => undefined,
    requestRender: () => undefined,
    pushUndoStep: undo.pushStep.bind(undo)
  }
  const rectangle = figma.createRectangle()
  const tool = (name: string): ToolDef => {
    const def = ALL_TOOLS.find((candidate) => candidate.name === name)
    if (!def) throw new Error(`Missing ${name}`)
    return def
  }
  return { graph, figma, editor, undo, rectangle, tool }
}

/** Everything a rollback must bring back, as plain copies, including page and child order. */
function documentState(graph: SceneGraph) {
  return structuredClone({
    rootId: graph.rootId,
    pages: graph.getPages().map((page) => page.id),
    nodes: graph.nodes,
    variables: graph.variables,
    collections: graph.variableCollections,
    activeMode: graph.activeMode,
    instanceIndex: graph.instanceIndex,
    images: [...graph.images.keys()],
    enabledLibraries: graph.enabledLibraries,
    documentColorSpace: graph.documentColorSpace
  })
}

describe('atomic agent tools', () => {
  test('component edits and undo propagate through the editor synchronizer', async () => {
    const editor = createEditor()
    const figma = new FigmaAPI(editor.graph)
    const component = figma.createComponent()
    const instance = component.createInstance()
    await Promise.resolve()
    const def = ALL_TOOLS.find((tool) => tool.name === 'set_opacity')
    if (!def) throw new Error('Missing set_opacity')
    executeAtomicTool(editor, figma, def, { id: component.id, value: 0.5 })
    await Promise.resolve()
    expect(instance.opacity).toBe(0.5)
    editor.undo.undo()
    await Promise.resolve()
    expect(component.opacity).toBe(1)
    expect(instance.opacity).toBe(1)
    editor.undo.redo()
    await Promise.resolve()
    expect(instance.opacity).toBe(0.5)
  })

  test('undo targets the original page and keeps unrelated later changes', () => {
    const { figma, editor, undo, rectangle, tool } = setup()
    const pageId = figma.currentPage.id
    executeAtomicTool(editor, figma, tool('set_opacity'), { id: rectangle.id, value: 0.5 })
    const another = figma.createPage()
    figma.currentPage = another
    rectangle.name = 'Later name'
    undo.undo()
    expect(rectangle.opacity).toBe(1)
    expect(rectangle.name).toBe('Later name')
    expect(rectangle.parent?.id).toBe(pageId)
    expect(figma.currentPage.id).toBe(another.id)
    undo.redo()
    expect(rectangle.opacity).toBe(0.5)
  })

  test('variable values and bound nodes are undoable across pages', () => {
    const { figma, editor, undo, rectangle, tool } = setup()
    const collection = figma.variables.createVariableCollection('Colors')
    const variable = figma.variables.createVariable('Brand', collection, 'COLOR')
    variable.setValueForMode(collection.defaultModeId, { r: 1, g: 0, b: 0, a: 1 })
    tool('set_fill').execute(figma, { id: rectangle.id, color: '#ff0000' })
    new PairdrawAPI(figma).bindVariable(rectangle.id, 'fills/0/color', variable)
    const page = figma.createPage()
    figma.currentPage = page
    executeAtomicTool(editor, figma, tool('set_variable'), {
      id: variable.id,
      mode: collection.defaultModeId,
      value: '#00ff00'
    })
    expect(
      figma.variables.getVariableById(variable.id)?.valuesByMode[collection.defaultModeId]
    ).toMatchObject({ g: 1 })
    undo.undo()
    expect(
      figma.variables.getVariableById(variable.id)?.valuesByMode[collection.defaultModeId]
    ).toMatchObject({ r: 1, g: 0 })
    undo.redo()
    expect(
      figma.variables.getVariableById(variable.id)?.valuesByMode[collection.defaultModeId]
    ).toMatchObject({ r: 0, g: 1 })
  })

  test.each(['node', 'variable'] as const)('replays %s property presence exactly', (kind) => {
    for (const before of ['absent', 'undefined', 'value'] as const) {
      for (const after of ['absent', 'undefined', 'value'] as const) {
        if (before === after) continue
        const { graph, figma, editor, undo, rectangle, tool } = setup()
        const collection = graph.createCollection('Test')
        const variable = graph.createVariable('Test', 'STRING', collection.id, '')
        const target = kind === 'node' ? graph.getNode(rectangle.id) : variable
        if (!target) throw new Error('Missing target')
        const key = kind === 'node' ? 'booleanOperation' : 'key'
        const value = kind === 'node' ? 'UNION' : 'variable-key'
        const set = (state: typeof before) => {
          if (state === 'absent') Reflect.deleteProperty(target, key)
          else Reflect.set(target, key, state === 'undefined' ? undefined : value)
        }
        const assertState = (state: typeof before) => {
          expect(Object.hasOwn(target, key)).toBe(state !== 'absent')
          expect(Reflect.get(target, key)).toBe(state === 'value' ? value : undefined)
        }
        set(before)
        executeAtomicTool(
          editor,
          figma,
          {
            ...tool('set_opacity'),
            execute: () => {
              set(after)
            }
          },
          {}
        )
        assertState(after)
        expect(undo.canUndo).toBe(true)
        undo.undo()
        assertState(before)
        undo.redo()
        assertState(after)
      }
    }
  })

  test.each(['node', 'variable'] as const)('rejects replacement of a captured %s', (kind) => {
    const { graph, figma, editor, undo, rectangle, tool } = setup()
    const collection = graph.createCollection('Test')
    const variable = graph.createVariable('Test', 'STRING', collection.id, '')
    const node = graph.getNode(rectangle.id)
    if (!node) throw new Error('Missing node')
    expect(() =>
      executeAtomicTool(
        editor,
        figma,
        {
          ...tool('set_opacity'),
          execute: () => {
            if (kind === 'node') graph.nodes.set(node.id, structuredClone(node))
            else graph.variables.set(variable.id, structuredClone(variable))
          }
        },
        {}
      )
    ).toThrow('Atomic tools must not change')
    expect(graph.getNode(node.id)).toBe(node)
    expect(graph.variables.get(variable.id)).toBe(variable)
    expect(undo.canUndo).toBe(false)
  })

  test('rejects and restores instance index corruption even on reported success', () => {
    const { graph, figma, editor, undo, tool } = setup()
    const component = figma.createComponent()
    const instance = component.createInstance()
    const before = structuredClone(graph.instanceIndex)
    expect(() =>
      executeAtomicTool(
        editor,
        figma,
        {
          ...tool('set_opacity'),
          execute: () => {
            graph.instanceIndex.get(component.id)?.delete(instance.id)
          }
        },
        {}
      )
    ).toThrow('Atomic tools must not change')
    expect(graph.instanceIndex).toEqual(before)
    expect(undo.canUndo).toBe(false)
  })

  test('partial failures roll back without adding history', () => {
    const { figma, editor, undo, rectangle, tool } = setup()
    const def: ToolDef = {
      ...tool('set_opacity'),
      description: 'failure seam',
      execute: () => {
        rectangle.opacity = 0.25
        throw new Error('Failed')
      }
    }
    expect(() => executeAtomicTool(editor, figma, def, {})).toThrow('Failed')
    expect(rectangle.opacity).toBe(1)
    expect(undo.canUndo).toBe(false)
  })

  test.each([
    'create node',
    'delete node',
    'create variable',
    'delete variable',
    'reparent',
    'delete collection'
  ])('rolls back forbidden %s and preserves graph bookkeeping', (operation) => {
    const { graph, figma, editor, undo, rectangle, tool } = setup()
    const collection = graph.createCollection('Values')
    const variable = graph.createVariable('Spacing', 'FLOAT', collection.id, 8)
    const component = figma.createComponent()
    const instance = component.createInstance()
    const nodes = structuredClone(graph.nodes)
    const variables = structuredClone(graph.variables)
    const collections = structuredClone(graph.variableCollections)
    const index = structuredClone(graph.instanceIndex)
    const modes = structuredClone(graph.activeMode)
    const original = graph.getNode(instance.id)
    const def: ToolDef = {
      ...tool('set_opacity'),
      execute: () => {
        rectangle.opacity = 0.25
        switch (operation) {
          case 'create node':
            component.createInstance()
            break
          case 'delete node':
            graph.deleteNode(instance.id)
            break
          case 'create variable':
            graph.createVariable('New', 'FLOAT', collection.id, 4)
            break
          case 'delete variable':
            graph.removeVariable(variable.id)
            break
          case 'reparent':
            graph.reparentNode(rectangle.id, component.id)
            break
          case 'delete collection':
            graph.removeCollection(collection.id)
            break
        }
        throw new Error('Original failure')
      }
    }
    expect(() => executeAtomicTool(editor, figma, def, {})).toThrow('Original failure')
    expect(graph.nodes).toEqual(nodes)
    expect(graph.variables).toEqual(variables)
    expect(graph.variableCollections).toEqual(collections)
    expect(graph.instanceIndex).toEqual(index)
    expect(graph.activeMode).toEqual(modes)
    expect(graph.getNode(instance.id)).toBe(original)
    expect(undo.canUndo).toBe(false)
  })

  test('rejects a structural edit even when the callback reports success', () => {
    const { graph, figma, editor, undo, tool } = setup()
    const nodes = structuredClone(graph.nodes)
    const def: ToolDef = {
      ...tool('set_opacity'),
      execute: () => {
        figma.createRectangle()
        return { ok: true }
      }
    }
    expect(() => executeAtomicTool(editor, figma, def, {})).toThrow('must not create or remove')
    expect(graph.nodes).toEqual(nodes)
    expect(undo.canUndo).toBe(false)
  })

  test('error results roll back; no-op operations do not create history', () => {
    const { figma, editor, undo, rectangle, tool } = setup()
    executeAtomicTool(editor, figma, tool('set_opacity'), { id: rectangle.id, value: 1 })
    expect(undo.canUndo).toBe(false)
    expect(() =>
      executeAtomicTool(editor, figma, tool('set_opacity'), { id: 'missing', value: 0 })
    ).toThrow()
    expect(undo.canUndo).toBe(false)
  })

  test('aborted and closed/replaced targets are rejected before mutation', () => {
    const { figma, editor, rectangle, tool } = setup()
    const signal = AbortSignal.abort()
    const args = { id: rectangle.id, value: 0.5 }
    expect(() => executeAtomicTool(editor, figma, tool('set_opacity'), args, { signal })).toThrow()
    expect(() =>
      executeAtomicTool(editor, figma, tool('set_opacity'), args, { isLive: () => false })
    ).toThrow('no longer open')
    editor.graph = new SceneGraph()
    expect(() => executeAtomicTool(editor, figma, tool('set_opacity'), args)).toThrow(
      'no longer open'
    )
    expect(rectangle.opacity).toBe(1)
  })

  test('a failure after many kinds of edits leaves the whole document as it was', () => {
    const { graph, figma, editor, undo, rectangle, tool } = setup()
    const firstPage = figma.currentPage.id
    const second = graph.addPage('Second')
    const frame = graph.createNode('FRAME', firstPage, { name: 'Frame' })
    const child = graph.createNode('RECTANGLE', frame.id, { name: 'Child' })
    const sibling = graph.createNode('ELLIPSE', frame.id, { name: 'Sibling' })
    const elsewhere = graph.createNode('TEXT', second.id, { name: 'Elsewhere', text: 'Hi' })
    const component = figma.createComponent()
    const instance = component.createInstance()
    const collection = graph.createCollection('Values')
    const variable = graph.createVariable('Spacing', 'FLOAT', collection.id, 8)
    const before = documentState(graph)
    const objects = new Map(graph.nodes)
    const variableObject = graph.variables.get(variable.id)
    const def: ToolDef = {
      ...tool('set_opacity'),
      execute: () => {
        rectangle.opacity = 0.25
        graph.updateNode(elsewhere.id, { text: 'Changed', x: 40 })
        graph.updateNode(child.id, { fills: [] })
        graph.insertChildAt(sibling.id, frame.id, 0)
        graph.reparentNode(child.id, second.id)
        graph.insertChildAt(second.id, graph.rootId, 0)
        graph.deleteNode(frame.id)
        graph.createNode('RECTANGLE', firstPage, { name: 'Added' })
        graph.updateNode(instance.id, { componentId: null })
        graph.instanceIndex.delete(component.id)
        const values = graph.variables.get(variable.id)?.valuesByMode
        if (values) values[collection.defaultModeId] = 32
        collection.name = 'Renamed'
        graph.activeMode.set(collection.id, 'other')
        throw new Error('Original failure')
      }
    }
    expect(() => executeAtomicTool(editor, figma, def, {})).toThrow('Original failure')
    expect(documentState(graph)).toEqual(before)
    for (const [id, node] of objects) expect(graph.getNode(id)).toBe(node)
    expect(graph.variables.get(variable.id)).toBe(variableObject)
    expect(undo.canUndo).toBe(false)
  })

  test('a failure restores fields written straight into a layer, and its child order', () => {
    const { graph, figma, editor, undo, tool } = setup()
    const frame = graph.createNode('FRAME', figma.currentPage.id, { name: 'Frame' })
    graph.createNode('RECTANGLE', frame.id, { name: 'First' })
    const second = graph.createNode('RECTANGLE', frame.id, {
      name: 'Second',
      effects: [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.5 },
          offset: { x: 0, y: 2 },
          radius: 4,
          spread: 0,
          visible: true
        }
      ]
    })
    const before = documentState(graph)
    const node = graph.getNode(frame.id)
    const shadowed = graph.getNode(second.id)
    if (!node || !shadowed) throw new Error('Missing layers')
    const def: ToolDef = {
      ...tool('set_opacity'),
      execute: () => {
        // Writes no graph method made, so nothing announced them.
        node.name = 'Renamed'
        Reflect.deleteProperty(node, 'opacity')
        node.childIds.reverse()
        // A write into a value, announced first as the graph's contract asks.
        graph.willChangeNode(shadowed)
        const [shadow] = shadowed.effects
        if (shadow && 'radius' in shadow) shadow.radius = 40
        throw new Error('Original failure')
      }
    }
    expect(() => executeAtomicTool(editor, figma, def, {})).toThrow('Original failure')
    expect(documentState(graph)).toEqual(before)
    expect(undo.canUndo).toBe(false)
  })

  test('a call aborted while it runs leaves the document as it was', () => {
    const { graph, figma, editor, undo, rectangle, tool } = setup()
    const before = documentState(graph)
    const controller = new AbortController()
    const def: ToolDef = {
      ...tool('set_opacity'),
      execute: () => {
        rectangle.opacity = 0.5
        rectangle.name = 'Aborted'
        controller.abort()
        controller.signal.throwIfAborted()
      }
    }
    expect(() => executeAtomicTool(editor, figma, def, {}, { signal: controller.signal })).toThrow()
    expect(documentState(graph)).toEqual(before)
    expect(undo.canUndo).toBe(false)
  })

  test('a closed document is not edited, nor its history changed', () => {
    const { graph, figma, editor, undo, rectangle, tool } = setup()
    const before = documentState(graph)
    expect(() =>
      executeAtomicTool(
        editor,
        figma,
        tool('set_opacity'),
        { id: rectangle.id, value: 0.5 },
        { isLive: () => false }
      )
    ).toThrow('no longer open')
    expect(documentState(graph)).toEqual(before)
    expect(undo.canUndo).toBe(false)
  })

  test('undo restores what layout changed after the edit, on any layer', () => {
    const { graph, figma, undo, rectangle, tool } = setup()
    const frame = graph.createNode('FRAME', figma.currentPage.id, { name: 'Frame', width: 10 })
    let laidOut = false
    const editor = {
      graph,
      state: {
        documentKind: 'design' as const,
        canvasView: EDIT_VIEW,
        hostRestrictions: { readOnly: false }
      },
      // Layout writing straight into a layer it was not asked about, the first time it runs.
      runLayoutForNode: () => {
        const node = graph.getNode(frame.id)
        if (node && !laidOut) node.width = 99
        laidOut = true
      },
      requestRender: () => undefined,
      pushUndoStep: undo.pushStep.bind(undo)
    }
    executeAtomicTool(editor, figma, tool('set_opacity'), { id: rectangle.id, value: 0.5 })
    expect(graph.getNode(frame.id)?.width).toBe(99)
    undo.undo()
    expect(rectangle.opacity).toBe(1)
    expect(graph.getNode(frame.id)?.width).toBe(10)
    undo.redo()
    expect(rectangle.opacity).toBe(0.5)
    expect(graph.getNode(frame.id)?.width).toBe(99)
  })

  test('back-to-back calls produce separate undo entries', async () => {
    const { figma, editor, undo, rectangle, tool } = setup()
    await Promise.all(
      [0.5, 0.25].map(async (value) =>
        executeAtomicTool(editor, figma, tool('set_opacity'), { id: rectangle.id, value })
      )
    )
    expect(rectangle.opacity).toBe(0.25)
    undo.undo()
    expect(rectangle.opacity).toBe(0.5)
    undo.undo()
    expect(rectangle.opacity).toBe(1)
  })
})
