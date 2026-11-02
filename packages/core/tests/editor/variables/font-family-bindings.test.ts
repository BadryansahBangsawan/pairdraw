import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor } from '@open-pencil/core'
import { SceneGraph } from '@open-pencil/scene-graph'
import { setInstanceOverride } from '@open-pencil/scene-graph/instances/overrides'
import { variableFontFamily } from '@open-pencil/scene-graph/variables'

import { fontManager } from '#core/text/font/manager'

// Figma desktop 126: a text layer's font family binds to a text variable; switching the
// collection's mode or editing the variable sets the family it names, and the editor loads it.

function brandedText() {
  const graph = new SceneGraph()
  const brand = graph.createCollection('Brand')
  const serif = graph.createMode(brand.id, 'Serif') ?? ''
  const family = graph.createVariable('Type/Family', 'STRING', brand.id, 'Inter')
  family.valuesByMode[serif] = 'Lora'
  const page = graph.getPages()[0].id
  const text = graph.createNode('TEXT', page, { text: 'Hello', fontFamily: 'Roboto' })
  return { graph, editor: createEditor({ graph }), brand, serif, family, text }
}

test('binding a font family sets the family the variable names, and undo puts it back', () => {
  const { editor, family, text } = brandedText()

  editor.bindVariable(text.id, 'fontFamily', family.id)
  expect(text.fontFamily).toBe('Inter')
  expect(text.boundVariables.fontFamily).toBe(family.id)

  editor.undo.undo()
  expect(text.fontFamily).toBe('Roboto')
  expect(text.boundVariables.fontFamily).toBeUndefined()

  editor.undo.redo()
  expect(text.fontFamily).toBe('Inter')
})

test('a bound font family follows the mode the collection shows', () => {
  const { editor, brand, serif, family, text } = brandedText()
  editor.bindVariable(text.id, 'fontFamily', family.id)

  editor.setActiveMode(brand.id, serif)
  expect(text.fontFamily).toBe('Lora')

  editor.setActiveMode(brand.id, brand.defaultModeId)
  expect(text.fontFamily).toBe('Inter')
})

test('a bound font family follows a mode set on the layer', () => {
  const { editor, brand, serif, family, text } = brandedText()
  editor.bindVariable(text.id, 'fontFamily', family.id)

  editor.updateNodeWithUndo(text.id, { variableModes: { [brand.id]: serif } }, 'Set mode')

  expect(text.fontFamily).toBe('Lora')
})

test('a bound font family follows an edited value and its undo', () => {
  const { editor, brand, family, text } = brandedText()
  editor.bindVariable(text.id, 'fontFamily', family.id)

  editor.updateVariableValue(family.id, brand.defaultModeId, '  Space Grotesk ')
  expect(text.fontFamily).toBe('Space Grotesk')

  editor.undo.undo()
  expect(text.fontFamily).toBe('Inter')
})

test('a variable naming no family leaves the family as it is', () => {
  const { editor, brand, family, text } = brandedText()
  editor.bindVariable(text.id, 'fontFamily', family.id)

  editor.updateVariableValue(family.id, brand.defaultModeId, '   ')

  expect(text.fontFamily).toBe('Inter')
  expect(variableFontFamily('')).toBeUndefined()
  expect(variableFontFamily(12)).toBeUndefined()
})

test('a range of characters bound to a family follows the mode too', () => {
  const { graph, editor, brand, serif, family, text } = brandedText()
  graph.updateNode(text.id, {
    styleRuns: [
      {
        start: 0,
        length: 2,
        style: { fontFamily: 'Roboto', boundVariables: { fontFamily: family.id } }
      }
    ]
  })

  editor.setActiveMode(brand.id, serif)

  expect(expectDefined(graph.getNode(text.id)).styleRuns[0]?.style.fontFamily).toBe('Lora')
})

test('a font family an instance overrides keeps its own value', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0].id
  const brand = graph.createCollection('Brand')
  const family = graph.createVariable('Family', 'STRING', brand.id, 'Inter')
  const card = graph.createNode('COMPONENT', page)
  graph.createNode('TEXT', card.id, {
    text: 'Title',
    fontFamily: 'Inter',
    boundVariables: { fontFamily: family.id }
  })
  const placed = expectDefined(graph.createInstance(card.id, page))
  const layer = expectDefined(graph.getNode(placed.childIds[0]))
  const editor = createEditor({ graph })

  setInstanceOverride(placed.instanceOverrides, placed.id, layer.id, 'fontFamily', 'Lora')
  graph.updateNode(layer.id, { fontFamily: 'Lora' })

  editor.updateVariableValue(family.id, brand.defaultModeId, 'Space Grotesk')

  expect(layer.fontFamily).toBe('Lora')
})

test('a mode that names another family loads its fonts', () => {
  const { graph, brand, serif, family, text } = brandedText()
  const asked: string[] = []
  const editor = createEditor({
    graph,
    loadFont: async (name) => {
      asked.push(name)
      return null
    }
  })
  editor.bindVariable(text.id, 'fontFamily', family.id)

  editor.setActiveMode(brand.id, serif)

  expect(asked).toContain('Lora')
})

test('a mode loads the bound face a layer draws with, even when another face of the family is loaded', async () => {
  // A family no other test loads, so the shared font manager starts with only its Regular.
  const serifFamily = 'Bound Test Serif'
  const inter = expectDefined(await fontManager.fetchBundledFont('/InterVariable.ttf'), 'Inter')
  await fontManager.markLoaded(serifFamily, 'Regular', inter)
  const { graph, brand, serif, family, text } = brandedText()
  family.valuesByMode[serif] = serifFamily
  graph.updateNode(text.id, { fontWeight: 700 })
  const asked: string[] = []
  const editor = createEditor({
    graph,
    loadFont: async (name, style) => {
      asked.push(`${name}|${style}`)
      return null
    }
  })
  editor.bindVariable(text.id, 'fontFamily', family.id)

  editor.setActiveMode(brand.id, serif)

  expect(text.fontFamily).toBe(serifFamily)
  expect(asked).toContain(`${serifFamily}|Bold`)
})
