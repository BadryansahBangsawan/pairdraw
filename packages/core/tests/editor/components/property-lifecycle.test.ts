import { describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor } from '@pairdraw/core'
import { FigmaAPI, type FigmaComponentNode, type FigmaInstanceNode } from '@pairdraw/core/figma-api'

/** A Button component with a Label text and a Badge frame, and one instance of it. */
function setup() {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const component = editor.graph.createNode('COMPONENT', pageId, { name: 'Button' })
  const label = editor.graph.createNode('TEXT', component.id, { name: 'Label', text: 'Button' })
  const badge = editor.graph.createNode('FRAME', component.id, { name: 'Badge' })
  const instance = expectDefined(editor.graph.createInstance(component.id, pageId))
  return { editor, pageId, component, label, badge, instance }
}

/** The instance's descendant matching a predicate (the sync clones the component's layers). */
function inInstance(
  editor: ReturnType<typeof createEditor>,
  instanceId: string,
  match: (n: { type: string; name: string }) => boolean
) {
  return expectDefined(
    [...editor.graph.getAllNodes()].find(
      (n) =>
        match(n) &&
        n.parentId &&
        editor.graph.closest(n.parentId, (a) => a.id === instanceId) !== undefined
    )
  )
}

describe('component property lifecycle through the Figma API', () => {
  test('a text property sets the instance text; resetOverrides keeps the property value but clears a manual edit', () => {
    const { editor, component, label, instance } = setup()
    const figma = new FigmaAPI(editor.graph)
    // exposeComponentProperty creates the property AND binds the layer, as the editor does.
    const propertyId = expectDefined(editor.exposeComponentProperty(label.id, 'TEXT', 'Caption'))
    const name = expectDefined(
      component.componentPropertyDefinitions.find((d) => d.id === propertyId)
    ).name
    const key = `${name}#${propertyId}`
    const instanceProxy = figma.wrapNode(instance.id) as FigmaInstanceNode
    instanceProxy.setProperties({ [key]: 'Hello' })
    const instanceLabel = inInstance(
      editor,
      instance.id,
      (n) => n.type === 'TEXT' && n.name === 'Label'
    )
    expect(instanceLabel.text).toBe('Hello')
    expect(
      expectDefined(editor.graph.getNode(instance.id)).componentPropertyAssignments[propertyId]
    ).toBe('Hello')
    // A manual edit on top of the property value is an override; reset clears it back to the property value.
    editor.graph.updateNode(instanceLabel.id, { text: 'Manual' })
    instanceProxy.resetOverrides()
    expect(expectDefined(editor.graph.getNode(instanceLabel.id)).text).toBe('Hello')
    // The property assignment itself survives resetOverrides (Figma keeps property-set values).
    expect(
      expectDefined(editor.graph.getNode(instance.id)).componentPropertyAssignments[propertyId]
    ).toBe('Hello')
  })

  test('a boolean visibility property set false hides the bound layer on the instance, true shows it', () => {
    const { editor, component, badge, instance } = setup()
    const figma = new FigmaAPI(editor.graph)
    // VISIBLE field exposes a BOOLEAN property, as the editor's field map does.
    const propertyId = expectDefined(
      editor.exposeComponentProperty(badge.id, 'VISIBLE', 'Show badge')
    )
    const key = `Show badge#${propertyId}`
    const instanceProxy = figma.wrapNode(instance.id) as FigmaInstanceNode
    instanceProxy.setProperties({ [key]: false })
    const instanceBadge = inInstance(editor, instance.id, (n) => n.name === 'Badge')
    expect(instanceBadge.visible).toBe(false)
    instanceProxy.setProperties({ [key]: true })
    expect(expectDefined(editor.graph.getNode(instanceBadge.id)).visible).toBe(true)
    expect(component.componentPropertyDefinitions.find((d) => d.id === propertyId)?.type).toBe(
      'BOOLEAN'
    )
  })

  test('an instance-swap property swaps the nested instance to the named component', () => {
    const { editor, component, pageId, instance } = setup()
    const inner = editor.graph.createNode('COMPONENT', pageId, { name: 'Inner' })
    editor.graph.createNode('TEXT', inner.id, { name: 'T', text: 'inner' })
    const alt = editor.graph.createNode('COMPONENT', pageId, { name: 'Alt' })
    editor.graph.createNode('TEXT', alt.id, { name: 'T', text: 'alt' })
    const nested = expectDefined(editor.graph.createInstance(inner.id, component.id))
    const figma = new FigmaAPI(editor.graph)
    const propertyId = expectDefined(
      editor.exposeComponentProperty(nested.id, 'INSTANCE_SWAP', 'Icon')
    )
    const key = `Icon#${propertyId}`
    const instanceProxy = figma.wrapNode(instance.id) as FigmaInstanceNode
    instanceProxy.setProperties({ [key]: alt.id })
    const swapped = inInstance(editor, instance.id, (n) => n.type === 'INSTANCE')
    expect(swapped.componentId).toBe(alt.id)
    expect(
      expectDefined(editor.graph.getNode(instance.id)).componentPropertyAssignments[propertyId]
    ).toBe(alt.id)
  })

  test('deleting a property removes its definition, references, and instance assignments, and undo restores them', () => {
    const { editor, component, label, instance } = setup()
    const propertyId = expectDefined(editor.exposeComponentProperty(label.id, 'TEXT', 'Label'))
    const figma = new FigmaAPI(editor.graph)
    ;(figma.wrapNode(instance.id) as FigmaInstanceNode).setProperties({
      [`Label#${propertyId}`]: 'Changed'
    })
    expect(
      expectDefined(editor.graph.getNode(instance.id)).componentPropertyAssignments[propertyId]
    ).toBe('Changed')
    expect(editor.deleteComponentProperty(component.id, propertyId)).toBe(true)
    expect(component.componentPropertyDefinitions.some((d) => d.id === propertyId)).toBe(false)
    expect(expectDefined(editor.graph.getNode(label.id)).componentPropertyReferences).toEqual([])
    expect(
      expectDefined(editor.graph.getNode(instance.id)).componentPropertyAssignments[propertyId]
    ).toBeUndefined()
    editor.undo.undo()
    expect(component.componentPropertyDefinitions.some((d) => d.id === propertyId)).toBe(true)
    expect(expectDefined(editor.graph.getNode(label.id)).componentPropertyReferences).toEqual([
      { propertyId, field: 'TEXT' }
    ])
    expect(
      expectDefined(editor.graph.getNode(instance.id)).componentPropertyAssignments[propertyId]
    ).toBe('Changed')
  })

  test('setProperties with an unknown name throws and changes nothing', () => {
    const { editor, component, instance } = setup()
    const figma = new FigmaAPI(editor.graph)
    ;(figma.wrapNode(component.id) as FigmaComponentNode).addComponentProperty(
      'Caption',
      'TEXT',
      'Default'
    )
    const before = expectDefined(editor.graph.getNode(instance.id)).componentPropertyAssignments
    expect(() =>
      (figma.wrapNode(instance.id) as FigmaInstanceNode).setProperties({ Nope: 'x' })
    ).toThrow(/Could not find a component property with name: 'Nope'/)
    expect(expectDefined(editor.graph.getNode(instance.id)).componentPropertyAssignments).toEqual(
      before
    )
  })

  test('a variant property set through setProperties switches the instance and reports the value', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const figma = new FigmaAPI(editor.graph)
    const a = figma.createComponent()
    a.name = 'Size=Small'
    const b = figma.createComponent()
    b.name = 'Size=Large'
    figma.combineAsVariants([a, b], figma.currentPage)
    const instance = expectDefined(editor.graph.createInstance(a.id, pageId))
    const instanceProxy = figma.wrapNode(instance.id) as FigmaInstanceNode
    instanceProxy.setProperties({ Size: 'Large' })
    expect(expectDefined(editor.graph.getNode(instance.id)).componentId).toBe(b.id)
    // Figma reports the variant value through componentProperties, read from the instance's own variant.
    expect(instanceProxy.componentProperties.Size?.value).toBe('Large')
    instanceProxy.setProperties({ Size: 'Small' })
    expect(expectDefined(editor.graph.getNode(instance.id)).componentId).toBe(a.id)
    expect(instanceProxy.componentProperties.Size?.value).toBe('Small')
  })
})
