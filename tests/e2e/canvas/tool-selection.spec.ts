import { readFile } from 'node:fs/promises'

import {
  Client,
  SdkError,
  SdkErrorCode,
  StreamableHTTPClientTransport
} from '@modelcontextprotocol/client'
import type { Page } from '@playwright/test'
import * as v from 'valibot'

import { parseDiscoveryInfo } from '@pairdraw/mcp/discovery'

import { devMCPDiscoveryPath } from '@/app/automation/bridge/discovery-path'
import { devAutomationRoute } from '@/app/automation/bridge/portless-route'

import { expect, test, useFreshEditor } from '#tests/e2e/fixtures'

/**
 * Seam: an MCP client selects a layer, then the canvas draws that layer's handles.
 * Catches a selection the tool reports while the canvas keeps drawing nothing selected.
 * Misses a selection on a page that is not the one on screen.
 */

test.beforeEach(() => {
  test.setTimeout(60_000)
})

const textPartSchema = v.object({ type: v.literal('text'), text: v.string() })
const createdSchema = v.object({ id: v.string() })
const selectedSchema = v.object({ selected: v.array(v.string()) })
const readSchema = v.object({ selection: v.array(v.object({ id: v.string() })) })

const editor = useFreshEditor()

function mcpPort(): string {
  return process.env.PAIRDRAW_TEST_MCP_PORT ?? '7691'
}

async function connectClient(): Promise<Client> {
  const port = Number(mcpPort())
  const info = parseDiscoveryInfo(
    await readFile(devMCPDiscoveryPath(devAutomationRoute(undefined, port).runtimeId), 'utf8')
  )
  if (!info || info.httpPort !== port) throw new Error('The test MCP server has no discovery file')
  const client = new Client({ name: 'tool-selection', version: '0.0.0' })
  const headers: Record<string, string> = {}
  if (info.authToken) headers.Authorization = `Bearer ${info.authToken}`
  const transport = new StreamableHTTPClientTransport(
    new URL(`http://127.0.0.1:${info.httpPort}/mcp`),
    {
      requestInit: { headers }
    }
  )
  await client.connect(transport)
  return client
}

function toolText(result: { isError?: boolean; content: unknown[] }): string {
  for (const part of result.content) {
    const parsed = v.safeParse(textPartSchema, part)
    if (parsed.success) return parsed.output.text
  }
  throw new Error(result.isError ? 'MCP tool failed' : 'MCP tool returned no text')
}

function toolData<T>(
  result: { isError?: boolean; content: unknown[] },
  schema: v.GenericSchema<unknown, T>
): T {
  const text = toolText(result)
  if (result.isError) throw new Error('MCP tool failed')
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), schema), text)
  if (!parsed.success) throw new Error('MCP tool returned an unexpected result')
  return parsed.output
}

async function callTool<T>(
  client: Client,
  name: string,
  args: Record<string, unknown>,
  schema: v.GenericSchema<unknown, T>
): Promise<T> {
  const result = await client.callTool({ name, arguments: args })
  return toolData({ isError: result.isError, content: result.content }, schema)
}

/** Opaque white pixels. A selection handle is a solid block; a grid line is a few. */
function solidWhitePixels(pixels: readonly (readonly number[])[]): number {
  return pixels.filter((pixel) => {
    const [red, green, blue, alpha] = pixel
    return (
      red !== undefined &&
      green !== undefined &&
      blue !== undefined &&
      alpha !== undefined &&
      alpha >= 250 &&
      red >= 250 &&
      green >= 250 &&
      blue >= 250
    )
  }).length
}

/**
 * The overlay pixels around a layer's top-left corner, read when that canvas presents.
 * Handles are drawn there. The editor selection is read at the same time.
 */
function cornerSample(
  page: Page,
  nodeId: string
): Promise<{
  selected: string[]
  pixels: number[][]
}> {
  return page.evaluate(
    (id) =>
      new Promise((resolve, reject) => {
        const store = window.pairdraw?.getStore?.()
        const node = store?.graph.getNode(id)
        const renderer = store?.canvasRenderers.find((item) => !item.tracksSceneSettlement)
        const overlay = document.querySelector<HTMLCanvasElement>('[data-test-id="canvas-element"]')
        if (!store || !node || !renderer || !overlay) {
          reject(new Error('Layer unavailable'))
          return
        }
        const position = store.graph.getAbsolutePosition(id)
        const x = store.state.panX + position.x * store.state.zoom
        const y = store.state.panY + position.y * store.state.zoom
        const scaleX = overlay.width / overlay.clientWidth
        const scaleY = overlay.height / overlay.clientHeight
        const left = Math.round((x - 4) * scaleX)
        const top = Math.round((y - 4) * scaleY)
        const width = Math.max(1, Math.round(8 * scaleX))
        const height = Math.max(1, Math.round(8 * scaleY))
        const copy = document.createElement('canvas')
        copy.width = width
        copy.height = height
        const context = copy.getContext('2d', { willReadFrequently: true })
        if (!context) {
          reject(new Error('Pixel decoder unavailable'))
          return
        }
        const surface = renderer.surface
        const flush = surface.flush
        surface.flush = (...args) => {
          const result = flush.apply(surface, args)
          try {
            context.drawImage(overlay, left, top, width, height, 0, 0, width, height)
            const data = context.getImageData(0, 0, width, height).data
            const pixels: number[][] = []
            for (let index = 0; index < data.length; index += 4) {
              const red = data[index]
              const green = data[index + 1]
              const blue = data[index + 2]
              const alpha = data[index + 3]
              if (
                red === undefined ||
                green === undefined ||
                blue === undefined ||
                alpha === undefined
              ) {
                continue
              }
              pixels.push([red, green, blue, alpha])
            }
            resolve({ selected: [...store.state.selectedIds], pixels })
          } finally {
            surface.flush = flush
          }
          return result
        }
        store.requestRepaint()
      }),
    nodeId
  )
}

test('selecting a layer through MCP draws its selection handles', async () => {
  const { page, canvas } = editor
  const client = await connectClient()
  try {
    const created = await callTool(
      client,
      'create_shape',
      { type: 'RECTANGLE', x: 160, y: 140, width: 160, height: 80, name: 'Card' },
      createdSchema
    )
    const before = await cornerSample(page, created.id)
    expect(before.selected).toEqual([])
    const beforeWhite = solidWhitePixels(before.pixels)

    const selected = await callTool(client, 'select_nodes', { ids: [created.id] }, selectedSchema)
    expect(selected.selected).toEqual([created.id])

    const after = await cornerSample(page, created.id)
    expect(after.selected).toEqual([created.id])
    // The handle is a solid white square on the corner. A grid line already there stays a few pixels.
    expect(solidWhitePixels(after.pixels)).toBeGreaterThan(beforeWhite + 24)

    const read = await callTool(client, 'get_selection', {}, readSchema)
    expect(read.selection.map((node) => node.id)).toEqual([created.id])
    canvas.assertNoErrors()
  } finally {
    await client.close().catch((error: unknown) => {
      if (error instanceof SdkError && error.code === SdkErrorCode.ConnectionClosed) return
      throw error
    })
  }
})
