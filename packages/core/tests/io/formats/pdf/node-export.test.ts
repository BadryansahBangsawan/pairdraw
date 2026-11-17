import { expect, setDefaultTimeout, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { corePackagePath } from '#core-tests/helpers/paths'

setDefaultTimeout(120_000)

/**
 * The PDF export runs in the shipped CLI under Node, where no bundler supplies the globals
 * `svg2pdf.js` expects. Its ESM path is the one that decides whether a `.fig` to PDF export works
 * for an installed CLI, so the check runs the built Core under `node`, not under Bun.
 */
test('exports a PDF under Node', async () => {
  const entry = corePackagePath('dist', 'io', 'formats', 'pdf', 'index.js')
  if (!existsSync(entry)) {
    throw new Error(
      'The PDF export test needs built workspace packages. Run `bun run --filter @pairdraw/core build` first.'
    )
  }
  const script = `
    const { SceneGraph } = await import('@pairdraw/scene-graph')
    const { exportPDFDocument } = await import(${JSON.stringify(pathToFileURL(entry).href)})
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, { name: 'Card', width: 120, height: 80 })
    graph.createNode('RECTANGLE', frame.id, {
      width: 40,
      height: 40,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })
    const result = await exportPDFDocument(graph, [{ pageId, nodeIds: [frame.id] }], { embedFonts: false })
    if (!result) throw new Error('The PDF export wrote nothing')
    if ('jspdf' in globalThis || 'svg2pdf' in globalThis) {
      throw new Error('The PDF export left a jsPDF global behind')
    }
    console.log(new TextDecoder().decode(result.data.slice(0, 5)))
  `
  const proc = Bun.spawn(['node', '--input-type=module', '--eval', script], {
    cwd: corePackagePath(),
    stdout: 'pipe',
    stderr: 'pipe'
  })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  expect({ code: await proc.exited, out: stdout.trim(), err: stderr.trim() }).toEqual({
    code: 0,
    out: '%PDF-',
    err: ''
  })
})
