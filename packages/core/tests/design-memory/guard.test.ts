import { afterEach, describe, expect, test } from 'bun:test'

import { createEditor, executeAtomicTool, type Editor } from '@pairdraw/core'
import { createDesignGuard, DesignMemoryRefusalError } from '@pairdraw/core/design-memory'
import { FigmaAPI } from '@pairdraw/core/figma-api'
import { ALL_TOOLS, type ToolDef } from '@pairdraw/core/tools'
import type { SceneNode } from '@pairdraw/scene-graph'
import { allowDesignValue, createDesignMemory } from '@pairdraw/scene-graph/design-memory'

const PINK = { r: 1, g: 0, b: 170 / 255, a: 1 }

let editor: Editor

afterEach(() => editor.dispose())

function tool(name: string): ToolDef {
  const def = ALL_TOOLS.find((candidate) => candidate.name === name)
  if (!def) throw new Error(`Missing ${name}`)
  return def
}

function solid(color: SceneNode['fills'][number]['color']): SceneNode['fills'] {
  return [{ type: 'SOLID', visible: true, opacity: 1, color }]
}

function setup() {
  editor = createEditor()
  let memory = allowDesignValue(createDesignMemory(), 'colors', '#1A73E8')
  memory = allowDesignValue(memory, 'spacing', 16)
  memory = allowDesignValue(memory, 'fonts', 'Inter')
  editor.setDesignMemory(memory)
  editor.undo.clear()
  const figma = new FigmaAPI(editor.graph)
  const card = figma.createRectangle()
  return { figma, card, pageId: editor.state.currentPageId }
}

describe("guarding an agent's edit with the design memory", () => {
  test('an atomic tool call with an off-system color is put back and leaves no step', () => {
    const { figma, card } = setup()
    const before = structuredClone(editor.graph.getNode(card.id)?.fills)
    const guard = createDesignGuard(editor.graph)
    const call = () =>
      executeAtomicTool(editor, figma, tool('set_fill'), { id: card.id, color: '#FF00AA' }, {
        verify: guard.verifyFields
      })
    expect(call).toThrow(DesignMemoryRefusalError)
    expect(editor.graph.getNode(card.id)?.fills).toEqual(before)
    expect(editor.undo.canUndo).toBe(false)

    executeAtomicTool(editor, figma, tool('set_fill'), { id: card.id, color: '#1A73E8' }, {
      verify: createDesignGuard(editor.graph).verifyFields
    })
    expect(editor.undo.canUndo).toBe(true)
  })

  test('a recorded edit with an off-system font is rolled back and the refusal thrown', async () => {
    const { pageId } = setup()
    const guard = createDesignGuard(editor.graph)
    const count = editor.graph.nodes.size
    const edit = editor.recordEditAsync(
      { label: 'Agent: render', pageId, rollbackOnThrow: true, verify: guard.verifyChange },
      async () => {
        editor.graph.createNode('TEXT', pageId, { name: 'Title', fontFamily: 'Comic Sans MS' })
      }
    )
    await expect(edit).rejects.toThrow('"Title"')
    expect(editor.graph.nodes.size).toBe(count)
    expect(editor.undo.canUndo).toBe(false)
  })

  test('an edit that cannot be put back keeps its step and reports the refusal as a warning', async () => {
    const { pageId } = setup()
    const guard = createDesignGuard(editor.graph)
    const result = await editor.recordEditAsync(
      {
        label: 'Agent: render',
        pageId,
        rollbackOnThrow: true,
        canRollBack: () => false,
        verify: guard.verifyChange
      },
      async () => {
        editor.graph.createNode('RECTANGLE', pageId, { name: 'Late', fills: solid(PINK) })
        return { ids: ['late'] }
      }
    )
    expect(editor.undo.canUndo).toBe(true)
    expect(guard.annotate(result)).toMatchObject({
      ids: ['late'],
      design_memory: {
        warnings: expect.stringContaining('could not be undone'),
        violations: [expect.objectContaining({ value: '#FF00AA', severity: 'warn' })]
      }
    })
  })

  test('a warned value goes through and the result says so', async () => {
    const { pageId } = setup()
    const guard = createDesignGuard(editor.graph)
    const result = await editor.recordEditAsync(
      { label: 'Agent: render', pageId, rollbackOnThrow: true, verify: guard.verifyChange },
      async () => {
        editor.graph.createNode('FRAME', pageId, { name: 'Stack', layoutMode: 'VERTICAL', itemSpacing: 13 })
        return { ok: true }
      }
    )
    expect(guard.annotate(result)).toMatchObject({
      ok: true,
      design_memory: { violations: [expect.objectContaining({ group: 'spacing', value: 13 })] }
    })
  })

  test('imported content only warns, and a document without a memory annotates nothing', async () => {
    const { pageId } = setup()
    const guard = createDesignGuard(editor.graph, { content: 'imported' })
    const result = await editor.recordEditAsync(
      { label: 'Agent: import_svg', pageId, rollbackOnThrow: true, verify: guard.verifyChange },
      async () => {
        editor.graph.createNode('RECTANGLE', pageId, { fills: solid(PINK) })
        return { ok: true }
      }
    )
    expect(guard.annotate(result)).toMatchObject({ design_memory: { violations: [expect.anything()] } })

    editor.setDesignMemory(null)
    const plain = createDesignGuard(editor.graph)
    const kept = await editor.recordEditAsync(
      { label: 'Agent: render', pageId, rollbackOnThrow: true, verify: plain.verifyChange },
      async () => {
        editor.graph.createNode('RECTANGLE', pageId, { fills: solid(PINK) })
        return { ok: true }
      }
    )
    expect(plain.annotate(kept)).toEqual({ ok: true })
  })
})
