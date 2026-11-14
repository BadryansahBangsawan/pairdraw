import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'

import { toUint8Array } from 'js-base64'

import { initCanvasKit } from '@pairdraw/core/io/formats/raster'

import type { EditorStore } from '@/app/editor/active-store'
import { setVectorizeCredential, vectorizeProviderID } from '@/app/editor/vectorize'
import { createAgentImageVectorizer } from '@/app/editor/vectorize/agent'

import { asDouble } from '#tests/helpers/doubles'
import { fetchStub } from '#tests/helpers/fetch'

const ck = await initCanvasKit()
const store = asDouble<EditorStore>({ renderer: { ck } })
/** A whole 1×1 PNG, which the service is sent after preparation. */
const PIXEL_PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
)
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><path d="M0 0h4v4z"/></svg>'
const request = { imageHash: 'photo', bytes: PIXEL_PNG }

beforeEach(async () => {
  vectorizeProviderID.value = 'quiver'
  await setVectorizeCredential('quiver', '')
})

afterEach(async () => {
  await setVectorizeCredential('quiver', '')
  vectorizeProviderID.value = 'recraft'
})

describe('the vectorize service agents reach', () => {
  test('asks for a key in Settings when none is saved, without calling the service', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch')
    try {
      await expect(createAgentImageVectorizer(store).vectorize(request)).rejects.toThrow(
        'No QuiverAI API key is saved. Ask the user to add one in Settings → Image services'
      )
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      fetchSpy.mockRestore()
    }
  })

  test('sends the prepared image with the saved key and returns the SVG', async () => {
    await setVectorizeCredential('quiver', 'sk_test_1')
    const authorizations: (string | null)[] = []
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      fetchStub(async (_input, init) => {
        authorizations.push(new Headers(init?.headers).get('authorization'))
        return Response.json({ id: 'resp_1', created: 1, data: [{ svg: SVG }] })
      })
    )
    try {
      expect(await createAgentImageVectorizer(store).vectorize(request)).toBe(SVG)
      expect(authorizations).toEqual(['Bearer sk_test_1'])
    } finally {
      fetchSpy.mockRestore()
    }
  })

  test('prepares the image for a document whose canvas never mounted', async () => {
    await setVectorizeCredential('quiver', 'sk_test_1')
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      fetchStub(async () => Response.json({ id: 'resp_1', created: 1, data: [{ svg: SVG }] }))
    )
    try {
      const unmounted = asDouble<EditorStore>({ renderer: null })
      expect(await createAgentImageVectorizer(unmounted).vectorize(request)).toBe(SVG)
    } finally {
      fetchSpy.mockRestore()
    }
  })

  test('says to update a key the service rejects', async () => {
    await setVectorizeCredential('quiver', 'bad')
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
      fetchStub(async () => new Response('{"error":"invalid key"}', { status: 401 }))
    )
    try {
      await expect(createAgentImageVectorizer(store).vectorize(request)).rejects.toThrow(
        'QuiverAI rejected the saved API key. Ask the user to update it in Settings → Image services.'
      )
    } finally {
      fetchSpy.mockRestore()
    }
  })
})
