import type { Page } from '@playwright/test'
import { toUint8Array } from 'js-base64'
import * as v from 'valibot'

import { createCanvasKitRasterCodec, initCanvasKit } from '@pairdraw/core/io/formats/raster'
import { imageSize } from '@pairdraw/scene-graph/images'

import { expect, test } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'

const createdSchema = v.object({
  ok: v.boolean(),
  result: v.object({ created: v.boolean() }),
  target: v.object({ documentId: v.string(), documentName: v.string() })
})

const shapeSchema = v.object({ ok: v.boolean(), result: v.object({ id: v.string() }) })

const imageSchema = v.object({
  ok: v.boolean(),
  result: v.object({ base64: v.string(), mimeType: v.string() })
})

const listedSchema = v.object({
  ok: v.boolean(),
  result: v.object({
    documents: v.array(v.object({ id: v.string(), name: v.string(), active: v.boolean() }))
  })
})

/** Sends an automation request the way the MCP bridge delivers it. */
function automation(page: Page, command: string, args: unknown = {}) {
  return page.evaluate(([name, payload]) => window.pairdraw?.test?.automation?.(name, payload), [
    command,
    args
  ] as const)
}

test('export_image draws a document that is open behind the person, without bringing it forward', async ({
  page
}) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()

  const before = v.parse(listedSchema, await automation(page, 'list_documents'))
  const inFront = before.result.documents.find((document) => document.active)
  expect(inFront).toBeDefined()

  const created = v.parse(createdSchema, await automation(page, 'new_document'))
  const background = created.target.documentId
  const shape = v.parse(
    shapeSchema,
    await automation(page, 'tool', {
      name: 'create_shape',
      document_id: background,
      args: { type: 'FRAME', x: 0, y: 0, width: 320, height: 200, name: 'Card' }
    })
  )

  // The person works on their own document while the other stays open behind them.
  const tabs = page.getByTestId('tabbar-tab')
  await expect(tabs).toHaveCount(before.result.documents.length + 1)
  // The new document is in front after it is made; the person's is the first tab.
  await tabs.first().click()
  const returned = v.parse(listedSchema, await automation(page, 'list_documents'))
  expect(returned.result.documents.find((document) => document.active)?.id).toBe(inFront?.id)

  const image = v.parse(
    imageSchema,
    await automation(page, 'tool', {
      name: 'export_image',
      document_id: background,
      args: { ids: [shape.result.id], format: 'PNG', scale: 1 }
    })
  )

  const bytes = toUint8Array(image.result.base64)
  expect(image.result.mimeType).toBe('image/png')
  expect(imageSize(bytes)).toEqual({ width: 320, height: 200 })

  // A drawn frame, not an empty image: the middle of the card is an opaque pixel.
  const decoded = createCanvasKitRasterCodec(await initCanvasKit()).decode(bytes)
  if (!decoded) throw new Error('The exported image did not decode')
  const middle =
    (Math.floor(decoded.height / 2) * decoded.width + Math.floor(decoded.width / 2)) * 4
  expect(decoded.data[middle + 3]).toBe(255)

  // The person's document is still the one in front, and its view did not move.
  const after = v.parse(listedSchema, await automation(page, 'list_documents'))
  expect(after.result.documents.find((document) => document.active)?.id).toBe(inFront?.id)
  expect(after.result.documents).toHaveLength(before.result.documents.length + 1)
})
