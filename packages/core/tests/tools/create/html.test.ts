import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@open-pencil/core/figma-api'
import { headlessHTMLStyler } from '@open-pencil/core/io/formats/html/import'
import { htmlClassNames } from '@open-pencil/core/io/formats/html/layers'
import { ALL_TOOLS, registerHTMLToolHost } from '@open-pencil/core/tools'
import { SceneGraph } from '@open-pencil/scene-graph'

const importHTML = ALL_TOOLS.find((tool) => tool.name === 'import_html')
if (!importHTML) throw new Error('import_html tool missing')

type ImportResult = {
  ids?: string[]
  layers?: Array<{ id: string; name: string; type: string }>
  x?: number
  y?: number
  error?: string
}

async function run(figma: FigmaAPI, args: Record<string, unknown>): Promise<ImportResult> {
  return (await importHTML?.execute(figma, args)) as ImportResult
}

function setup() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  registerHTMLToolHost(graph, { style: headlessHTMLStyler })
  return { graph, figma }
}

const CARD = `<style>.card{display:flex;gap:8px;padding:16px;width:200px;background:#ff0000}</style>
<div class="card" id="card"><div style="width:20px;height:20px;background:#00f"></div></div>`

describe('import_html', () => {
  test('builds styled layers in the open document', async () => {
    const { graph, figma } = setup()
    const result = await run(figma, { html: CARD, x: 40, y: 60 })
    expect(result.error).toBeUndefined()
    expect(result.ids).toHaveLength(1)
    const root = graph.getNode(result.ids?.[0] ?? '')
    expect(root?.parentId).toBe(figma.currentPage.id)
    expect(root).toMatchObject({ x: 40, y: 60 })
    const card = [...graph.getAllNodes()].find((node) => node.layoutMode === 'HORIZONTAL')
    // CSS boxes are content-box: 200px wide plus 16px padding each side.
    expect(card?.width).toBe(232)
    expect(card?.fills[0]?.color).toMatchObject({ r: 1, g: 0, b: 0 })
  })

  test('places content beside what the page already holds', async () => {
    const { graph, figma } = setup()
    graph.createNode('FRAME', figma.currentPage.id, { name: 'Existing', width: 300, height: 100 })
    const result = await run(figma, { html: CARD })
    expect(result).toMatchObject({ x: 400, y: 0 })
  })

  test('imports into a parent and applies extra CSS', async () => {
    const { graph, figma } = setup()
    const parent = graph.createNode('FRAME', figma.currentPage.id, { width: 500, height: 500 })
    const result = await run(figma, {
      html: '<p class="note">Hi</p>',
      css: '.note{color:#00ff00}',
      parent_id: parent.id,
      x: 0,
      y: 0
    })
    expect(graph.getNode(result.ids?.[0] ?? '')?.parentId).toBe(parent.id)
    const text = [...graph.getAllNodes()].find((node) => node.type === 'TEXT')
    expect(text?.fills[0]?.color).toMatchObject({ r: 0, g: 1, b: 0 })
  })

  test('compiles the Tailwind classes the markup uses', async () => {
    const { graph, figma } = setup()
    const result = await run(figma, {
      html: '<div class="flex gap-2 p-4 bg-red-500"><div class="w-5 h-5"></div></div>',
      tailwind: true,
      x: 0,
      y: 0
    })
    expect(result.error).toBeUndefined()
    const row = [...graph.getAllNodes()].find((node) => node.layoutMode === 'HORIZONTAL')
    expect(row).toMatchObject({ itemSpacing: 8, paddingLeft: 16 })
    expect(row?.fills).toHaveLength(1)
  })

  test('reports a host without a CSS runtime and a missing parent', async () => {
    const graph = new SceneGraph()
    expect((await run(new FigmaAPI(graph), { html: CARD })).error).toContain('CSS runtime')
    const { figma } = setup()
    expect(await run(figma, { html: CARD, parent_id: '9:9' })).toEqual({
      error: 'Parent "9:9" not found'
    })
  })
})

describe('htmlClassNames', () => {
  test('collects the class names the markup uses, once each', () => {
    expect(
      htmlClassNames(`<div class="p-4 flex"><span className='flex text-sm'></span></div>`)
    ).toEqual(['p-4', 'flex', 'text-sm'])
  })

  test('reads unquoted values and skips attributes that only end in class', () => {
    expect(
      htmlClassNames(`<div data-class="ignored" class=grid><i aria-class='no' class="gap-2"></i>`)
    ).toEqual(['grid', 'gap-2'])
  })
})
