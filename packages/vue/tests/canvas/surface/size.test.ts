import { afterEach, expect, test } from 'bun:test'

import type { Editor } from '@pairdraw/core'

import { sizeCanvas } from '#vue/canvas/surface/gl-surface'

const originalGetComputedStyle = Reflect.get(globalThis, 'getComputedStyle')

afterEach(() => {
  Reflect.set(globalThis, 'getComputedStyle', originalGetComputedStyle)
})

type Box = { left: number; top: number; width: number; height: number }

/** The tests drive sizing with stand-ins; a real canvas and layout need a browser. */
function asDouble<T>(double: object): T {
  return double as T
}

/** A canvas that reports the box the page laid out and keeps the style the code writes. */
function canvasIn(box: Box) {
  return {
    style: { width: '', height: '', marginLeft: '', marginTop: '' } as CSSStyleDeclaration,
    width: 0,
    height: 0,
    getBoundingClientRect: () => ({
      ...box,
      x: box.left,
      y: box.top,
      right: box.left + box.width,
      bottom: box.top + box.height,
      toJSON: () => box
    })
  }
}

function computedStyle(layout: Partial<CSSStyleDeclaration>) {
  return {
    width: '',
    height: '',
    marginLeft: '0px',
    marginTop: '0px',
    borderLeftWidth: '0px',
    borderRightWidth: '0px',
    borderTopWidth: '0px',
    borderBottomWidth: '0px',
    paddingLeft: '0px',
    paddingRight: '0px',
    paddingTop: '0px',
    paddingBottom: '0px',
    boxSizing: 'content-box',
    ...layout
  }
}

function editorWithViewport(viewport: { width: number; height: number }): Editor {
  return asDouble<Editor>({
    setViewportSize: (width: number, height: number) => Object.assign(viewport, { width, height })
  })
}

test('pins a canvas laid out at a fractional pixel to whole CSS pixels', () => {
  const canvas = canvasIn({ left: 200.6, top: 100.4, width: 800.4, height: 600.4 })
  const layout = computedStyle({ width: '800.4px', height: '600.4px' })
  Reflect.set(globalThis, 'getComputedStyle', () => layout)
  const viewport = { width: 0, height: 0 }

  sizeCanvas(asDouble<HTMLCanvasElement>(canvas), editorWithViewport(viewport))

  expect(canvas.style.width).toBe('800px')
  expect(canvas.style.height).toBe('601px')
  expect(Number.parseFloat(canvas.style.marginLeft)).toBeCloseTo(0.4)
  expect(Number.parseFloat(canvas.style.marginTop)).toBeCloseTo(-0.4)
  expect(canvas.width).toBe(800)
  expect(canvas.height).toBe(601)
  expect(viewport).toEqual({ width: 800, height: 601 })
})

test('sizes a transformed canvas by its layout box and leaves its position alone', () => {
  const canvas = canvasIn({ left: 0, top: 0, width: 800, height: 600 })
  const layout = computedStyle({ width: '1600px', height: '1200px' })
  Reflect.set(globalThis, 'getComputedStyle', () => layout)

  sizeCanvas(asDouble<HTMLCanvasElement>(canvas), editorWithViewport({ width: 0, height: 0 }))

  expect(canvas.width).toBe(1600)
  expect(canvas.height).toBe(1200)
  expect(canvas.style.width).toBe('1600px')
  expect(canvas.style.marginLeft).toBe('')
})

test('keeps an inline style the page owns instead of the size it wrote', () => {
  const canvas = canvasIn({ left: 0, top: 0, width: 640, height: 480 })
  const layout = computedStyle({ width: '640px', height: '480px' })
  Reflect.set(globalThis, 'getComputedStyle', () => layout)
  const element = asDouble<HTMLCanvasElement>(canvas)
  const editor = editorWithViewport({ width: 0, height: 0 })

  sizeCanvas(element, editor)
  expect(canvas.style.width).toBe('640px')

  // The page narrows the canvas itself; the next measurement starts from that width.
  canvas.style.width = '320px'
  sizeCanvas(element, editor)
  expect(canvas.style.width).toBe('640px')
})
