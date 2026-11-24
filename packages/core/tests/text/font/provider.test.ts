import { describe, expect, test } from 'bun:test'

import type { CanvasKit, TypefaceFontProvider } from 'canvaskit-wasm'

import { SceneGraph } from '@pairdraw/scene-graph'

import { fontManager } from '#core/text/font/manager'
import { leaseFontProvider } from '#core/text/font/provider'
import { readFontReadiness } from '#core/text/font/readiness'
import { resolveFontReadiness } from '#core/text/prepare'

/** CanvasKit whose providers report their deletion, so a lease's last release is observable. */
function recordingCanvasKit() {
  const made: Array<{ deleted: boolean; registrations: string[] }> = []
  const make = () => {
    const entry = { deleted: false, registrations: [] as string[] }
    made.push(entry)
    const provider = {
      registerFont(_data: ArrayBuffer, family: string) {
        entry.registrations.push(family)
      },
      delete() {
        entry.deleted = true
      }
    } as TypefaceFontProvider
    return provider
  }
  return { canvasKit: Object.assign({} as CanvasKit, { TypefaceFontProvider: { Make: make } }), made }
}

describe('a font provider lease', () => {
  test('releasing a hand-paired share twice frees a provider another share still holds', () => {
    const { canvasKit, made } = recordingCanvasKit()
    const first = fontManager.acquireProvider(canvasKit)
    const second = fontManager.acquireProvider(canvasKit)
    expect(second).toBe(first)

    fontManager.releaseProvider(first)
    fontManager.releaseProvider(first)

    expect(made).toHaveLength(1)
    expect(made[0].deleted).toBe(true)
    expect(fontManager.providerFor(canvasKit)).toBeNull()
  })

  test('a lease released twice keeps the provider alive for the other holder', () => {
    const { canvasKit, made } = recordingCanvasKit()
    const first = leaseFontProvider(canvasKit)
    const second = leaseFontProvider(canvasKit)
    expect(second.provider).toBe(first.provider)

    first.release()
    first.release()
    expect(made).toHaveLength(1)
    expect(made[0].deleted).toBe(false)

    second.release()
    expect(made[0].deleted).toBe(true)
  })
})

describe('font readiness', () => {
  test('reading reports the loaded state, resolving loads the default face first', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('TEXT', page.id, { text: 'Hi', fontFamily: 'Inter' })
    const missing = graph.createNode('TEXT', page.id, {
      text: 'Hi',
      fontFamily: 'A Face No Source Has'
    })

    const before = readFontReadiness(graph, [page.id])
    expect(before.faces.some((face) => face.family === 'A Face No Source Has')).toBe(true)

    const after = await resolveFontReadiness(graph, [page.id])
    const inter = after.faces.find((face) => face.family === 'Inter')
    expect(inter?.status).toBe('available')
    expect(after.faithful).toBe(false)
    const unresolved = after.issues.find((face) => face.family === 'A Face No Source Has')
    expect(unresolved?.status).toBe('substituted')
    expect(unresolved?.substituteFamily).toBe('Inter')
    expect(unresolved?.nodeIds).toContain(missing.id)
  })
})
