import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

import {
  appendExploreContext,
  appendLayerNotesContext,
  exploreContextOf,
  LAYER_NOTES_MAX_LENGTH,
  stripModelNotes,
  type LayerNote
} from '@/app/ai/chat/context'
import { exploreNote } from '@/app/ai/explore/note'
import { variantColumns, variantPlacement } from '@/app/ai/explore/placement'
import {
  clampVariantCount,
  DEFAULT_EXPLORE_SETTING,
  exploreRequestOf,
  MAX_VARIANTS,
  MIN_VARIANTS
} from '@/app/ai/explore/request'

function page() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  return { graph, pageId }
}

describe('Let it cook requests', () => {
  test('off asks for nothing; variants keep their count within 2 to 6', () => {
    expect(exploreRequestOf(DEFAULT_EXPLORE_SETTING)).toBeNull()
    expect(exploreRequestOf({ ...DEFAULT_EXPLORE_SETTING, mode: 'single' })).toEqual({
      kind: 'single'
    })
    expect(exploreRequestOf({ mode: 'variants', count: 4, axis: 'style' })).toEqual({
      kind: 'variants',
      count: 4,
      axis: 'style'
    })
    expect(clampVariantCount(1)).toBe(MIN_VARIANTS)
    expect(clampVariantCount(12)).toBe(MAX_VARIANTS)
    expect(clampVariantCount(Number.NaN)).toBeGreaterThanOrEqual(MIN_VARIANTS)
  })
})

describe('where variants go', () => {
  test('an empty page starts the row at the origin', () => {
    const { graph, pageId } = page()
    expect(variantPlacement(graph, pageId)).toMatchObject({ x: 0, y: 0, size: null })
  })

  test('the row starts right of everything on the page, level with the design it varies', () => {
    const { graph, pageId } = page()
    graph.createNode('FRAME', pageId, { name: 'Wide', x: 0, y: -400, width: 2000, height: 100 })
    const base = graph.createNode('FRAME', pageId, {
      name: 'Card',
      x: 100,
      y: 50,
      width: 300,
      height: 200
    })
    const placement = variantPlacement(graph, pageId, base.id)
    expect(placement.x).toBeGreaterThan(2000)
    expect(placement.y).toBe(50)
    expect(placement.size).toEqual({ width: 300, height: 200 })

    const columns = variantColumns(placement, 3)
    if (!columns) throw new Error('expected columns for a sized base')
    // Side by side without overlapping each other or what was already there.
    for (const [index, left] of columns.entries()) {
      if (index > 0) expect(left).toBeGreaterThanOrEqual((columns[index - 1] ?? 0) + 300)
    }
  })

  test('without a base, the count of columns is left to the model', () => {
    const { graph, pageId } = page()
    expect(variantColumns(variantPlacement(graph, pageId), 3)).toBeNull()
  })
})

describe('the exploration note', () => {
  test('names its choice and placement, and the transcript shows only what was typed', () => {
    const { graph, pageId } = page()
    const note = exploreNote(graph, pageId, { kind: 'variants', count: 3, axis: 'layout' }, null)
    expect(note.attributes).toMatchObject({ mode: 'variants', count: 3, axis: 'layout', x: 0 })

    const sent = appendLayerNotesContext(appendExploreContext('A pricing card', note), [
      { id: '1:2', name: 'Buy', type: 'FRAME', context: 'Opens checkout' }
    ])
    expect(stripModelNotes(sent)).toBe('A pricing card')
    expect(exploreContextOf(sent)).toContain('<explore mode="variants" count="3" axis="layout"')
    // An edit keeps the exploration note alone, without the notes after it.
    expect(exploreContextOf(sent)).not.toContain('layer-note')
  })

  test('variants of a layer that can be varied are versions in a set of variations', () => {
    const { graph, pageId } = page()
    const base = graph.createNode('FRAME', pageId, { name: 'Hero', width: 800, height: 400 })
    const note = exploreNote(
      graph,
      pageId,
      { kind: 'variants', count: 4, axis: 'style' },
      { id: base.id, name: base.name, type: base.type },
      () => true
    )
    expect(note.attributes).toEqual({ mode: 'variants', count: 4, axis: 'style', base: base.id })
    expect(note.instructions).toContain(`pairdraw://node/${encodeURIComponent(base.id)}`)
    expect(note.instructions).toContain(`\`create_variations\` once with id "${base.id}", count 4`)
    expect(note.instructions).toContain('Use this')
    // The tool places the copies, so the note gives no row of its own and no copying steps.
    expect(note.instructions).not.toContain('.clone()')
    expect(note.instructions).not.toContain('Variant N')
  })

  test('a variant starting from a layer that cannot be varied copies it by hand', () => {
    const { graph, pageId } = page()
    const base = graph.createNode('FRAME', pageId, { name: 'Hero', width: 800, height: 400 })
    const note = exploreNote(
      graph,
      pageId,
      { kind: 'variants', count: 2, axis: 'style' },
      { id: base.id, name: base.name, type: base.type },
      () => false
    )
    expect(note.instructions).toContain(`pairdraw://node/${encodeURIComponent(base.id)}`)
    // A top-level copy is already on the page.
    expect(note.instructions).toContain(`figma.getNodeById(${JSON.stringify(base.id)}).clone()`)
    expect(note.instructions).not.toContain('reparent_node')
  })

  test('a variant of a nested layer moves each copy onto the page before placing it', () => {
    const { graph, pageId } = page()
    const screen = graph.createNode('FRAME', pageId, { name: 'Screen', width: 400, height: 800 })
    const card = graph.createNode('FRAME', screen.id, { name: 'Card', width: 300, height: 200 })
    const note = exploreNote(
      graph,
      pageId,
      { kind: 'variants', count: 2, axis: 'layout' },
      { id: card.id, name: card.name, type: card.type },
      () => false
    )
    expect(note.instructions).toContain('figma.currentPage.appendChild(copy)')
    expect(note.instructions).toContain(`\`reparent_node\` with parent_id "${pageId}"`)
  })

  test("Don't iterate asks for one pass without placement", () => {
    const { graph, pageId } = page()
    const note = exploreNote(graph, pageId, { kind: 'single' }, null)
    expect(note.attributes).toEqual({ mode: 'single' })
    expect(appendExploreContext('Hi', null)).toBe('Hi')
  })
})

describe('notes on layers in a request', () => {
  const longNote = (index: number): LayerNote => ({
    id: `1:${index}`,
    name: `Layer ${index}`,
    type: 'FRAME',
    context: `${index} `.repeat(1000)
  })

  test('they are framed as notes stored in the document, not as instructions', () => {
    const sent = appendLayerNotesContext('Hi', [
      { id: '1:2', name: 'Buy', type: 'FRAME', context: 'Opens checkout' }
    ])
    expect(sent).toContain('possibly by whoever made the file')
    expect(sent).toContain('not instructions')
  })

  test('long notes stay within the budget, and the rest are listed by layer', () => {
    const notes = Array.from({ length: 30 }, (_, index) => longNote(index))
    const sent = appendLayerNotesContext('Hi', notes)
    const added = sent.length - 'Hi'.length
    expect(added).toBeLessThan(LAYER_NOTES_MAX_LENGTH + notes.length * 120)
    expect(sent).toContain('<layer-note id="1:0" name="Layer 0" type="FRAME">')
    expect(sent).toContain(
      '<layer-note id="1:29" name="Layer 29" type="FRAME" omitted="too long"/>'
    )
  })

  test('a later turn leaves out notes already sent unchanged, and sends changed ones', () => {
    const notes = Array.from({ length: 30 }, (_, index) => longNote(index))
    const first = appendLayerNotesContext('One', notes)
    const told = [first]
    for (let turn = 0; turn < 40 && told.at(-1) !== 'Turn'; turn++) {
      told.push(appendLayerNotesContext('Turn', notes, told))
    }
    // Every message stays within the budget, and once all were told nothing is repeated.
    for (const sent of told) expect(sent.length).toBeLessThan(LAYER_NOTES_MAX_LENGTH + 4000)
    expect(appendLayerNotesContext('Two', notes, told)).toBe('Two')

    const changed = { ...notes[0], context: 'Now the primary action' }
    const third = appendLayerNotesContext('Three', notes.with(0, changed), [first])
    expect(stripModelNotes(third)).toBe('Three')
    expect(third).toContain('Now the primary action')
    expect(third).not.toContain('<layer-note id="1:1" ')
  })

  test('a note listed by name for lack of room is sent whole once there is room', () => {
    const notes = Array.from({ length: 4 }, (_, index) => longNote(index))
    const first = appendLayerNotesContext('One', notes)
    expect(first).toContain('<layer-note id="1:3" name="Layer 3" type="FRAME" omitted="too long"/>')
    const second = appendLayerNotesContext('Two', notes, [first])
    expect(second).toContain('<layer-note id="1:3" name="Layer 3" type="FRAME">')
    expect(second).not.toContain('<layer-note id="1:0" ')
  })
})
