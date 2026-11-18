import { expect, test } from 'bun:test'

import { renderJSX, renderTree } from '@pairdraw/core/design-jsx'
import { exportFigFile, parseFigFile } from '@pairdraw/core/io/formats/fig'
import { Component, Instance, Text, property } from '@pairdraw/design-jsx'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph, type ComponentPropertyDefinition } from '@pairdraw/scene-graph'

const CARD = `
const title = property("Title", "Default title")
const badge = property("Badge", true)
return <ComponentSet name="Card">
  <Component name="state=default">
    <Text text={title} />
    <Text visible={badge}>New</Text>
  </Component>
  <Component name="state=selected">
    <Text text={title} />
    <Text visible={badge}>New</Text>
  </Component>
</ComponentSet>`

async function reopenedCard(): Promise<SceneGraph> {
  await initCodec()
  const graph = new SceneGraph()
  await renderJSX(graph, CARD)
  return parseFigFile((await exportFigFile(graph)).slice().buffer, { populate: 'first-page' })
}

function layers(graph: SceneGraph, instance: { id: string }) {
  return graph.getChildren(instance.id).map((child) => [child.text, child.visible])
}

/** The name of the variant an instance shows. */
function shownVariant(graph: SceneGraph, instanceId: string) {
  const componentId = graph.getNode(instanceId)?.componentId
  return componentId ? graph.getNode(componentId)?.name : undefined
}

test('sets component properties by name, like variants, after a .fig reload', async () => {
  const graph = await reopenedCard()
  const [instance] = await renderJSX(
    graph,
    `<Instance of="Card" state="selected" Title="Hello" Badge={false} />`
  )
  expect(instance.warnings).toBeUndefined()
  expect(graph.getNode(instance.id)?.name).toBe('Card')
  expect(shownVariant(graph, instance.id)).toBe('state=selected')
  expect(layers(graph, instance)).toEqual([
    ['Hello', true],
    ['New', false]
  ])
})

test('assigns properties by ID or by name', async () => {
  const graph = await reopenedCard()
  const set = [...graph.getAllNodes()].find((node) => node.type === 'COMPONENT_SET')
  const title = set?.componentPropertyDefinitions.find((item) => item.name === 'Title')
  if (!title) throw new Error('Missing Title property')

  for (const key of [title.id, 'Title']) {
    const [instance] = await renderJSX(
      graph,
      `<Instance of="Card" properties={{ ${JSON.stringify(key)}: "By ${key}" }} />`
    )
    expect(layers(graph, instance)[0]).toEqual([`By ${key}`, true])
  }
  await expect(
    renderJSX(graph, `<Instance of="Card" properties={{ title: "Hello" }} />`)
  ).rejects.toThrow('Unknown component property: title')
})

/** A component with property definitions as a file can hold them, IDs and names chosen. */
async function noteWith(graph: SceneGraph, definitions: ComponentPropertyDefinition[]) {
  const component = await renderTree(
    graph,
    Component({ name: 'Note', children: Text({ text: property('Label', 'Label') }) })
  )
  const [text] = graph.getChildren(component.id)
  graph.updateNode(component.id, { componentPropertyDefinitions: definitions })
  graph.updateNode(text.id, {
    componentPropertyReferences: [{ propertyId: definitions[0].id, field: 'TEXT' }]
  })
  return component
}

test('properties prefers an ID; a prop always names the property', async () => {
  const graph = new SceneGraph()
  const component = await noteWith(graph, [
    { id: 'label', name: 'Title', type: 'TEXT', defaultValue: 'Label' },
    { id: 'Title', name: 'Heading', type: 'TEXT', defaultValue: 'Heading' }
  ])
  const instance = await renderTree(
    graph,
    Instance({ of: component.id, properties: { Title: 'Changed' } })
  )
  expect(graph.getChildren(instance.id)[0]?.text).toBe('Label')
  expect(graph.getNode(instance.id)?.componentPropertyAssignments).toEqual({ Title: 'Changed' })

  const named = await renderTree(graph, Instance({ of: component.id, Title: 'By name' }))
  expect(graph.getChildren(named.id)[0]?.text).toBe('By name')
  expect(graph.getNode(named.id)?.componentPropertyAssignments).toEqual({ label: 'By name' })
})

test('rejects a property name that more than one property has', async () => {
  const graph = new SceneGraph()
  const component = await noteWith(graph, [
    { id: 'a', name: 'Title', type: 'TEXT', defaultValue: 'A' },
    { id: 'b', name: 'Title', type: 'TEXT', defaultValue: 'B' }
  ])
  await expect(renderTree(graph, Instance({ of: component.id, Title: 'Changed' }))).rejects.toThrow(
    'Component property name Title is ambiguous; use one of the IDs: a, b'
  )
})

const CHOICE = `
const label = property("Label", "Button")
return <ComponentSet name="Choice">
  <Component name="Variant=Primary, State=Default">
    <Text text={label} />
  </Component>
  <Component name="Variant=Secondary, State=Default">
    <Text text={label} />
  </Component>
</ComponentSet>`

test('a variant property named Variant selects its variant', async () => {
  const graph = new SceneGraph()
  await renderJSX(graph, CHOICE)
  const [instance] = await renderJSX(
    graph,
    `<Instance of="Choice" Variant="Secondary" State="Default" />`
  )
  expect(instance.warnings).toBeUndefined()
  expect(shownVariant(graph, instance.id)).toBe('Variant=Secondary, State=Default')
})

test('a name several components share warns and says how to pick one', async () => {
  const graph = new SceneGraph()
  const old = await renderJSX(graph, `<Component name="Button"><Text>Old</Text></Component>`)
  const set = await renderJSX(
    graph,
    `<ComponentSet name="Button"><Component name="State=Default"><Text>New</Text></Component></ComponentSet>`
  )
  const [instance] = await renderJSX(graph, `<Instance of="Button" />`)
  const warning = instance.warnings?.join('\n') ?? ''
  expect(warning).toMatch(/names 2 components/)
  expect(warning).toContain(old[0].id)
  expect(warning).toContain(set[0].id)
  expect(warning).toMatch(/by its ID/)
  // Without variant props the component that already carried the name keeps the call.
  expect(graph.getNode(instance.id)?.name).toBe('Button')
})

test('variant props pick the component set when a component shares its name', async () => {
  const graph = new SceneGraph()
  await renderJSX(graph, `<Component name="Button"><Text>Old</Text></Component>`)
  await renderJSX(graph, CHOICE.replace('name="Choice"', 'name="Button"'))
  const [instance] = await renderJSX(
    graph,
    `<Instance of="Button" Variant="Secondary" State="Default" />`
  )
  expect(instance.warnings?.join('\n')).toMatch(/names 2 components/)
  expect(instance.warnings?.join('\n')).not.toMatch(/Unsupported prop/)
  expect(shownVariant(graph, instance.id)).toBe('Variant=Secondary, State=Default')
  const shownParentId = graph.getNode(instance.id)?.componentId
  const shownParent = shownParentId ? graph.getNode(shownParentId)?.parentId : null
  expect(shownParent ? graph.getNode(shownParent)?.type : null).toBe('COMPONENT_SET')
})
