import { describe, expect, test } from 'bun:test'

import { createAPI, solidFill } from '#core-tests/helpers/figma-api'

interface SerializedNodeWithChildren {
  children?: unknown[]
}

describe('serialization', () => {
  test('toJSON returns clean object', () => {
    const api = createAPI()
    const frame = api.createFrame()
    frame.name = 'Card'
    frame.resize(300, 200)
    frame.fills = [solidFill({ r: 1, g: 1, b: 1, a: 1 })]
    const json = frame.toJSON()
    expect(json.name).toBe('Card')
    expect(json.width).toBe(300)
    expect(json.fills).toBeDefined()
  })

  test('toJSON includes children', () => {
    const api = createAPI()
    const frame = api.createFrame()
    const rect = api.createRectangle()
    frame.appendChild(rect)
    const json = frame.toJSON() as SerializedNodeWithChildren
    expect(json.children).toBeDefined()
    expect(json.children?.length).toBe(1)
  })

  test('an auto layout frame reports the insets and alignment it holds', () => {
    const api = createAPI()
    const frame = api.createFrame()
    frame.layoutMode = 'VERTICAL'
    frame.itemSpacing = 12
    frame.paddingTop = 10
    frame.paddingRight = 8
    frame.paddingBottom = 6
    frame.paddingLeft = 4
    frame.primaryAxisAlignItems = 'CENTER'
    frame.counterAxisAlignItems = 'MAX'

    const json = frame.toJSON()

    expect(json).toMatchObject({
      layoutMode: 'VERTICAL',
      itemSpacing: 12,
      paddingTop: 10,
      paddingRight: 8,
      paddingBottom: 6,
      paddingLeft: 4,
      primaryAxisAlignItems: 'CENTER',
      counterAxisAlignItems: 'MAX',
      primaryAxisSizingMode: 'AUTO'
    })
  })

  test('toString returns readable string', () => {
    const api = createAPI()
    const frame = api.createFrame()
    frame.name = 'Card'
    expect(frame.toString()).toContain('FRAME')
    expect(frame.toString()).toContain('Card')
  })
})
