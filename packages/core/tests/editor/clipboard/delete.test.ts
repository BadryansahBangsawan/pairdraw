import { describe, expect, test } from 'bun:test'

import { getNodeOrThrow } from '#core-tests/helpers/assert'
import { autoFrame, rect } from '#core-tests/helpers/layout'

import { createEditor } from '@pairdraw/core'
import { computeAllLayouts } from '@pairdraw/core/layout'

describe('deleteSelected', () => {
  test('reflows fixed vertical auto-layout siblings', () => {
    const editor = createEditor()
    const page = editor.state.currentPageId
    const frame = autoFrame(editor.graph, page, {
      layoutMode: 'VERTICAL',
      width: 300,
      height: 300,
      itemSpacing: 0
    })
    rect(editor.graph, frame.id, 300, 40)
    const body = rect(editor.graph, frame.id, 300, 100, { layoutGrow: 1 })
    const footerA = rect(editor.graph, frame.id, 300, 40)
    const footerB = rect(editor.graph, frame.id, 300, 40)
    computeAllLayouts(editor.graph, page)

    editor.select([footerB.id])
    editor.deleteSelected()

    expect(getNodeOrThrow(editor.graph, body.id).height).toBe(220)
    expect(getNodeOrThrow(editor.graph, footerA.id).y).toBe(260)
  })
})

describe('delete inside an instance', () => {
  test('hides a component child instead of removing it, so it stays out of the instance', () => {
    const editor = createEditor()
    const page = editor.state.currentPageId
    const component = editor.graph.createNode('COMPONENT', page, {
      name: 'Button',
      width: 120,
      height: 44
    })
    editor.graph.createNode('TEXT', component.id, {
      name: 'Caption',
      x: 12,
      y: 12,
      text: 'Button',
      width: 60,
      height: 20
    })
    const instance = editor.graph.createInstance(component.id, page, { x: 200, y: 0 })
    expect(instance).not.toBeNull()
    if (!instance) return
    const caption = editor.graph.getChildren(instance.id)[0]
    expect(caption).toBeDefined()
    if (!caption) return

    editor.select([caption.id])
    editor.deleteSelected()

    // Figma records a delete inside an instance as an override: reopening the file keeps the
    // child hidden instead of bringing it back.
    expect(editor.graph.getNode(caption.id)?.visible).toBe(false)
    expect(editor.graph.getChildren(instance.id)).toHaveLength(1)

    editor.undoAction()
    expect(editor.graph.getNode(caption.id)?.visible).toBe(true)
  })

  test('still removes a layer of the component itself', () => {
    const editor = createEditor()
    const page = editor.state.currentPageId
    const component = editor.graph.createNode('COMPONENT', page, { name: 'Button', width: 120 })
    const caption = editor.graph.createNode('TEXT', component.id, {
      name: 'Caption',
      text: 'Button',
      width: 60,
      height: 20
    })

    editor.select([caption.id])
    editor.deleteSelected()

    expect(editor.graph.getNode(caption.id)).toBeUndefined()
  })
})
