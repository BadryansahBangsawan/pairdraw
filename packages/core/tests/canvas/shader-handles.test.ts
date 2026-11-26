import { describe, expect, test } from 'bun:test'

import type { CanvasKit } from 'canvaskit-wasm'

import { compileShader, SHADER_CACHE_ENTRIES } from '#core/canvas/shaders/compile'

/** A single widening cast, the pattern package tests use instead of `as unknown as`. */
function asDouble<T>(double: object): T {
  return double as T
}

/** A shader body CanvasKit accepts; the suffix makes each source distinct. */
const shader = (index: number) =>
  `void main(){ gl_FragColor = vec4(${(index % 9) / 10}, 0.0, 0.0, 1.0); } // ${index}`

interface FakeHandle {
  deleted: boolean
  delete(): void
}

/** A CanvasKit whose only used entry point hands out handles that record their own deletion. */
function fakeCanvasKit(): { ck: CanvasKit; handles: FakeHandle[] } {
  const handles: FakeHandle[] = []
  const ck = {
    RuntimeEffect: {
      Make: () => {
        const handle: FakeHandle = {
          deleted: false,
          delete() {
            handle.deleted = true
          }
        }
        handles.push(handle)
        return handle
      }
    }
  }
  return { ck: asDouble<CanvasKit>(ck), handles }
}

describe('shader effect handles', () => {
  test('deletes the effect an eviction pushes out of the compile cache', () => {
    const { ck, handles } = fakeCanvasKit()
    for (let index = 0; index <= SHADER_CACHE_ENTRIES; index++) compileShader(ck, shader(index))

    expect(handles).toHaveLength(SHADER_CACHE_ENTRIES + 1)
    expect(handles[0]?.deleted).toBe(true)
    expect(handles.at(-1)?.deleted).toBe(false)
  })

  test('compiles a source again after eviction instead of drawing a deleted handle', () => {
    const { ck, handles } = fakeCanvasKit()
    compileShader(ck, shader(0))
    for (let index = 1; index <= SHADER_CACHE_ENTRIES; index++) compileShader(ck, shader(index))

    const again = compileShader(ck, shader(0))

    expect(handles[0]?.deleted).toBe(true)
    expect(again.effect).not.toBeNull()
    expect(again.effect).not.toBe(handles[0] as unknown)
    expect(handles.at(-1)?.deleted).toBe(false)
  })
})
