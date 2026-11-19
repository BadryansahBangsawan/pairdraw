import { expect, test } from 'bun:test'

import { Window, type Element as HappyElement } from 'happy-dom'

import {
  canvasChromeInsets,
  insetsFromChrome,
  type ScreenRect
} from '@/app/editor/canvas/chrome-insets'

import { asDouble } from '#tests/helpers/doubles'

const CANVAS = { left: 0, top: 0, right: 800, bottom: 600 }

/** happy-dom asks for a full DOMRect, which only this test's layout answers. */
function toDomRect(rect: ScreenRect): DOMRect {
  return asDouble<DOMRect>({
    ...rect,
    x: rect.left,
    y: rect.top,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top
  })
}

test('a rail on the left takes the width it covers', () => {
  expect(
    insetsFromChrome(CANVAS, [
      { rect: { left: 12, top: 12, right: 58, bottom: 400 }, sides: ['left'] }
    ])
  ).toEqual({ top: 0, right: 0, bottom: 0, left: 58 })
})

test('a pill in the bottom corner takes both of its sides', () => {
  expect(
    insetsFromChrome(CANVAS, [
      { rect: { left: 730, top: 550, right: 788, bottom: 588 }, sides: ['right', 'bottom'] }
    ])
  ).toEqual({ top: 0, right: 70, bottom: 50, left: 0 })
})

test('several pieces on one side take the roomier of them', () => {
  expect(
    insetsFromChrome(CANVAS, [
      { rect: { left: 12, top: 12, right: 58, bottom: 400 }, sides: ['left'] },
      { rect: { left: 12, top: 520, right: 96, bottom: 588 }, sides: ['left', 'bottom'] }
    ])
  ).toEqual({ top: 0, right: 0, bottom: 80, left: 96 })
})

test('a canvas measured from its own corner takes the inset from that corner', () => {
  const canvas = { left: 300, top: 40, right: 1100, bottom: 640 }
  expect(
    insetsFromChrome(canvas, [
      { rect: { left: 312, top: 52, right: 358, bottom: 440 }, sides: ['left'] }
    ])
  ).toEqual({ top: 0, right: 0, bottom: 0, left: 58 })
})

test('a canvas without chrome is left whole', () => {
  expect(insetsFromChrome(CANVAS, [])).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
})

test('finds chrome above a canvas nested in a split view', () => {
  const window = new Window({ url: 'http://localhost/' })
  const { document } = window
  document.body.innerHTML = `
    <div id="canvas-frame">
      <div id="rail" data-canvas-inset="left"></div>
      <div id="split"><div id="pane"><div id="canvas-area"></div></div></div>
    </div>`
  const rectangle = (element: HappyElement | null, rect: ScreenRect) => {
    if (!element) throw new Error('Missing test element')
    element.getBoundingClientRect = () =>
      asDouble<ReturnType<HappyElement['getBoundingClientRect']>>(toDomRect(rect))
    return element
  }
  const canvas = rectangle(document.getElementById('canvas-area'), {
    left: 300,
    top: 40,
    right: 1100,
    bottom: 640
  })
  rectangle(document.getElementById('rail'), { left: 312, top: 52, right: 358, bottom: 440 })

  expect(canvasChromeInsets(asDouble<HTMLElement>(canvas))).toEqual({
    top: 0,
    right: 0,
    bottom: 0,
    left: 58
  })
})
