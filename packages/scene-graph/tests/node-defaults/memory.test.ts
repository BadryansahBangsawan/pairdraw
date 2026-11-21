import { expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

// A heap benchmark: it fills the heap with 40,000 layers and reads the collector, so it runs only
// in heavy runs (`BUN_HEAVY_TESTS`), each heavy file in its own process. `shared-values.test.ts`
// checks the sharing itself in every run.
const runsHeavyTests = ['1', 't', 'true'].includes(
  (process.env.BUN_HEAVY_TESTS ?? '').trim().toLowerCase()
)

/** Heap a default layer adds, including its entry in the graph's node map. */
const BYTES_PER_LAYER_BUDGET = 2600

function liveHeap(): number {
  Bun.gc(true)
  Bun.gc(true)
  return process.memoryUsage().heapUsed
}

/** Least-squares slope of heap over live layer count, so collector noise at one point cancels. */
function bytesPerLayer(points: readonly (readonly [number, number])[]): number {
  const meanX = points.reduce((sum, [x]) => sum + x, 0) / points.length
  const meanY = points.reduce((sum, [, y]) => sum + y, 0) / points.length
  const covariance = points.reduce((sum, [x, y]) => sum + (x - meanX) * (y - meanY), 0)
  const variance = points.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0)
  return covariance / variance
}

test.if(runsHeavyTests)('a default layer stays within its heap budget', () => {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const frameId = graph.createNode('FRAME', pageId).id
  const points: [number, number][] = []
  for (const count of [10_000, 20_000, 30_000, 40_000]) {
    while (graph.nodes.size < count) graph.createNode('RECTANGLE', frameId)
    points.push([graph.nodes.size, liveHeap()])
  }
  expect(bytesPerLayer(points)).toBeLessThan(BYTES_PER_LAYER_BUDGET)
})
