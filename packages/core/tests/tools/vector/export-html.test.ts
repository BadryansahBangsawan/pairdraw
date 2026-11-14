import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'

import * as v from 'valibot'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { headlessHTMLStyler } from '@pairdraw/core/io/formats/html/import'
import { ALL_TOOLS, registerHTMLToolHost } from '@pairdraw/core/tools'
import { SceneGraph } from '@pairdraw/scene-graph'

const exportHTML = ALL_TOOLS.find((tool) => tool.name === 'export_html')
if (!exportHTML) throw new Error('export_html tool missing')

type HTMLResult = {
  html?: string
  assets?: Array<{ path: string; text?: string; base64?: string }>
  error?: string
}

async function run(figma: FigmaAPI, args: Record<string, unknown>): Promise<HTMLResult> {
  return (await exportHTML?.execute(figma, args)) as HTMLResult
}

function card() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const frame = graph.createNode('FRAME', figma.currentPage.id, {
    name: 'Card',
    width: 120,
    height: 60,
    fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
  })
  return { graph, figma, frame }
}

describe('export_html', () => {
  test('defaults to a CSS fragment with inline assets', () => {
    expect(v.parse(exportHTML.input, {})).toEqual({
      style: 'css',
      html: 'fragment',
      assets: 'inline',
      layer_names: true,
      layer_ids: false
    })
    expect(v.safeParse(exportHTML.input, { style: 'inline' }).success).toBe(false)
  })

  test('returns markup styled with CSS for the given layers', async () => {
    const { figma, frame } = card()
    const result = await run(figma, { ids: [frame.id] })
    expect(result.html).toContain('width: 120px')
    expect(result.html).toContain('#FF0000')
    expect(result.assets).toBeUndefined()
  })

  test('writes Tailwind classes, a whole document, or external files on request', async () => {
    const { figma, frame } = card()
    const tailwind = await run(figma, { ids: [frame.id], style: 'tailwind' })
    expect(tailwind.html).toContain('class="w-30 h-15 bg-[#FF0000]"')

    const standalone = await run(figma, { ids: [frame.id], html: 'standalone' })
    expect(standalone.html?.toLowerCase()).toContain('<!doctype html>')

    const external = await run(figma, {
      ids: [frame.id],
      html: 'standalone',
      assets: 'external'
    })
    expect(external.html).toContain('pairdraw.css')
    expect(external.assets?.some((asset) => asset.path.endsWith('.css') && asset.text)).toBe(true)
  })

  test('writes layer names unless turned off, and layer IDs on request', async () => {
    const { figma, frame } = card()
    expect((await run(figma, { ids: [frame.id] })).html).toContain('data-name="Card"')
    const bare = await run(figma, { ids: [frame.id], layer_names: false })
    expect(bare.html).not.toContain('data-name')
    expect(bare.html).not.toContain('data-pairdraw-node-id')
    const linked = await run(figma, { ids: [frame.id], layer_ids: true })
    expect(linked.html).toContain(`data-pairdraw-node-id="${frame.id}"`)
  })

  test('reads Tailwind stylesheets through the host for a standalone Tailwind page', async () => {
    const { graph, figma, frame } = card()
    const loaded: string[] = []
    // A browser host loads them from its bundle; here they come from the installed package.
    registerHTMLToolHost(graph, {
      style: headlessHTMLStyler,
      loadTailwindStylesheet: async (id: string) => {
        loaded.push(id)
        return readFile(new URL(import.meta.resolve(id)), 'utf8')
      }
    })
    const result = await run(figma, { ids: [frame.id], style: 'tailwind', html: 'standalone' })
    expect(result.error).toBeUndefined()
    expect(loaded.toSorted()).toEqual(['tailwindcss/theme.css', 'tailwindcss/utilities.css'])
    expect(result.html).toContain('bg-\\[\\#FF0000\\]')
  })

  test('declares network access, which downloading web fonts for separate files needs', () => {
    expect(exportHTML.capabilities).toContain('network:access')
  })

  test('names a missing layer', async () => {
    const { figma } = card()
    expect(await run(figma, { ids: ['9:9'] })).toEqual({ error: 'Node "9:9" not found' })
  })
})
