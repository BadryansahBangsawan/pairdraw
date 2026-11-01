import 'fake-indexeddb/auto'
import '#tests/helpers/fonts/offline'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { bench, group, run } from 'mitata'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { createJSXPreviewRecorder, stageJSXPreview } from '@pairdraw/core/design-jsx'
import { FigmaAPI } from '@pairdraw/core/figma-api'
import { parseFigFile, exportFigFile } from '@pairdraw/core/io/formats/fig'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'
import { ALL_TOOLS } from '@pairdraw/core/tools'
import { createStreamingJSXParser } from '@pairdraw/design-jsx'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph } from '@pairdraw/scene-graph'
import { copyFills } from '@pairdraw/scene-graph/copy'

import { changePreviewSize } from '@/app/ai/chat/preferences'
import { endRun, startRun } from '@/app/ai/reply/run'
import { runEditorTool } from '@/app/ai/tools/runner'
import { createEditorStore } from '@/app/editor/session/create'

// `bun tests/engine/perf.bench.ts "AI agent run"` runs only the benchmarks whose name matches.
const filter = process.argv[2] ? new RegExp(process.argv[2]) : undefined

const FIXTURES = resolve(import.meta.dir, '../fixtures')

const goldBuf = readFileSync(resolve(FIXTURES, 'gold-preview.fig'))
const materialBuf = readFileSync(resolve(FIXTURES, 'material3.fig'))

await initCodec()

group('parseFigFile', () => {
  bench('gold-preview.fig (537K)', async () => {
    await parseFigFile(goldBuf.buffer.slice(0) as ArrayBuffer)
  })

  bench('material3.fig (55M)', async () => {
    await parseFigFile(materialBuf.buffer.slice(0) as ArrayBuffer)
  })
})

const goldGraph = await parseFigFile(goldBuf.buffer.slice(0) as ArrayBuffer)
const materialGraph = await parseFigFile(materialBuf.buffer.slice(0) as ArrayBuffer)

group('exportFigFile', () => {
  bench('gold-preview', async () => {
    await exportFigFile(goldGraph)
  })

  bench('material3', async () => {
    await exportFigFile(materialGraph)
  })
})

group('SceneGraph operations', () => {
  bench('getAllNodes (material3)', () => {
    const nodes = [...materialGraph.getAllNodes()]
    void nodes.length
  })

  const sampleIds = [...materialGraph.getAllNodes()].slice(0, 1000).map((n) => n.id)
  bench('getNode × 1000 (material3)', () => {
    for (const id of sampleIds) materialGraph.getNode(id)
  })

  bench('createNode + deleteNode × 100', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const ids: string[] = []
    for (let i = 0; i < 100; i++) {
      const node = graph.createNode('RECTANGLE', page.id, {
        name: `R${i}`,
        width: 50,
        height: 50
      })
      ids.push(node.id)
    }
    for (const id of ids) graph.deleteNode(id)
  })
})

group('SceneNode memory', () => {
  bench('create 10k nodes', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    for (let i = 0; i < 10_000; i++) {
      graph.createNode('RECTANGLE', page.id, {
        name: `R${i}`,
        width: 50,
        height: 50
      })
    }
  })
})

group('structuredClone vs copy (fills)', () => {
  const sampleFills = [
    {
      type: 'SOLID' as const,
      color: { r: 1, g: 0, b: 0, a: 1 },
      opacity: 1,
      visible: true,
      blendMode: 'NORMAL' as const
    },
    {
      type: 'SOLID' as const,
      color: { r: 0, g: 1, b: 0, a: 1 },
      opacity: 0.5,
      visible: true,
      blendMode: 'NORMAL' as const
    }
  ]

  bench('structuredClone × 10k', () => {
    for (let i = 0; i < 10_000; i++) structuredClone(sampleFills)
  })

  bench('copyFills × 10k', () => {
    for (let i = 0; i < 10_000; i++) copyFills(sampleFills)
  })
})

/**
 * A chat reply editing a page of about 2,000 layers in ten large sections: each sample is one
 * small call through the runner a reply's calls take, with its undo entry, recorded change, and
 * JSX diff, each time on another layer.
 */
async function agentRunDocument(previews: boolean) {
  const store = createEditorStore()
  if (previews) {
    const ck = await initCanvasKit()
    const surface = ck.MakeSurface(1, 1)
    if (!surface) throw new Error('Failed to create CanvasKit surface')
    const renderer = new SkiaRenderer(ck, surface)
    await renderer.loadFonts()
    store.setCanvasKit(ck, renderer)
  }
  const pageId = store.state.currentPageId
  const sections: string[] = []
  const leaves: string[] = []
  for (let s = 0; s < 10; s++) {
    const section = store.graph.createNode('FRAME', pageId, {
      name: `Section ${s}`,
      x: s * 1500,
      width: 1440,
      height: 4000,
      clipsContent: true
    })
    sections.push(section.id)
    for (let c = 0; c < 20; c++) {
      const card = store.graph.createNode('FRAME', section.id, {
        name: `Card ${s}-${c}`,
        x: 20,
        y: c * 190,
        width: 400,
        height: 180
      })
      for (let l = 0; l < 9; l++) {
        const text = l % 3 === 0
        const leaf = store.graph.createNode(text ? 'TEXT' : 'RECTANGLE', card.id, {
          name: `${text ? 'Label' : 'Row'} ${l}`,
          x: 10,
          y: l * 18,
          width: 300,
          height: 14,
          ...(text && { text: `Item ${s}-${c}-${l}` })
        })
        leaves.push(leaf.id)
      }
    }
  }
  const figma = new FigmaAPI(store.graph)
  figma.currentPage = figma.wrapNode(pageId)
  const run = startRun(store, 1_000_000)
  const tools = new Map(ALL_TOOLS.map((def) => [def.name, def]))
  const argsFor: Record<string, (index: number) => Record<string, unknown>> = {
    set_fill: (index) => ({
      id: leaves[(index * 37) % leaves.length],
      color: index % 2 ? '#FF0000' : '#00FF00'
    }),
    update_node: (index) => ({ id: leaves[(index * 41) % leaves.length], x: 10 + (index % 50) }),
    render: (index) => ({
      parent_id: sections[index % sections.length],
      jsx: `<Frame name="Badge ${index}" w={120} h={40} bg="#EEEEEE"><Text>New ${index}</Text></Frame>`
    })
  }
  let calls = 0

  return {
    /** The reply ends, so the design check it held off runs again. */
    end: () => endRun(store, run),
    call: async (name: string) => {
      const def = tools.get(name)
      const args = argsFor[name]
      if (!def || !args) throw new Error(`Missing tool ${name}`)
      const index = calls++
      await runEditorTool({
        store,
        figma,
        def,
        args: args(index),
        reply: { run, toolCallId: `call-${index}` }
      })
    }
  }
}

group('AI agent run (2,000-layer page)', () => {
  for (const name of ['set_fill', 'update_node', 'render']) {
    bench(`${name} call`, function* () {
      changePreviewSize.value = 'off'
      const reply = agentRunDocument(false)
      yield async () => (await reply).call(name)
      void reply.then(({ end }) => end())
    })
  }

  bench('render call with change previews on', function* () {
    changePreviewSize.value = 'small'
    const reply = agentRunDocument(true)
    yield async () => (await reply).call('render')
    void reply.then(({ end }) => end())
  })
})

/** A landing page of `rows` rows of two cards, as an agent's `render` call streams it. */
function landingJSX(rows: number): string {
  const card = (i: number) =>
    `<Frame name="Card ${i}" flex="col" gap={8} p={16} w={320} bg="#FFFFFF" rounded={12}><Text size={18} weight="bold">Feature ${i}</Text><Text size={14} color="#555555">Some description text for feature ${i} that wraps.</Text><Frame flex="row" gap={8}><Frame w={80} h={32} bg="#3366FF" rounded={8} /><Frame w={80} h={32} bg="#EEEEEE" rounded={8} /></Frame></Frame>`
  const body = Array.from(
    { length: rows },
    (_, i) => `<Frame flex="row" gap={16}>${card(i)}${card(i + 100)}</Frame>`
  ).join('')
  return `<Frame name="Landing" flex="col" w={1440} gap={24} p={48} bg="#F8F8F8"><Text size={48} weight="bold">Hero</Text>${body}</Frame>`
}

group('Streamed render preview (60 cards)', () => {
  // One preview update as the agent finishes writing: the staged copy and its picture, after the
  // updates before it, which leave the text they shaped behind for this one.
  bench('preview update', function* () {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const ready = (async () => {
      const ck = await initCanvasKit()
      const recorder = createJSXPreviewRecorder(ck)
      const signal = new AbortController().signal
      const stage = async (rows: number) => {
        const jsx = landingJSX(rows)
        const tree = createStreamingJSXParser().append(jsx).tree
        if (!tree) throw new Error('Missing preview tree')
        const staged = await stageJSXPreview(graph, tree, {}, pageId)
        if (!staged) throw new Error('Missing staged preview')
        return staged
      }
      for (const rows of [10, 20, 29]) (await recorder.record(await stage(rows), signal))?.delete()
      return { recorder, signal, stage }
    })()
    yield async () => {
      const { recorder, signal, stage } = await ready
      ;(await recorder.record(await stage(30), signal))?.delete()
    }
  })
})

await run({ filter })
