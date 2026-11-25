import { describe, expect, test } from 'bun:test'

import { parsePenDocument, parsePenFile, writePenDocument } from '@pairdraw/pen'
import {
  addDesignDecision,
  allowDesignValue,
  cachedDesignMemory,
  createDesignMemory,
  pinDesignExample,
  readDesignMemory,
  writeDesignMemory,
  type DesignMemory
} from '@pairdraw/scene-graph/design-memory'

import { parseDocument } from './helpers/document'

const PAGE = [{ id: 'screen', type: 'frame' as const, width: 100, height: 100 }]

/** A document whose memory has a value in every group, a decision, and a pinned example. */
function memoryWithEverything(): DesignMemory {
  let memory = createDesignMemory()
  memory = allowDesignValue(memory, 'colors', '#1A73E8')
  memory = allowDesignValue(memory, 'fonts', 'Inter')
  memory = allowDesignValue(memory, 'fontSizes', 14)
  memory = allowDesignValue(memory, 'spacing', 16)
  memory = allowDesignValue(memory, 'radius', 8)
  memory = { ...memory, spacing: { ...memory.spacing, enforce: 'off' } }
  memory = addDesignDecision(memory, 'Cards use the 8px radius', 'person')
  memory = pinDesignExample(memory, 'screen')
  return memory
}

describe('a .pen file keeps the document’s design memory', () => {
  test('a memory written to the graph survives save and reload', () => {
    const graph = parseDocument(PAGE)
    const memory = memoryWithEverything()
    writeDesignMemory(graph, memory)

    const reopened = parsePenFile(writePenDocument(graph))

    expect(cachedDesignMemory(reopened)).toEqual(memory)
  })

  test('the written file holds the memory as a document field', () => {
    const graph = parseDocument(PAGE)
    const memory = memoryWithEverything()
    writeDesignMemory(graph, memory)

    const document = parsePenDocument(writePenDocument(graph))

    expect(document.designMemory).toEqual(memory)
  })

  test('a file without a memory opens without one and gains no field on save', () => {
    const graph = parseDocument(PAGE)
    expect(readDesignMemory(graph)).toBeNull()

    const document = parsePenDocument(writePenDocument(graph))

    expect(document.designMemory).toBeUndefined()
  })

  test('a memory this reader cannot use leaves the document readable and memory-less', () => {
    const graph = parseDocument(PAGE, {
      designMemory: { version: 1, colors: { values: 'red', enforce: 'refuse' } } as never
    })

    expect(readDesignMemory(graph)).toBeNull()
  })

  test('a memory stored beside token links keeps both', () => {
    const graph = parseDocument(PAGE, {
      variables: { 'var-1': { type: 'color', value: '#1A73E8' } },
      tokenSources: [
        { id: 'styles', kind: 'css', name: 'globals.css', path: 'src/styles.css', snapshot: {} }
      ]
    })
    const memory = memoryWithEverything()
    writeDesignMemory(graph, memory)

    const reopened = parsePenFile(writePenDocument(graph))
    const document = parsePenDocument(writePenDocument(graph))

    expect(cachedDesignMemory(reopened)).toEqual(memory)
    expect(document.tokenSources?.length).toBe(1)
  })
})
