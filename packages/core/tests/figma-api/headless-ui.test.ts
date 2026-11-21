import { describe, expect, test } from 'bun:test'

import { createAPI } from '#core-tests/helpers/figma-api'

describe('the UI a headless script gets', () => {
  test('is a no-op object, as Figma hands every plugin one', () => {
    const figma = createAPI()
    expect(figma.ui).toBeDefined()
    const post = figma.ui.postMessage.bind(figma.ui)
    expect(() => post({ qa: true })).not.toThrow()
    expect(() => figma.ui.resize(320, 240)).not.toThrow()
    expect(() => figma.ui.show()).not.toThrow()
    expect(() => figma.ui.hide()).not.toThrow()
    expect(() => figma.ui.close()).not.toThrow()
  })

  test('onmessage is assignable, and showing the UI is a no-op', () => {
    const figma = createAPI()
    const handler = () => undefined
    figma.ui.onmessage = handler
    expect(figma.ui.onmessage).toBe(handler)
    expect(() => figma.showUI('<div></div>')).not.toThrow()
    expect(() => figma.ui.hide()).not.toThrow()
  })
})
