import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'

import { styleKitFromDocument } from '@/app/ai/chat/pins/document'
import {
  draftHasContent,
  draftOf,
  normalizeKitColor,
  parseFontList,
  styleKitFromDraft,
  withDocumentStyles
} from '@/app/ai/chat/pins/kit'
import { MAX_STYLE_KIT_COLORS } from '@/app/ai/chat/pins/limits'

describe('style kit editing', () => {
  test('colours are stored as hex, whatever CSS colour was typed', () => {
    expect(normalizeKitColor('#ff5b2e')).toBe('#FF5B2E')
    expect(normalizeKitColor(' rgb(0 0 0 / 50%) ')).toBe('#00000080')
    expect(normalizeKitColor('not a colour')).toBeNull()
  })

  test("the document's styles join what the person already wrote", () => {
    const draft = {
      name: '',
      colors: [{ name: 'Mine', hex: '#111111' }],
      fonts: 'Fraunces',
      notes: 'Calm'
    }
    const merged = withDocumentStyles(draft, {
      name: 'Landing styles',
      colors: [
        { name: 'Ink', hex: '#111111' },
        { name: 'Accent', hex: '#FF5B2E' }
      ],
      fonts: ['Inter', 'Fraunces'],
      notes: ''
    })
    expect(merged).toEqual({
      name: 'Landing styles',
      colors: [
        { name: 'Mine', hex: '#111111' },
        { name: 'Accent', hex: '#FF5B2E' }
      ],
      fonts: 'Fraunces, Inter',
      notes: 'Calm'
    })

    const many = Array.from({ length: MAX_STYLE_KIT_COLORS }, (_, index) => ({
      name: '',
      hex: `#0000${index.toString(16).padStart(2, '0').toUpperCase()}`
    }))
    const full = withDocumentStyles(
      { ...draft, colors: many },
      { name: '', colors: [{ name: 'Extra', hex: '#FFFFFF' }], fonts: [], notes: '' }
    )
    expect(full.colors).toHaveLength(MAX_STYLE_KIT_COLORS)
    expect(full.colors.at(-1)?.hex).not.toBe('#FFFFFF')
  })

  test('fonts are read from a comma-separated list, each once', () => {
    expect(parseFontList(' Inter, Fraunces ,,Inter ')).toEqual(['Inter', 'Fraunces'])
  })

  test('an empty draft pins nothing; a named one keeps its name', () => {
    expect(draftHasContent(draftOf(null))).toBe(false)
    const draft = { ...draftOf(null), fonts: 'Inter', notes: '  Calm  ' }
    expect(draftHasContent(draft)).toBe(true)
    expect(styleKitFromDraft(draft, 'Style kit')).toEqual({
      name: 'Style kit',
      colors: [],
      fonts: ['Inter'],
      notes: 'Calm'
    })
    expect(styleKitFromDraft({ ...draft, name: ' Brand ' }, 'Style kit').name).toBe('Brand')
  })
})

describe('style kit from the document', () => {
  test('takes the colour variables and the fonts the text uses', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    if (!page) throw new Error('Missing page')
    const collection = graph.createCollection('Brand')
    graph.createVariable('Accent', 'COLOR', collection.id, { r: 1, g: 0, b: 0, a: 1 })
    const text = graph.createNode('TEXT', page.id, { name: 'Title', text: 'Hi' })
    graph.updateNode(text.id, { fontFamily: 'Fraunces' })

    const kit = styleKitFromDocument(graph, 'Doc styles')
    expect(kit.name).toBe('Doc styles')
    expect(kit.colors).toEqual([{ name: 'Accent', hex: '#FF0000' }])
    expect(kit.fonts).toContain('Fraunces')
  })

  test('without colour variables, takes the fills the document uses most', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    if (!page) throw new Error('Missing page')
    const fill = (r: number) => ({
      type: 'SOLID' as const,
      color: { r, g: 0, b: 0, a: 1 },
      opacity: 1,
      visible: true
    })
    for (const r of [0, 0, 1]) {
      graph.createNode('RECTANGLE', page.id, { name: 'Box', fills: [fill(r)] })
    }
    const kit = styleKitFromDocument(graph, 'Doc')
    expect(kit.colors.map((color) => color.hex)).toEqual(['#000000', '#FF0000'])
  })
})
