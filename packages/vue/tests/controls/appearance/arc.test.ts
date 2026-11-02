import { describe, expect, test } from 'bun:test'

import { createApp, shallowReactive } from 'vue'

import { createDefaultEditorState, createEditor } from '@open-pencil/core'
import { SceneGraph } from '@open-pencil/scene-graph'
import { MIXED } from '@open-pencil/vue/controls/node-props'

import { useArc } from '#vue/controls/appearance/arc'
import { EDITOR_KEY } from '#vue/editor/context'

const DEGREE = Math.PI / 180

/** Two ellipses, the second already an arc, and a rectangle, with `useArc` on the editor. */
function setup() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const editor = createEditor({ graph, state: shallowReactive(createDefaultEditorState(page.id)) })
  const whole = graph.createNode('ELLIPSE', page.id, { width: 100, height: 100 })
  const quarter = graph.createNode('ELLIPSE', page.id, {
    width: 100,
    height: 100,
    arcData: { startingAngle: 90 * DEGREE, endingAngle: 180 * DEGREE, innerRadius: 0 }
  })
  const box = graph.createNode('RECTANGLE', page.id, { width: 100, height: 100 })
  const app = createApp({ render: () => null })
  app.provide(EDITOR_KEY, editor)
  const arc = app.runWithContext(() => useArc())
  return { editor, graph, arc, whole, quarter, box }
}

function degrees(angle: number | undefined) {
  return angle === undefined ? undefined : Math.round(angle / DEGREE)
}

describe('arc fields', () => {
  test('show for ellipses only', () => {
    const { editor, arc, whole, box } = setup()
    editor.select([box.id])
    expect(arc.active.value).toBe(false)
    editor.select([whole.id, box.id])
    expect(arc.active.value).toBe(false)
    editor.select([whole.id])
    expect(arc.active.value).toBe(true)
    expect([arc.start.value, arc.sweep.value, arc.ratio.value]).toEqual([0, 100, 0])
  })

  test('ellipses that differ show the field as mixed', () => {
    const { editor, arc, whole, quarter } = setup()
    editor.select([whole.id, quarter.id])
    expect(arc.start.value).toBe(MIXED)
    expect(arc.sweep.value).toBe(MIXED)
    expect(arc.ratio.value).toBe(0)
  })

  test('a scrub previews each step and commits one undo step for every ellipse', () => {
    const { editor, graph, arc, whole, quarter } = setup()
    editor.select([whole.id, quarter.id])

    arc.update('ratio', 20)
    arc.update('ratio', 40)
    expect(graph.getNode(whole.id)?.arcData?.innerRadius).toBe(0.4)
    arc.commit('ratio', 40)

    expect(graph.getNode(quarter.id)?.arcData).toMatchObject({ innerRadius: 0.4 })
    expect(degrees(graph.getNode(quarter.id)?.arcData?.startingAngle)).toBe(90)

    editor.undo.undo()
    expect(graph.getNode(whole.id)?.arcData).toBeNull()
    expect(graph.getNode(quarter.id)?.arcData?.innerRadius).toBe(0)
    editor.undo.redo()
    expect(graph.getNode(whole.id)?.arcData?.innerRadius).toBe(0.4)
  })

  test('a typed value commits without a preview, and a cancelled scrub puts the arc back', () => {
    const { editor, graph, arc, quarter } = setup()
    editor.select([quarter.id])

    arc.commit('start', 0)
    expect(degrees(graph.getNode(quarter.id)?.arcData?.startingAngle)).toBe(0)
    expect(degrees(graph.getNode(quarter.id)?.arcData?.endingAngle)).toBe(90)

    arc.update('sweep', 50)
    arc.cancel()
    expect(degrees(graph.getNode(quarter.id)?.arcData?.endingAngle)).toBe(90)
  })
})
