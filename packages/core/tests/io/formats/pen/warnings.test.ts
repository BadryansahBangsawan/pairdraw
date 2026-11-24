import { describe, expect, test } from 'bun:test'

import { IORegistry, penFormat } from '@pairdraw/core/io'
import { parsePenDocument } from '@pairdraw/pen'

const io = new IORegistry([penFormat])

function penBytes(fields: Record<string, unknown>) {
  return new TextEncoder().encode(JSON.stringify({ version: '2.21', ...fields }))
}

/** Reads a document whose host has no file beside it. */
function read(fields: Record<string, unknown>) {
  return io.readDocument({ name: 'document.pen', data: penBytes(fields) })
}

describe('penFormat warnings', () => {
  test('names a variable the document references but does not define', async () => {
    const { graph, warnings } = await read({
      variables: { spacing: { type: 'number', value: 8 } },
      children: [
        {
          id: 'frame',
          type: 'frame',
          fill: '$missing-color',
          width: '$missing-width',
          height: '$spacing'
        }
      ]
    })

    // The document still opens with the same fallbacks.
    expect(graph.getNode('frame')).toMatchObject({ fills: [{ color: { r: 0, g: 0, b: 0, a: 1 } }] })
    const unknown = warnings?.find((item) => item.kind === 'unknown-variable')
    expect(unknown?.kind === 'unknown-variable' ? [...unknown.names].sort() : []).toEqual([
      'missing-color',
      'missing-width'
    ])
  })

  test('names an image file the host could not read', async () => {
    const { graph, warnings } = await read({
      children: [
        {
          id: 'photo',
          type: 'rectangle',
          fill: { type: 'image', url: './gone.png' },
          width: 40,
          height: 40
        }
      ]
    })

    // The paint is dropped as before.
    expect(graph.getNode('photo')?.fills).toEqual([])
    expect(warnings).toContainEqual({ kind: 'missing-image', urls: ['./gone.png'] })
  })

  test('names a node type the reader does not know', async () => {
    const { graph, warnings } = await read({
      children: [{ id: 'future', type: 'future-widget', width: 40, height: 40 }]
    })

    // It still reads as the placeholder frame it always did.
    expect(graph.getNode('future')?.type).toBe('FRAME')
    expect(warnings).toContainEqual({ kind: 'unknown-node', types: ['future-widget'] })
  })

  test('does not warn on the annotation types it reads as stickies', async () => {
    const { graph, warnings } = await read({
      children: [
        { id: 'n', type: 'note', width: 200, height: 120 },
        { id: 'p', type: 'prompt', width: 200, height: 120 },
        { id: 'c', type: 'context', width: 200, height: 120 }
      ]
    })

    // note, prompt, and context are the reader's own sticky cards, not unknown types.
    expect(graph.getNode('n')?.type).toBe('STICKY')
    expect(graph.getNode('p')?.type).toBe('STICKY')
    expect(graph.getNode('c')?.type).toBe('STICKY')
    expect(warnings ?? []).toEqual([])
  })

  test('deduplicates names and caps a long list', async () => {
    const children = Array.from({ length: 30 }, (_, index) => ({
      id: `frame-${index}`,
      type: 'frame',
      fill: `$missing-${index}`
    }))
    const { warnings } = await read({ children })

    const warning = warnings?.find((item) => item.kind === 'unknown-variable')
    expect(warning?.kind === 'unknown-variable' ? warning.names : []).toHaveLength(10)
  })
})

describe('penFormat save warnings', () => {
  test('warns instead of throwing when an effect has no Pencil.dev form', async () => {
    const { graph } = await read({
      children: [{ id: 'grain', type: 'rectangle', width: 40, height: 40 }]
    })
    graph.updateNode('grain', {
      effects: [
        {
          type: 'NOISE',
          color: { r: 0, g: 0, b: 0, a: 1 },
          visible: true,
          noise: { noiseType: 'MULTITONE', density: 0.5, noiseSize: { x: 1, y: 1 } }
        }
      ]
    })

    const saved = await io.writeDocument('pen', graph)

    expect(saved.warnings).toEqual([
      'Noise and texture effects were left out (1); Pencil.dev files have no form for them.'
    ])
    expect(parsePenDocument(String(saved.data)).children[0]?.effect).toBeUndefined()
  })
})
