import { describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'

import {
  autoLayoutDragChanges,
  autoLayoutDragValue,
  hitAutoLayoutHandle,
  measureAutoLayoutHandles,
  type AutoLayoutHandleLayout
} from '#core/layout/auto-layout-handles'

function setup(fields: Partial<SceneNode> = {}) {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const frame = graph.createNode('FRAME', pageId, {
    width: 200,
    height: 100,
    layoutMode: 'HORIZONTAL',
    paddingTop: 10,
    paddingRight: 20,
    paddingBottom: 30,
    paddingLeft: 40,
    itemSpacing: 20,
    ...fields
  })
  const first = graph.createNode('RECTANGLE', frame.id, { x: 40, y: 10, width: 40, height: 20 })
  const second = graph.createNode('RECTANGLE', frame.id, { x: 100, y: 10, width: 60, height: 20 })
  return { graph, frame, children: [first, second] }
}

function layoutOf(fields: Partial<SceneNode> = {}): AutoLayoutHandleLayout {
  const { frame, children } = setup(fields)
  return expectDefined(measureAutoLayoutHandles(frame, children))
}

describe('measureAutoLayoutHandles', () => {
  test('carries each padding side and the gap between children', () => {
    const layout = layoutOf()
    expect(layout.padding.map(({ side, value }) => ({ side, value }))).toEqual([
      { side: 'top', value: 10 },
      { side: 'right', value: 20 },
      { side: 'bottom', value: 30 },
      { side: 'left', value: 40 }
    ])
    expect(layout.gaps).toEqual([
      {
        kind: 'gap',
        axis: 'primary',
        index: 0,
        value: 20,
        rect: { x: 80, y: 10, width: 20, height: 60 }
      }
    ])
  })

  test('has no zones on a frame that is not an auto layout', () => {
    const { frame, children } = setup({ layoutMode: 'NONE' })
    expect(measureAutoLayoutHandles(frame, children)).toBeNull()
  })

  test('has no gap for space-between or a hidden child', () => {
    expect(layoutOf({ primaryAxisAlign: 'SPACE_BETWEEN' }).gaps).toEqual([])
    const { frame, children } = setup({ primaryAxisAlign: 'SPACE_BETWEEN' })
    children[0].visible = false
    expect(measureAutoLayoutHandles(frame, children)?.gaps).toEqual([])
  })

  test('measures the gap between wrapped lines as the counter gap', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, {
      width: 100,
      height: 100,
      layoutMode: 'HORIZONTAL',
      layoutWrap: 'WRAP',
      itemSpacing: 10,
      counterAxisSpacing: 8
    })
    const children = [
      graph.createNode('RECTANGLE', frame.id, { x: 0, y: 0, width: 40, height: 30 }),
      graph.createNode('RECTANGLE', frame.id, { x: 50, y: 0, width: 40, height: 30 }),
      graph.createNode('RECTANGLE', frame.id, { x: 0, y: 60, width: 40, height: 30 })
    ]
    const layout = expectDefined(measureAutoLayoutHandles(frame, children))
    expect(layout.gaps.map(({ axis, value, rect }) => ({ axis, value, rect }))).toContainEqual({
      axis: 'counter',
      value: 8,
      rect: { x: 0, y: 30, width: 100, height: 30 }
    })
  })

  test('leaves an instance’s handles editable, where its layout fields may override', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('INSTANCE', pageId, {
      width: 100,
      height: 100,
      layoutMode: 'VERTICAL',
      paddingTop: 10
    })
    const layout = expectDefined(measureAutoLayoutHandles(frame, []))
    expect(layout.editable).toBe(true)
    expect(layout.padding.map(({ side }) => side)).toEqual(['top'])
  })

  test('measures the primary gap of a reversed row between the facing edges', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, {
      width: 200,
      height: 100,
      layoutMode: 'HORIZONTAL',
      paddingTop: 10,
      paddingRight: 20,
      paddingBottom: 30,
      paddingLeft: 40,
      itemSpacing: 20,
      layoutDirection: 'RTL'
    })
    const first = graph.createNode('RECTANGLE', frame.id, { x: 120, y: 10, width: 40, height: 20 })
    const second = graph.createNode('RECTANGLE', frame.id, { x: 40, y: 10, width: 40, height: 20 })
    const layout = expectDefined(measureAutoLayoutHandles(frame, [first, second]))
    expect(layout.gaps).toEqual([
      {
        kind: 'gap',
        axis: 'primary',
        index: 0,
        value: 20,
        rect: { x: 80, y: 10, width: 40, height: 60 }
      }
    ])
  })

  test('groups centered wrapped children into visual lines for the counter gap', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, {
      width: 100,
      height: 100,
      layoutMode: 'HORIZONTAL',
      layoutWrap: 'WRAP',
      itemSpacing: 10,
      counterAxisSpacing: 8,
      counterAxisAlign: 'CENTER'
    })
    const children = [
      graph.createNode('RECTANGLE', frame.id, { x: 0, y: 10, width: 40, height: 20 }),
      graph.createNode('RECTANGLE', frame.id, { x: 50, y: 5, width: 40, height: 30 }),
      graph.createNode('RECTANGLE', frame.id, { x: 0, y: 65, width: 40, height: 20 }),
      graph.createNode('RECTANGLE', frame.id, { x: 50, y: 60, width: 40, height: 30 })
    ]
    const layout = expectDefined(measureAutoLayoutHandles(frame, children))
    expect(layout.gaps.filter((gap) => gap.axis === 'counter')).toEqual([
      {
        kind: 'gap',
        axis: 'counter',
        index: 0,
        value: 8,
        rect: { x: 0, y: 35, width: 100, height: 25 }
      }
    ])
  })
})

describe('hitAutoLayoutHandle', () => {
  test('takes the padding band nearest the frame edge and the gap between children', () => {
    const layout = layoutOf()
    expect(hitAutoLayoutHandle(layout, 5, 50)).toEqual({ kind: 'padding', side: 'left' })
    expect(hitAutoLayoutHandle(layout, 195, 50)).toEqual({ kind: 'padding', side: 'right' })
    expect(hitAutoLayoutHandle(layout, 100, 5)).toEqual({ kind: 'padding', side: 'top' })
    expect(hitAutoLayoutHandle(layout, 100, 95)).toEqual({ kind: 'padding', side: 'bottom' })
    expect(hitAutoLayoutHandle(layout, 90, 40)).toEqual({ kind: 'gap', axis: 'primary', index: 0 })
    expect(hitAutoLayoutHandle(layout, 60, 50)).toBeNull()
  })

  test('finds the counter gap of a wrapped row', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, {
      width: 100,
      height: 100,
      layoutMode: 'HORIZONTAL',
      layoutWrap: 'WRAP',
      counterAxisSpacing: 8
    })
    const children = [
      graph.createNode('RECTANGLE', frame.id, { x: 0, y: 0, width: 40, height: 30 }),
      graph.createNode('RECTANGLE', frame.id, { x: 0, y: 60, width: 40, height: 30 })
    ]
    expect(hitAutoLayoutHandle(measureAutoLayoutHandles(frame, children), 20, 45)).toEqual({
      kind: 'gap',
      axis: 'counter',
      index: 0
    })
  })
})

describe('autoLayoutDragChanges', () => {
  const layout = layoutOf()

  test('takes a padding side along its own direction, at the zoom, never below zero', () => {
    const left = { kind: 'padding' as const, side: 'left' as const }
    expect(
      autoLayoutDragValue(layout, left, { dx: 20, dy: 0, zoom: 1, alt: false, shift: false })
    ).toBe(60)
    expect(
      autoLayoutDragValue(layout, left, { dx: 20, dy: 0, zoom: 2, alt: false, shift: false })
    ).toBe(50)
    expect(
      autoLayoutDragValue(layout, left, { dx: -100, dy: 0, zoom: 1, alt: false, shift: false })
    ).toBe(0)
  })

  test('Alt sets both sides of the dragged axis and Alt+Shift all four', () => {
    const left = { kind: 'padding' as const, side: 'left' as const }
    const alt = autoLayoutDragChanges(layout, left, {
      dx: 20,
      dy: 0,
      zoom: 1,
      alt: true,
      shift: false
    })
    expect(alt.changes).toEqual({ paddingLeft: 60, paddingRight: 60 })
    const both = autoLayoutDragChanges(layout, left, {
      dx: 20,
      dy: 0,
      zoom: 1,
      alt: true,
      shift: true
    })
    expect(both.changes).toEqual({
      paddingTop: 60,
      paddingRight: 60,
      paddingBottom: 60,
      paddingLeft: 60
    })
  })

  test('Shift nudges padding and gaps by the large nudge', () => {
    const left = { kind: 'padding' as const, side: 'left' as const }
    expect(
      autoLayoutDragValue(layout, left, { dx: 17, dy: 0, zoom: 1, alt: false, shift: true })
    ).toBe(60)
    expect(
      autoLayoutDragValue(layout, left, {
        dx: 17,
        dy: 0,
        zoom: 1,
        alt: false,
        shift: true,
        bigNudge: 8
      })
    ).toBe(56)
    const gap = { kind: 'gap' as const, axis: 'primary' as const, index: 0 }
    expect(
      autoLayoutDragValue(layout, gap, {
        dx: 15,
        dy: 0,
        zoom: 1,
        alt: false,
        shift: true,
        bigNudge: 8
      })
    ).toBe(32)
  })

  test('Shift alone changes only the dragged padding side', () => {
    const left = { kind: 'padding' as const, side: 'left' as const }
    const shift = autoLayoutDragChanges(layout, left, {
      dx: 17,
      dy: 0,
      zoom: 1,
      alt: false,
      shift: true
    })
    expect(shift).toEqual({ value: 60, changes: { paddingLeft: 60 } })
  })

  test('moves a gap along its axis, rounds it under Shift, and clamps it at zero', () => {
    const gap = { kind: 'gap' as const, axis: 'primary' as const, index: 0 }
    expect(
      autoLayoutDragValue(layout, gap, { dx: 15, dy: 0, zoom: 1, alt: false, shift: false })
    ).toBe(35)
    expect(
      autoLayoutDragValue(layout, gap, { dx: 15, dy: 0, zoom: 1, alt: false, shift: true })
    ).toBe(40)
    expect(
      autoLayoutDragValue(layout, gap, { dx: 20, dy: 0, zoom: 2, alt: false, shift: false })
    ).toBe(30)
    expect(
      autoLayoutDragValue(layout, gap, { dx: -100, dy: 0, zoom: 1, alt: false, shift: false })
    ).toBe(0)
  })

  test('writes itemSpacing and counterAxisSpacing respectively', () => {
    expect(
      autoLayoutDragChanges(
        layout,
        { kind: 'gap', axis: 'primary', index: 0 },
        {
          dx: 15,
          dy: 0,
          zoom: 1,
          alt: false,
          shift: false
        }
      ).changes
    ).toEqual({ itemSpacing: 35 })

    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, {
      width: 100,
      height: 100,
      layoutMode: 'HORIZONTAL',
      layoutWrap: 'WRAP',
      counterAxisSpacing: 8
    })
    const wrapped = [
      graph.createNode('RECTANGLE', frame.id, { x: 0, y: 0, width: 40, height: 30 }),
      graph.createNode('RECTANGLE', frame.id, { x: 0, y: 60, width: 40, height: 30 })
    ]
    const wrapLayout = expectDefined(measureAutoLayoutHandles(frame, wrapped))
    expect(
      autoLayoutDragChanges(
        wrapLayout,
        { kind: 'gap', axis: 'counter', index: 0 },
        {
          dx: 0,
          dy: 15,
          zoom: 1,
          alt: false,
          shift: false
        }
      ).changes
    ).toEqual({ counterAxisSpacing: 23 })
  })
})
