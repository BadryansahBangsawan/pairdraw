import { describe, expect, test } from 'bun:test'

import { planClipboardImport, type ClipboardSnapshot } from '@open-pencil/core'

import { createEditorStore } from '@/app/editor/session/create'

import { expectDefined } from '#tests/helpers/assert'

type Store = ReturnType<typeof createEditorStore>

const RED = { r: 1, g: 0, b: 0, a: 1 }
const BLUE = { r: 0, g: 0, b: 1, a: 1 }
const GREEN = { r: 0, g: 1, b: 0, a: 1 }
const BLACK = { r: 0, g: 0, b: 0, a: 1 }

function solid(color: typeof BLACK) {
  return {
    type: 'SOLID' as const,
    color,
    opacity: 1,
    visible: true
  }
}

/** A rectangle bound to a `Spacing/Radius` number and a `Brand/Primary` color, copied. */
async function copiedBoundRectangle(): Promise<{ source: Store; snapshot: ClipboardSnapshot }> {
  const source = createEditorStore()
  const spacing = source.graph.createCollection('Spacing')
  const radius = source.graph.createVariable('Radius', 'FLOAT', spacing.id, 12)
  const brand = source.graph.createCollection('Brand')
  const primary = source.graph.createVariable('Primary', 'COLOR', brand.id, RED)
  const node = source.graph.createNode('RECTANGLE', source.state.currentPageId, {
    cornerRadius: 12,
    // A bound paint keeps whatever it last stored; the variable decides what it draws.
    fills: [solid(BLACK)],
    boundVariables: { cornerRadius: radius.id, 'fills/0/color': primary.id }
  })
  source.select([node.id])
  const { snapshot } = await source.prepareCopy()
  return { source, snapshot: expectDefined(snapshot, 'snapshot') }
}

function pastedNode(target: Store) {
  return expectDefined(target.graph.getNode([...target.state.selectedIds][0]), 'pasted layer')
}

function sorted(values: string[]) {
  return values.toSorted((left, right) => left.localeCompare(right))
}

function collectionNames(target: Store) {
  return sorted([...target.graph.variableCollections.values()].map(({ name }) => name))
}

describe('planClipboardImport', () => {
  test('a copy from the same document brings nothing to ask about', async () => {
    const { source, snapshot } = await copiedBoundRectangle()
    expect(planClipboardImport(source.graph, snapshot)).toEqual({ collections: [], styles: [] })
  })

  test('lists the collections a copy brings and which ones the document already has', async () => {
    const { snapshot } = await copiedBoundRectangle()
    const target = createEditorStore()
    const existing = target.graph.createCollection('Spacing')
    const plan = planClipboardImport(target.graph, snapshot)
    expect(
      plan.collections.map(({ name, variableCount, existing: match }) => [
        name,
        variableCount,
        match?.id ?? null
      ])
    ).toEqual([
      ['Spacing', 1, existing.id],
      ['Brand', 1, null]
    ])
  })

  test('leaves library collections alone, as the design-token import does', async () => {
    const { snapshot } = await copiedBoundRectangle()
    const target = createEditorStore()
    const library = target.graph.createCollection('Spacing')
    library.key = 'library-key'
    const plan = planClipboardImport(target.graph, snapshot)
    expect(plan.collections[0]?.existing).toBeNull()
  })
})

describe('pasting from another document', () => {
  test('Use existing binds to the same-named variables and adds no duplicate collection', async () => {
    const { snapshot } = await copiedBoundRectangle()
    const target = createEditorStore()
    const spacing = target.graph.createCollection('Spacing')
    const radius = target.graph.createVariable('Radius', 'FLOAT', spacing.id, 4)

    await target.pasteSnapshot(snapshot, undefined, { dependencies: { mode: 'import' } })
    await target.pasteSnapshot(snapshot, undefined, { dependencies: { mode: 'import' } })

    expect(pastedNode(target).boundVariables.cornerRadius).toBe(radius.id)
    // The layer shows the existing variable's value, not the copied one.
    expect(pastedNode(target).cornerRadius).toBe(4)
    expect(collectionNames(target)).toEqual(['Brand', 'Spacing'])
    expect(target.graph.variables.size).toBe(2)
    expect(spacing.variableIds).toEqual([radius.id])

    target.undo.undo()
    target.undo.redo()
    expect(pastedNode(target).cornerRadius).toBe(4)
  })

  test('Use existing adds a missing variable to the existing collection, and undo takes it out', async () => {
    const { snapshot } = await copiedBoundRectangle()
    const target = createEditorStore()
    const spacing = target.graph.createCollection('Spacing')
    const gap = target.graph.createVariable('Gap', 'FLOAT', spacing.id, 8)

    await target.pasteSnapshot(snapshot, undefined, { dependencies: { mode: 'import' } })

    const bound = expectDefined(pastedNode(target).boundVariables.cornerRadius, 'binding')
    const added = expectDefined(target.graph.variables.get(bound), 'added variable')
    expect(added.collectionId).toBe(spacing.id)
    expect(added.valuesByMode[spacing.defaultModeId]).toBe(12)
    expect(spacing.variableIds).toEqual([gap.id, bound])

    target.undo.undo()
    expect(target.graph.variables.has(bound)).toBe(false)
    expect(spacing.variableIds).toEqual([gap.id])
    expect(target.graph.variableCollections.has(spacing.id)).toBe(true)
    target.undo.redo()
    expect(spacing.variableIds).toEqual([gap.id, bound])
  })

  test('Add renamed imports a conflicting collection under a free name', async () => {
    const { snapshot } = await copiedBoundRectangle()
    const target = createEditorStore()
    const spacing = target.graph.createCollection('Spacing')
    const radius = target.graph.createVariable('Radius', 'FLOAT', spacing.id, 4)
    const plan = planClipboardImport(target.graph, snapshot)
    const conflict = expectDefined(plan.collections[0], 'conflict')

    await target.pasteSnapshot(snapshot, undefined, {
      dependencies: { mode: 'import', resolutions: { [conflict.id]: 'add-renamed' } }
    })

    const bound = expectDefined(pastedNode(target).boundVariables.cornerRadius, 'binding')
    expect(bound).not.toBe(radius.id)
    const imported = expectDefined(target.graph.variables.get(bound), 'imported variable')
    expect(target.graph.variableCollections.get(imported.collectionId)?.name).toBe('Spacing 2')
    expect(collectionNames(target)).toEqual(['Brand', 'Spacing', 'Spacing 2'])
  })

  test('a same-named variable of another type is added beside it under a free name', async () => {
    const { snapshot } = await copiedBoundRectangle()
    const target = createEditorStore()
    const spacing = target.graph.createCollection('Spacing')
    target.graph.createVariable('Radius', 'STRING', spacing.id, 'large')

    await target.pasteSnapshot(snapshot, undefined, { dependencies: { mode: 'import' } })

    const bound = expectDefined(pastedNode(target).boundVariables.cornerRadius, 'binding')
    expect(target.graph.variables.get(bound)).toMatchObject({
      name: 'Radius 2',
      type: 'FLOAT',
      collectionId: spacing.id
    })
  })

  test('modes match by name, and a layer set to a mode the document lacks inherits', async () => {
    const source = createEditorStore()
    const theme = source.graph.createCollection('Theme')
    const darkId = crypto.randomUUID()
    const dimId = crypto.randomUUID()
    source.graph.addMode(theme.id, darkId, 'Dark')
    source.graph.addMode(theme.id, dimId, 'Dim')
    const surface = source.graph.createVariable('Surface', 'COLOR', theme.id, RED)
    const dark = source.graph.createNode('FRAME', source.state.currentPageId, {
      variableModes: { [theme.id]: darkId },
      boundVariables: { 'fills/0/color': surface.id },
      fills: [solid(RED)]
    })
    const dim = source.graph.createNode('FRAME', source.state.currentPageId, {
      variableModes: { [theme.id]: dimId }
    })
    source.select([dark.id, dim.id])
    const snapshot = expectDefined((await source.prepareCopy()).snapshot, 'snapshot')

    const target = createEditorStore()
    const targetTheme = target.graph.createCollection('Theme')
    const targetDark = crypto.randomUUID()
    target.graph.addMode(targetTheme.id, targetDark, 'Dark')

    await target.pasteSnapshot(snapshot, undefined, { dependencies: { mode: 'import' } })

    const pasted = [...target.state.selectedIds].map((id) =>
      expectDefined(target.graph.getNode(id), 'pasted frame')
    )
    expect(pasted.map((node) => node.variableModes)).toEqual([{ [targetTheme.id]: targetDark }, {}])
    const added = expectDefined(
      target.graph.variables.get(pasted[0].boundVariables['fills/0/color']),
      'added variable'
    )
    expect(sorted(Object.keys(added.valuesByMode))).toEqual(
      sorted([targetTheme.defaultModeId, targetDark])
    )
  })

  test('a layer whose mode the document lacks shows the value of the mode it inherits', async () => {
    const source = createEditorStore()
    const theme = source.graph.createCollection('Theme')
    const darkId = crypto.randomUUID()
    source.graph.addMode(theme.id, darkId, 'Dark')
    const radius = source.graph.createVariable('Radius', 'FLOAT', theme.id, 2)
    radius.valuesByMode[darkId] = 20
    const card = source.graph.createNode('RECTANGLE', source.state.currentPageId, {
      cornerRadius: 20,
      variableModes: { [theme.id]: darkId },
      boundVariables: { cornerRadius: radius.id }
    })
    source.select([card.id])
    const snapshot = expectDefined((await source.prepareCopy()).snapshot, 'snapshot')
    const target = createEditorStore()
    target.graph.createCollection('Theme')

    await target.pasteSnapshot(snapshot, undefined, { dependencies: { mode: 'import' } })

    expect(pastedNode(target).variableModes).toEqual({})
    expect(pastedNode(target).cornerRadius).toBe(2)
  })

  test('Paste as is keeps the values the layer showed and links to nothing', async () => {
    const { snapshot } = await copiedBoundRectangle()
    const target = createEditorStore()

    await target.pasteSnapshot(snapshot, undefined, { dependencies: { mode: 'as-is' } })

    const pasted = pastedNode(target)
    expect(pasted.boundVariables).toEqual({})
    expect(pasted.cornerRadius).toBe(12)
    expect(pasted.fills[0]?.color).toEqual(RED)
    expect(target.graph.variables.size).toBe(0)
    expect(target.graph.variableCollections.size).toBe(0)
  })

  test('without a choice every collection is added, as before', async () => {
    const { snapshot } = await copiedBoundRectangle()
    const target = createEditorStore()
    target.graph.createCollection('Spacing')

    await target.pasteSnapshot(snapshot)

    expect(collectionNames(target)).toEqual(['Brand', 'Spacing', 'Spacing'])
  })
})

describe('pasting properties from another document', () => {
  test('binds to a same-named collection instead of adding it again', async () => {
    const { snapshot } = await copiedBoundRectangle()
    const target = createEditorStore()
    const spacing = target.graph.createCollection('Spacing')
    const radius = target.graph.createVariable('Radius', 'FLOAT', spacing.id, 4)
    const layer = target.graph.createNode('RECTANGLE', target.state.currentPageId)
    target.select([layer.id])

    await target.pastePropertiesFromSnapshot(snapshot)
    await target.pastePropertiesFromSnapshot(snapshot)

    expect(target.graph.getNode(layer.id)?.boundVariables.cornerRadius).toBe(radius.id)
    expect(target.graph.getNode(layer.id)?.cornerRadius).toBe(4)
    expect(collectionNames(target)).toEqual(['Brand', 'Spacing'])
  })

  test('the pasted look resolves against this document again on redo', async () => {
    const { snapshot } = await copiedBoundRectangle()
    const target = createEditorStore()
    const spacing = target.graph.createCollection('Spacing')
    target.graph.createVariable('Radius', 'FLOAT', spacing.id, 4)
    const layer = target.graph.createNode('RECTANGLE', target.state.currentPageId)
    target.select([layer.id])

    await target.pastePropertiesFromSnapshot(snapshot)
    target.undo.undo()
    expect(target.graph.getNode(layer.id)?.cornerRadius).toBe(0)
    target.undo.redo()
    expect(target.graph.getNode(layer.id)?.cornerRadius).toBe(4)
  })
})

describe('styles from another document', () => {
  async function copiedStyledRectangle() {
    const source = createEditorStore()
    const definition = source.graph.createNode('RECTANGLE', source.state.currentPageId, {
      name: 'Brand/Primary',
      sharedStyleType: 'FILL',
      internalOnly: true,
      fills: [solid(BLUE)]
    })
    source.graph.preserveSourceMetadataDuring(() =>
      source.graph.updateNode(definition.id, {
        source: { ...definition.source, format: 'fig', id: 'source:style' }
      })
    )
    const node = source.graph.createNode('RECTANGLE', source.state.currentPageId, {
      fillStyleId: 'source:style',
      fills: [solid(BLUE)]
    })
    source.select([node.id])
    return expectDefined((await source.prepareCopy()).snapshot, 'snapshot')
  }

  function targetWithStyle() {
    const target = createEditorStore()
    const style = target.graph.createNode('RECTANGLE', target.state.currentPageId, {
      name: 'Brand/Primary',
      sharedStyleType: 'FILL',
      internalOnly: true,
      fills: [solid(GREEN)]
    })
    target.graph.preserveSourceMetadataDuring(() =>
      target.graph.updateNode(style.id, {
        source: { ...style.source, format: 'fig', id: 'target:style' }
      })
    )
    return target
  }

  function styleNames(target: Store) {
    return [...target.graph.getAllNodes()].flatMap((node) =>
      node.sharedStyleType ? [node.name] : []
    )
  }

  test('Use existing links the layer to the document’s style of the same name', async () => {
    const snapshot = await copiedStyledRectangle()
    const target = targetWithStyle()
    expect(planClipboardImport(target.graph, snapshot).styles).toEqual([
      {
        id: 'source:style',
        name: 'Brand/Primary',
        type: 'FILL',
        existing: { id: 'target:style', name: 'Brand/Primary' }
      }
    ])

    await target.pasteSnapshot(snapshot, undefined, { dependencies: { mode: 'import' } })

    expect(pastedNode(target).fillStyleId).toBe('target:style')
    // The layer looks like the style it now uses.
    expect(pastedNode(target).fills[0]?.color).toEqual(GREEN)
    expect(styleNames(target)).toEqual(['Brand/Primary'])
  })

  test('Use existing gives characters the look of the document’s styles they now use', async () => {
    const source = createEditorStore()
    const definition = source.graph.createNode('RECTANGLE', source.state.currentPageId, {
      name: 'Brand/Primary',
      sharedStyleType: 'FILL',
      internalOnly: true,
      fills: [solid(BLUE)]
    })
    source.graph.preserveSourceMetadataDuring(() =>
      source.graph.updateNode(definition.id, {
        source: { ...definition.source, format: 'fig', id: 'source:style' }
      })
    )
    const text = source.graph.createNode('TEXT', source.state.currentPageId, {
      text: 'Hello',
      styleRuns: [
        { start: 0, length: 2, style: { fillStyleId: 'source:style', fills: [solid(BLUE)] } }
      ]
    })
    source.select([text.id])
    const snapshot = expectDefined((await source.prepareCopy()).snapshot, 'snapshot')
    const target = targetWithStyle()

    await target.pasteSnapshot(snapshot, undefined, { dependencies: { mode: 'import' } })

    const run = expectDefined(pastedNode(target).styleRuns[0], 'run')
    expect(run.style.fillStyleId).toBe('target:style')
    expect(run.style.fills?.[0]?.color).toEqual(GREEN)
  })

  test('Paste properties with Use existing applies the document’s style', async () => {
    const snapshot = await copiedStyledRectangle()
    const target = targetWithStyle()
    const layer = target.graph.createNode('RECTANGLE', target.state.currentPageId)
    target.select([layer.id])

    await target.pastePropertiesFromSnapshot(snapshot)

    expect(target.graph.getNode(layer.id)?.fillStyleId).toBe('target:style')
    expect(target.graph.getNode(layer.id)?.fills[0]?.color).toEqual(GREEN)
  })

  test('Add renamed imports the style under a free name', async () => {
    const snapshot = await copiedStyledRectangle()
    const target = targetWithStyle()

    await target.pasteSnapshot(snapshot, undefined, {
      dependencies: { mode: 'import', resolutions: { 'source:style': 'add-renamed' } }
    })

    const styleId = pastedNode(target).fillStyleId
    expect(styleId).not.toBe('target:style')
    expect(sorted(styleNames(target))).toEqual(['Brand/Primary', 'Brand/Primary 2'])
    target.undo.undo()
    expect(styleNames(target)).toEqual(['Brand/Primary'])
  })

  test('Paste as is drops the style link and keeps its fills', async () => {
    const snapshot = await copiedStyledRectangle()
    const target = targetWithStyle()

    await target.pasteSnapshot(snapshot, undefined, { dependencies: { mode: 'as-is' } })

    const pasted = pastedNode(target)
    expect(pasted.fillStyleId).toBeNull()
    expect(pasted.fills[0]?.color).toEqual(BLUE)
    expect(styleNames(target)).toEqual(['Brand/Primary'])
  })
})
