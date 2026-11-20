import { afterEach, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor } from '@pairdraw/core'
import { SkiaRenderer } from '@pairdraw/core/canvas'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'

const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

function childByName(editor: ReturnType<typeof createEditor>, parentId: string, name: string) {
  return editor.graph.getChildren(parentId).find((node) => node.name === name)
}

function setupComponentProperties() {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const iconA = editor.graph.createNode('COMPONENT', pageId, { name: 'Icon A' })
  editor.graph.createNode('RECTANGLE', iconA.id, { name: 'A shape' })
  const iconB = editor.graph.createNode('COMPONENT', pageId, { name: 'Icon B' })
  editor.graph.createNode('ELLIPSE', iconB.id, { name: 'B shape' })
  const component = editor.graph.createNode('COMPONENT', pageId, {
    name: 'Card',
    componentPropertyDefinitions: [
      { id: '10:1', name: 'Label', type: 'TEXT', defaultValue: 'Default' },
      { id: '10:2', name: 'Show icon', type: 'BOOLEAN', defaultValue: 'true' },
      { id: '10:3', name: 'Icon', type: 'INSTANCE_SWAP', defaultValue: iconA.id }
    ]
  })
  editor.graph.createNode('TEXT', component.id, {
    name: 'Label',
    text: 'Default',
    componentPropertyReferences: [{ propertyId: '10:1', field: 'TEXT' }]
  })
  editor.graph.createNode('FRAME', component.id, {
    name: 'Badge',
    componentPropertyReferences: [{ propertyId: '10:2', field: 'VISIBLE' }]
  })
  const sourceIcon = editor.graph.createInstance(iconA.id, component.id, { name: 'Icon' })
  if (!sourceIcon) throw new Error('Expected nested source instance')
  editor.graph.updateNode(sourceIcon.id, {
    componentPropertyReferences: [{ propertyId: '10:3', field: 'INSTANCE_SWAP' }]
  })
  const instance = editor.graph.createInstance(component.id, pageId)
  if (!instance) throw new Error('Expected card instance')
  return { editor, component, instance, iconA, iconB }
}

describe('component property actions', () => {
  test('a layer a boolean property hides leaves its group, which refits, and undo restores it', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const component = editor.graph.createNode('COMPONENT', pageId, {
      name: 'Card',
      width: 200,
      height: 200,
      componentPropertyDefinitions: [
        { id: '10:2', name: 'Show icon', type: 'BOOLEAN', defaultValue: 'true' }
      ]
    })
    const group = editor.graph.createNode('GROUP', component.id, {
      name: 'Content',
      width: 130,
      height: 130
    })
    editor.graph.createNode('RECTANGLE', group.id, { name: 'Body', width: 50, height: 50 })
    editor.graph.createNode('RECTANGLE', group.id, {
      name: 'Icon',
      x: 100,
      y: 100,
      width: 30,
      height: 30,
      componentPropertyReferences: [{ propertyId: '10:2', field: 'VISIBLE' }]
    })
    const instance = editor.graph.createInstance(component.id, pageId)
    if (!instance) throw new Error('Expected card instance')
    const content = childByName(editor, instance.id, 'Content')
    const icon = content && childByName(editor, content.id, 'Icon')
    if (!content || !icon) throw new Error('Expected group copy')
    const size = () => {
      const node = editor.graph.getNode(content.id)
      return [node?.width, node?.height]
    }

    editor.toggleNodeVisibility(icon.id)
    expect(size()).toEqual([50, 50])
    editor.undo.undo()
    expect(size()).toEqual([130, 130])

    editor.updateNodeWithUndo(icon.id, { visible: false }, 'Hide')
    expect(size()).toEqual([50, 50])
    editor.undo.undo()
    expect(size()).toEqual([130, 130])
  })

  test('hiding a layer a boolean property shows sets the property, as Figma does', () => {
    const { editor, component, instance } = setupComponentProperties()
    editor.graph.createNode('FRAME', component.id, {
      name: 'Dot',
      componentPropertyReferences: [{ propertyId: '10:2', field: 'VISIBLE' }]
    })
    editor.graph.syncInstance(instance.id)
    const badge = childByName(editor, instance.id, 'Badge')
    if (!badge) throw new Error('Expected badge copy')

    editor.updateNodeWithUndo(badge.id, { visible: false }, 'Hide')
    expect(editor.graph.getNode(instance.id)?.componentPropertyAssignments['10:2']).toBe('false')
    // Every layer the property drives follows it.
    expect(childByName(editor, instance.id, 'Dot')?.visible).toBe(false)

    editor.undo.undo()
    expect(editor.graph.getNode(instance.id)?.componentPropertyAssignments['10:2']).toBeUndefined()
    expect(childByName(editor, instance.id, 'Badge')?.visible).toBe(true)
    expect(childByName(editor, instance.id, 'Dot')?.visible).toBe(true)

    editor.toggleNodeVisibility(badge.id)
    expect(editor.graph.getNode(instance.id)?.componentPropertyAssignments['10:2']).toBe('false')
    expect(childByName(editor, instance.id, 'Dot')?.visible).toBe(false)
    editor.undo.undo()
    expect(childByName(editor, instance.id, 'Badge')?.visible).toBe(true)
    expect(childByName(editor, instance.id, 'Dot')?.visible).toBe(true)

    // A layer showing what its property does not still sets the property when shown again.
    editor.updateNodeWithUndo(badge.id, { visible: false }, 'Hide')
    editor.updateNode(badge.id, { visible: true })
    editor.updateNodeWithUndo(badge.id, { visible: true }, 'Show')
    expect(editor.graph.getNode(instance.id)?.componentPropertyAssignments['10:2']).toBe('true')
    expect(childByName(editor, instance.id, 'Dot')?.visible).toBe(true)

    // Layers the property drives together, selected together, set it once.
    const dot = childByName(editor, instance.id, 'Dot')
    editor.select([badge.id, dot?.id ?? ''])
    editor.toggleVisibility()
    expect(editor.graph.getNode(instance.id)?.componentPropertyAssignments['10:2']).toBe('false')
    expect(childByName(editor, instance.id, 'Badge')?.visible).toBe(false)
    expect(childByName(editor, instance.id, 'Dot')?.visible).toBe(false)
  })

  test('applies and undoes text, boolean, and instance-swap properties', () => {
    const { editor, instance, iconA, iconB } = setupComponentProperties()

    editor.setInstanceComponentProperty(instance.id, '10:1', 'Changed')
    expect(childByName(editor, instance.id, 'Label')?.text).toBe('Changed')
    expect(editor.graph.getNode(instance.id)?.componentPropertyAssignments['10:1']).toBe('Changed')
    editor.undo.undo()
    expect(childByName(editor, instance.id, 'Label')?.text).toBe('Default')

    editor.setInstanceComponentProperty(instance.id, '10:2', 'false')
    expect(childByName(editor, instance.id, 'Badge')?.visible).toBe(false)
    editor.undo.undo()
    expect(childByName(editor, instance.id, 'Badge')?.visible).toBe(true)

    editor.setInstanceComponentProperty(instance.id, '10:3', iconB.id)
    const swapped = childByName(editor, instance.id, 'Icon B')
    expect(swapped?.componentId).toBe(iconB.id)
    expect(swapped?.childIds.map((id) => editor.graph.getNode(id)?.name)).toEqual(['B shape'])
    editor.setInstanceComponentProperty(instance.id, '10:3', iconA.id)
    editor.undo.undo()
    expect(childByName(editor, instance.id, 'Icon B')?.componentId).toBe(iconB.id)
    editor.undo.undo()
    const restored = childByName(editor, instance.id, 'Icon A')
    expect(restored?.componentId).toBe(iconA.id)
    editor.undo.redo()
    expect(childByName(editor, instance.id, 'Icon B')?.componentId).toBe(iconB.id)
    editor.undo.undo()
    expect(childByName(editor, instance.id, 'Icon A')?.componentId).toBe(iconA.id)
    expect(restored?.childIds.map((id) => editor.graph.getNode(id)?.name)).toEqual(['A shape'])
  })

  test('preserves assignments when the main component synchronizes', () => {
    const { editor, component, instance, iconB } = setupComponentProperties()
    editor.setInstanceComponentProperty(instance.id, '10:1', 'Custom')
    editor.setInstanceComponentProperty(instance.id, '10:2', 'false')
    editor.setInstanceComponentProperty(instance.id, '10:3', iconB.id)

    const sourceLabel = childByName(editor, component.id, 'Label')
    if (!sourceLabel) throw new Error('Expected source label')
    editor.graph.updateNode(sourceLabel.id, { text: 'Updated default' })
    editor.graph.syncInstances(component.id)

    expect(childByName(editor, instance.id, 'Label')?.text).toBe('Custom')
    expect(childByName(editor, instance.id, 'Badge')?.visible).toBe(false)
    const nestedInstances = editor.graph
      .getChildren(instance.id)
      .filter((node) => node.type === 'INSTANCE')
    expect(nestedInstances).toHaveLength(1)
    expect(nestedInstances[0].name).toBe('Icon B')
    expect(nestedInstances[0].childIds.map((id) => editor.graph.getNode(id)?.name)).toEqual([
      'B shape'
    ])
  })

  test('undoing a nested assignment drops the override it recorded', () => {
    const editor = createEditor()
    const { graph } = editor
    const page = editor.state.currentPageId
    const badge = graph.createNode('COMPONENT', page, {
      name: 'Badge',
      componentPropertyDefinitions: [
        { id: '30:1', name: 'Label', type: 'TEXT', defaultValue: 'Default' }
      ]
    })
    graph.createNode('TEXT', badge.id, {
      name: 'Label',
      text: 'Default',
      componentPropertyReferences: [{ propertyId: '30:1', field: 'TEXT' }]
    })
    const card = graph.createNode('COMPONENT', page, { name: 'Card' })
    graph.createInstance(badge.id, card.id, { name: 'Badge' })
    const instance = graph.createInstance(card.id, page, { name: 'Card' })
    if (!instance) throw new Error('Expected card instance')
    const nested = childByName(editor, instance.id, 'Badge')
    if (!nested) throw new Error('Expected nested badge')
    const definition = badge.componentPropertyDefinitions?.[0]
    if (!definition) throw new Error('Expected the badge label property')

    editor.setInstanceComponentProperty(nested.id, definition.id, 'Assigned')
    expect(childByName(editor, nested.id, 'Label')?.text).toBe('Assigned')
    expect(
      instance.instanceOverrides.descendants
        .get(nested.id)
        ?.has(`componentPropertyAssignments/${definition.id}`)
    ).toBe(true)

    editor.undo.undo()
    // Undo takes the override the edit recorded on the outer instance with it.
    expect(
      graph
        .getNode(instance.id)
        ?.instanceOverrides.descendants.get(nested.id)
        ?.has(`componentPropertyAssignments/${definition.id}`) ?? false
    ).toBe(false)
    expect(graph.getNode(nested.id)?.componentPropertyAssignments[definition.id]).toBeUndefined()

    // Redo puts both the assignment and the override the next undo has to take back.
    editor.undo.redo()
    expect(childByName(editor, nested.id, 'Label')?.text).toBe('Assigned')
    expect(graph.getNode(nested.id)?.componentPropertyAssignments[definition.id]).toBe('Assigned')
    expect(
      graph
        .getNode(instance.id)
        ?.instanceOverrides.descendants.get(nested.id)
        ?.has(`componentPropertyAssignments/${definition.id}`)
    ).toBe(true)
    editor.undo.undo()
    expect(
      graph
        .getNode(instance.id)
        ?.instanceOverrides.descendants.get(nested.id)
        ?.has(`componentPropertyAssignments/${definition.id}`) ?? false
    ).toBe(false)
    expect(graph.getNode(nested.id)?.componentPropertyAssignments[definition.id]).toBeUndefined()
  })

  test('undoing a nested visibility edit drops the override it recorded', () => {
    const editor = createEditor()
    const { graph } = editor
    const page = editor.state.currentPageId
    const badge = graph.createNode('COMPONENT', page, {
      name: 'Badge',
      componentPropertyDefinitions: [
        { id: '31:1', name: 'Shown', type: 'BOOLEAN', defaultValue: 'true' }
      ]
    })
    graph.createNode('FRAME', badge.id, {
      name: 'Dot',
      componentPropertyReferences: [{ propertyId: '31:1', field: 'VISIBLE' }]
    })
    const card = graph.createNode('COMPONENT', page, { name: 'Card' })
    graph.createInstance(badge.id, card.id, { name: 'Badge' })
    const instance = graph.createInstance(card.id, page, { name: 'Card' })
    if (!instance) throw new Error('Expected card instance')
    const nested = childByName(editor, instance.id, 'Badge')
    const dot = nested && childByName(editor, nested.id, 'Dot')
    if (!nested || !dot) throw new Error('Expected the nested badge and its dot')
    const recorded = () =>
      graph
        .getNode(instance.id)
        ?.instanceOverrides.descendants.get(nested.id)
        ?.has('componentPropertyAssignments/31:1') ?? false

    editor.toggleNodeVisibility(dot.id)
    expect(recorded()).toBe(true)
    expect(graph.getNode(dot.id)?.visible).toBe(false)

    editor.undo.undo()
    expect(recorded()).toBe(false)
    expect(graph.getNode(dot.id)?.visible).toBe(true)
    expect(graph.getNode(nested.id)?.componentPropertyAssignments['31:1']).toBeUndefined()

    editor.undo.redo()
    expect(recorded()).toBe(true)
    expect(graph.getNode(dot.id)?.visible).toBe(false)
  })

  test('undo and redo of a nested text edit keep its override in step', async () => {
    const ck = await initCanvasKit()
    const surface = expectDefined(ck.MakeSurface(200, 200), 'surface')
    const renderer = new SkiaRenderer(ck, surface)
    const editor = createEditor()
    editor.setCanvasKit(ck, renderer)
    await renderer.loadFonts()
    cleanups.push(() => {
      editor.dispose()
      renderer.destroy()
    })

    const { graph } = editor
    const page = editor.state.currentPageId
    const badge = graph.createNode('COMPONENT', page, {
      name: 'Badge',
      componentPropertyDefinitions: [
        { id: '32:1', name: 'Label', type: 'TEXT', defaultValue: 'Default' }
      ]
    })
    graph.createNode('TEXT', badge.id, {
      name: 'Label',
      text: 'Default',
      componentPropertyReferences: [{ propertyId: '32:1', field: 'TEXT' }]
    })
    const card = graph.createNode('COMPONENT', page, { name: 'Card' })
    graph.createInstance(badge.id, card.id, { name: 'Badge' })
    const instance = graph.createInstance(card.id, page, { name: 'Card' })
    if (!instance) throw new Error('Expected card instance')
    const nested = childByName(editor, instance.id, 'Badge')
    const label = nested && childByName(editor, nested.id, 'Label')
    if (!nested || !label) throw new Error('Expected the nested badge label')
    const recorded = () =>
      graph
        .getNode(instance.id)
        ?.instanceOverrides.descendants.get(nested.id)
        ?.has('componentPropertyAssignments/32:1') ?? false

    editor.startTextEditing(label.id)
    const state = expectDefined(editor.textEditor?.state, 'text editor state')
    state.text = 'Typed'
    editor.commitTextEdit()
    expect(graph.getNode(label.id)?.text).toBe('Typed')
    expect(recorded()).toBe(true)

    editor.undo.undo()
    expect(graph.getNode(label.id)?.text).toBe('Default')
    expect(recorded()).toBe(false)
    expect(graph.getNode(nested.id)?.componentPropertyAssignments['32:1']).toBeUndefined()

    // Redo puts the override back, so the undo after it takes it away again.
    editor.undo.redo()
    expect(graph.getNode(label.id)?.text).toBe('Typed')
    expect(recorded()).toBe(true)
    editor.undo.undo()
    expect(recorded()).toBe(false)
  })

  test('reapplies non-variant assignments after variant swaps and undo', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const componentSet = editor.graph.createNode('COMPONENT_SET', pageId, {
      componentPropertyDefinitions: [
        { id: '20:1', name: 'State', type: 'VARIANT', defaultValue: 'A' },
        { id: '20:2', name: 'Label', type: 'TEXT', defaultValue: 'Default' }
      ]
    })
    const variantA = editor.graph.createNode('COMPONENT', componentSet.id, {
      name: 'State=A',
      componentPropertyValues: { State: 'A' }
    })
    editor.graph.createNode('TEXT', variantA.id, {
      name: 'Label',
      text: 'A default',
      componentPropertyReferences: [{ propertyId: '20:2', field: 'TEXT' }]
    })
    const variantB = editor.graph.createNode('COMPONENT', componentSet.id, {
      name: 'State=B',
      componentPropertyValues: { State: 'B' }
    })
    editor.graph.createNode('TEXT', variantB.id, {
      name: 'Label',
      text: 'B default',
      componentPropertyReferences: [{ propertyId: '20:2', field: 'TEXT' }]
    })
    const instance = editor.graph.createInstance(variantA.id, pageId)
    if (!instance) throw new Error('Expected variant instance')

    editor.setInstanceComponentProperty(instance.id, '20:2', 'Custom')
    editor.setInstanceComponentProperty(instance.id, '20:1', 'B')
    expect(editor.graph.getNode(instance.id)?.componentId).toBe(variantB.id)
    expect(childByName(editor, instance.id, 'Label')?.text).toBe('Custom')

    editor.undo.undo()
    expect(editor.graph.getNode(instance.id)?.componentId).toBe(variantA.id)
    expect(childByName(editor, instance.id, 'Label')?.text).toBe('Custom')
  })
})
