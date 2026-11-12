import { expect, test } from 'bun:test'

import { FigmaAPI } from '@open-pencil/core/figma-api'
import {
  ALL_TOOLS,
  getScriptToolHost,
  registerScriptToolHost,
  type ScriptToolHost
} from '@open-pencil/core/tools'
import { SceneGraph } from '@open-pencil/scene-graph'

import { expectDefined } from '#tests/helpers/assert'

const scriptTool = expectDefined(
  ALL_TOOLS.find((tool) => tool.name === 'script'),
  'script'
)

/** The host owns the sandbox and the store; the tool only reads the document's graph. */
function figmaFor(graph: SceneGraph) {
  return new FigmaAPI(graph)
}

function fakeHost(calls: string[]): ScriptToolHost {
  return {
    async create({ source }) {
      calls.push(`create:${source}`)
      return { id: 'script-1', ok: true, layers: 2 }
    },
    setSource(id, source) {
      calls.push(`set:${id}:${source}`)
    },
    async run(id) {
      calls.push(`run:${id}`)
      return { id, ok: true, layers: 3 }
    }
  }
}

test('a host without a sandbox reports that script layers are unavailable', async () => {
  const graph = new SceneGraph()
  await expect(scriptTool.execute(figmaFor(graph), { action: 'run', id: 'nope' })).rejects.toThrow(
    'Script layers are not available in this host.'
  )
})

test('create places a code layer through the host and run does not edit it', async () => {
  const graph = new SceneGraph()
  const calls: string[] = []
  const unregister = registerScriptToolHost(graph, fakeHost(calls))
  try {
    expect(
      await scriptTool.execute(figmaFor(graph), { action: 'create', source: 'rect()' })
    ).toEqual({ id: 'script-1', ok: true, layers: 2 })
    expect(await scriptTool.execute(figmaFor(graph), { action: 'run', id: 'script-1' })).toEqual({
      id: 'script-1',
      ok: true,
      layers: 3
    })
    expect(calls).toEqual(['create:rect()', 'run:script-1'])
  } finally {
    unregister()
  }
  expect(getScriptToolHost(graph)).toBeUndefined()
})

test('set_source writes the program and runs the layer again', async () => {
  const graph = new SceneGraph()
  const calls: string[] = []
  registerScriptToolHost(graph, fakeHost(calls))
  await scriptTool.execute(figmaFor(graph), { action: 'set_source', id: 'script-1', source: 'x' })
  expect(calls).toEqual(['set:script-1:x', 'run:script-1'])
})

test('a call missing its source or its layer names what it needs', async () => {
  const graph = new SceneGraph()
  registerScriptToolHost(graph, fakeHost([]))
  await expect(scriptTool.execute(figmaFor(graph), { action: 'create' })).rejects.toThrow(
    'create needs a source.'
  )
  await expect(scriptTool.execute(figmaFor(graph), { action: 'run' })).rejects.toThrow(
    "run needs the code layer's id."
  )
  await expect(
    scriptTool.execute(figmaFor(graph), { action: 'set_source', id: 'script-1' })
  ).rejects.toThrow('set_source needs a source.')
})
