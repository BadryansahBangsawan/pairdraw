import { expect, test } from 'bun:test'
import { inflateSync } from 'node:zlib'

import { exportPDFDocument } from '@pairdraw/core/io/formats/pdf'
import { SceneGraph } from '@pairdraw/scene-graph'

/** A page with one rectangle filled with a color stored in a Display P3 document. */
function p3Card() {
  const graph = new SceneGraph()
  graph.documentColorSpace = 'display-p3'
  const pageId = graph.getPages()[0].id
  const frame = graph.createNode('FRAME', pageId, { name: 'Card', width: 120, height: 80 })
  graph.createNode('RECTANGLE', frame.id, {
    width: 40,
    height: 40,
    fills: [{ type: 'SOLID', color: { r: 0.8, g: 0.4, b: 0.3, a: 1 }, opacity: 1, visible: true }]
  })
  return { graph, pageId, frameId: frame.id }
}

/** The page content streams of `pdf`, decompressed. */
function pageContent(pdf: Uint8Array): string {
  const latin = new TextDecoder('latin1').decode(pdf)
  let content = ''
  let index = 0
  while ((index = latin.indexOf('stream', index)) !== -1) {
    let start = index + 'stream'.length
    if (latin[start] === '\r') start++
    if (latin[start] === '\n') start++
    const end = latin.indexOf('endstream', start)
    if (end === -1) break
    try {
      content += `${inflateSync(pdf.subarray(start, end)).toString('latin1')}\n`
      // oxlint-disable-next-line pairdraw/no-silent-catch -- Not a Flate stream.
    } catch {
      // Not a Flate stream.
    }
    index = end + 1
  }
  return content
}

test('fills a Display P3 document in the sRGB color it shows', async () => {
  const { graph, pageId, frameId } = p3Card()
  const result = await exportPDFDocument(graph, [{ pageId, nodeIds: [frameId] }], {
    embedFonts: false
  })
  const content = pageContent(result?.data ?? new Uint8Array())
  expect(content).toContain('0.86 0.37 0.27 rg')
  expect(content).not.toContain('0.8 0.4 0.3 rg')
})
