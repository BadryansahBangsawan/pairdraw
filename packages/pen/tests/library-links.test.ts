import { describe, expect, test } from 'bun:test'

import {
  importedDocument,
  parsePenDocument,
  parsePenFile,
  writePenDocument,
  type PenDocument,
  type PenImports,
  type PenNode
} from '@pairdraw/pen'
import type { SceneGraph } from '@pairdraw/scene-graph'
import { swapInstanceComponent } from '@pairdraw/scene-graph/instances'

import { expectDefined, getNodeOrThrow } from './helpers/assert'
import { parseDocument } from './helpers/document'

const LIBRARY_PATH = '../library/ui.lib.pen'

/** A library whose component a consumer document draws. */
const library: PenDocument = {
  version: '2.21',
  children: [
    {
      id: 'button',
      type: 'frame',
      reusable: true,
      width: 120,
      height: 40,
      children: [{ id: 'label', type: 'text', content: 'Pay' }]
    }
  ]
}

const uiImports = (): PenImports =>
  new Map([['ui', importedDocument('ui', LIBRARY_PATH, library, new Map())]])

/** A consumer document that draws an instance of the imported component. */
const SCREEN: PenNode[] = [
  {
    id: 'screen',
    type: 'frame',
    width: 800,
    height: 300,
    children: [{ id: 'cta', type: 'ref', ref: 'ui:button', x: 24, y: 24 }]
  }
]

const imports = { ui: LIBRARY_PATH }

const publication = {
  libraryId: 'pen:ui',
  revisionId: LIBRARY_PATH,
  name: 'UI kit'
}

const binding = { libraryId: 'pen:ui', revisionId: LIBRARY_PATH, enabled: true }

/** A library whose component holds an icon a consumer can swap. */
const iconLibrary: PenDocument = {
  version: '2.21',
  children: [
    {
      id: 'button',
      type: 'frame',
      reusable: true,
      width: 64,
      height: 24,
      children: [
        { id: 'glyph', type: 'icon', library: 'lucide', icon: 'moon', width: 16, height: 16 }
      ]
    }
  ]
}

const iconImports = (): PenImports =>
  new Map([['ui', importedDocument('ui', LIBRARY_PATH, iconLibrary, new Map())]])

/** The component the first layer an instance shows is an instance of. */
function shownComponentName(graph: SceneGraph, instanceId: string): string | undefined {
  const copy = graph.getChildren(instanceId)[0]
  return copy?.componentId ? graph.getNode(copy.componentId)?.name : undefined
}

describe('a .pen file keeps the library links it declares', () => {
  test('writes back the imports the document declares', () => {
    const graph = parseDocument(SCREEN, { imports }, { imports: uiImports() })

    const document = parsePenDocument(writePenDocument(graph))

    expect(document.imports).toEqual(imports)
  })

  test('keeps an instance of an imported component as a ref that resolves on reopen', () => {
    const graph = parseDocument(SCREEN, { imports }, { imports: uiImports() })

    const reopened = parsePenFile(writePenDocument(graph), { imports: uiImports() })
    const cta = getNodeOrThrow(reopened, 'cta')

    expect(cta.type).toBe('INSTANCE')
    expect(cta.componentId).toBe('ui:button')
    expect(reopened.getNode('ui:button')?.name).not.toBe('ui:button')
  })

  test('keeps the fields an instance overrides on an imported component', () => {
    const screen: PenNode[] = [
      {
        id: 'cta',
        type: 'ref',
        ref: 'ui:button',
        descendants: { 'ui:label': { content: 'Buy' } }
      }
    ]
    const graph = parseDocument(screen, { imports }, { imports: uiImports() })

    const reopened = parsePenFile(writePenDocument(graph), { imports: uiImports() })
    const cta = getNodeOrThrow(reopened, 'cta')

    expect(cta.type).toBe('INSTANCE')
    const label = reopened.getChildren(cta.id).find((node) => node.type === 'TEXT')
    expect(label?.text).toBe('Buy')
  })

  test('keeps the libraries the document switched on and the library it publishes as', () => {
    const graph = parseDocument(SCREEN, {
      imports,
      enabledLibraries: [binding],
      sourceLibraryPublication: publication
    })

    const document = parsePenDocument(writePenDocument(graph))
    expect(document.enabledLibraries).toEqual([binding])
    expect(document.sourceLibraryPublication).toEqual(publication)

    const reopened = parsePenFile(writePenDocument(graph))
    expect(reopened.enabledLibraries.get('pen:ui')).toEqual(binding)
  })

  test('a file without library links gains none on save', () => {
    const graph = parseDocument([{ id: 'plain', type: 'rectangle', width: 10, height: 10 }])

    const text = writePenDocument(graph)

    expect(text).not.toContain('"imports"')
    expect(text).not.toContain('"enabledLibraries"')
    expect(text).not.toContain('"sourceLibraryPublication"')
  })

  test('library fields this reader cannot use leave the document readable', () => {
    const graph = parseDocument([{ id: 'plain', type: 'rectangle', width: 10, height: 10 }], {
      imports,
      enabledLibraries: 'every',
      sourceLibraryPublication: { libraryId: 'only-an-id' }
    } as never)

    const document = parsePenDocument(writePenDocument(graph))

    expect(document.children.length).toBe(1)
    expect(document.imports).toEqual(imports)
    expect(document.enabledLibraries).toBeUndefined()
    expect(document.sourceLibraryPublication).toBeUndefined()
  })

  test('warns once that enabled libraries need re-enabling after reopening', () => {
    const warnings: string[] = []
    const graph = parseDocument(SCREEN, { imports, enabledLibraries: [binding] })

    writePenDocument(graph, { warnings })

    expect(warnings.filter((warning) => warning.includes('re-enable')).length).toBe(1)
  })

  test('does not warn for a document with no enabled library', () => {
    const warnings: string[] = []
    const graph = parseDocument(SCREEN, { imports })

    writePenDocument(graph, { warnings })

    expect(warnings.filter((warning) => warning.includes('re-enable')).length).toBe(0)
  })

  test('writes the icon an imported instance swaps in, and draws it on reopen', () => {
    const screen: PenNode[] = [
      { id: 'cta', type: 'ref', ref: 'ui:button', descendants: { 'ui:glyph': { icon: 'star' } } }
    ]
    const graph = parseDocument(screen, { imports }, { imports: iconImports() })
    const before = shownComponentName(graph, 'cta')
    expect(before).toContain('star')

    const document = parsePenDocument(writePenDocument(graph))
    expect(document.children[0]?.descendants).toEqual({
      'ui:glyph': { library: 'lucide', icon: 'star' }
    })
    expect(writePenDocument(graph)).not.toContain('iconOrigin')

    const reopened = parsePenFile(writePenDocument(graph), { imports: iconImports() })
    expect(shownComponentName(reopened, 'cta')).toBe(before)
  })

  test('writes an imported instance whose nested layer swaps to a plain layer as a frame', () => {
    const graph = parseDocument(
      [
        { id: 'other', type: 'frame', reusable: true, width: 10, height: 10, fill: '#FFCC00' },
        { id: 'cta', type: 'ref', ref: 'ui:button' }
      ],
      { imports },
      { imports: iconImports() }
    )
    swapInstanceComponent(graph, expectDefined(graph.getChildren('cta')[0]).id, 'other')

    const document = parsePenDocument(writePenDocument(graph))
    expect(document.children.find((node) => node.id === 'cta')?.type).toBe('frame')
    const reopened = parsePenFile(writePenDocument(graph), { imports: iconImports() })
    expect(getNodeOrThrow(reopened, 'cta').type).toBe('FRAME')
  })
})
