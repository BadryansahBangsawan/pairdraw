import { beforeAll, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'
import { registerTestFont } from '#core-tests/helpers/figma-api'

import { createEditor } from '@pairdraw/core'
import { buildFigmaClipboardHTML } from '@pairdraw/core/clipboard'
import { FigmaAPI, type FigmaComponentNode, type FigmaInstanceNode } from '@pairdraw/core/figma-api'
import { initCodec } from '@pairdraw/kiwi/fig/codec'

beforeAll(async () => {
  await initCodec()
  await registerTestFont()
})

/**
 * A source document with an Outer component holding a nested Inner instance and a Label text,
 * an instance of Outer with a text override on the nested label and a property assignment.
 * Returns the clipboard HTML for that instance, to paste into a fresh document.
 */
async function sourceClipboard() {
  const source = createEditor()
  const pageId = source.state.currentPageId
  const figma = new FigmaAPI(source.graph)
  const inner = figma.createComponent()
  inner.name = 'Inner'
  const innerLabel = figma.createText()
  innerLabel.name = 'Label'
  innerLabel.characters = 'inner default'
  inner.appendChild(innerLabel)
  const outer = figma.createComponent()
  outer.name = 'Outer'
  expectDefined(source.graph.createInstance(inner.id, outer.id))
  const outerLabel = figma.createText()
  outerLabel.name = 'Title'
  outerLabel.characters = 'title'
  outer.appendChild(outerLabel)
  // A text property on Outer bound to the title.
  const titleProp = (outer as FigmaComponentNode).addComponentProperty('Title', 'TEXT', 'title')
  outerLabel.componentPropertyReferences = { characters: titleProp }
  const instance = expectDefined(source.graph.createInstance(outer.id, pageId))
  // Override the nested instance's label text, and set the title property.
  const instanceNested = expectDefined(
    source.graph.getChildren(instance.id).find((n) => n.type === 'INSTANCE')
  )
  const nestedLabel = expectDefined(
    source.graph.getChildren(instanceNested.id).find((n) => n.type === 'TEXT')
  )
  source.updateNodeWithUndo(nestedLabel.id, { text: 'overridden inner' })
  ;(figma.wrapNode(instance.id) as FigmaInstanceNode).setProperties({ [titleProp]: 'set title' })
  const html = expectDefined(await buildFigmaClipboardHTML([instance], source.graph))
  return { html, innerName: 'Inner', outerName: 'Outer' }
}

describe('cross-document paste of an instance with nested instances and overrides', () => {
  test('brings the main components, the nested instance, its override, and the property assignment', async () => {
    const { html } = await sourceClipboard()
    const target = createEditor()
    await target.pasteFromHTML(html)
    const placed = expectDefined(target.graph.getNode([...target.state.selectedIds][0]))
    expect(placed.type).toBe('INSTANCE')
    // The outer main component came along and the instance points at it.
    const outerMain = expectDefined(target.graph.getNode(placed.componentId ?? ''))
    expect(outerMain.type).toBe('COMPONENT')
    expect(outerMain.name).toBe('Outer')
    // The nested instance survives and points at its own brought-along main component.
    const nested = expectDefined(
      target.graph.getChildren(placed.id).find((n) => n.type === 'INSTANCE')
    )
    const innerMain = expectDefined(target.graph.getNode(nested.componentId ?? ''))
    expect(innerMain.type).toBe('COMPONENT')
    expect(innerMain.name).toBe('Inner')
    // The nested label keeps the override made in the source document.
    const nestedLabel = expectDefined(
      target.graph.getChildren(nested.id).find((n) => n.type === 'TEXT')
    )
    expect(nestedLabel.text).toBe('overridden inner')
    // The title property assignment survives the paste.
    const titleDef = expectDefined(
      outerMain.componentPropertyDefinitions.find((d) => d.name === 'Title')
    )
    expect(placed.componentPropertyAssignments[titleDef.id]).toBe('set title')
    const titleLabel = expectDefined(
      target.graph.getChildren(placed.id).find((n) => n.type === 'TEXT' && n.name === 'Title')
    )
    expect(titleLabel.text).toBe('set title')
  })

  test('the pasted instance is independent of the source: editing it does not need the source graph', async () => {
    const { html } = await sourceClipboard()
    const target = createEditor()
    await target.pasteFromHTML(html)
    const placed = expectDefined(target.graph.getNode([...target.state.selectedIds][0]))
    // Reset overrides on the pasted instance returns the nested label to its component default.
    const figma = new FigmaAPI(target.graph)
    figma.wrapNode(placed.id).resetOverrides()
    const nested = expectDefined(
      target.graph.getChildren(placed.id).find((n) => n.type === 'INSTANCE')
    )
    const nestedLabel = expectDefined(
      target.graph.getChildren(nested.id).find((n) => n.type === 'TEXT')
    )
    expect(nestedLabel.text).toBe('inner default')
    // Undo the paste removes everything it brought.
    const before = new Set(target.graph.nodes.keys())
    target.undo.undo()
    expect(target.graph.nodes.size).toBeLessThan(before.size)
    expect(target.graph.getNode(placed.id)).toBeUndefined()
  })
})
