import { describe, expect, test } from 'bun:test'

import { SceneGraph, type PrototypeReaction } from '@pairdraw/scene-graph'

import {
  planVideoExport,
  videoExportDefaults,
  videoFormatsHere,
  type VideoExportSettings
} from '@/app/document/export/video/record'
import { createEditorStore } from '@/app/editor/session'

function after(seconds: number, nodeId: string): PrototypeReaction {
  return {
    id: `9:${nodeId}`,
    trigger: { type: 'AFTER_TIMEOUT', delay: seconds },
    actions: [
      {
        type: 'NODE',
        nodeId,
        navigation: 'NAVIGATE',
        transition: { type: 'DISSOLVE', duration: 0.5 },
        overlayPosition: 'CENTER'
      }
    ]
  }
}

/** Two 800×600 frames: Intro dissolves to Outro after a second, and Outro leads nowhere. */
function setup() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const intro = graph.createNode('FRAME', pageId, { name: 'Intro', width: 800, height: 600 })
  const outro = graph.createNode('FRAME', pageId, {
    name: 'Outro',
    x: 1000,
    width: 800,
    height: 600
  })
  graph.updateNode(intro.id, { prototypeReactions: [after(1, outro.id)] })
  const store = createEditorStore(graph)
  return { store, intro: intro.id, outro: outro.id }
}

function settings(startFrameId: string, patch: Partial<VideoExportSettings> = {}) {
  return {
    startFrameId,
    format: 'mp4',
    size: '1x',
    fps: 30,
    maxSeconds: 30,
    ...patch
  } satisfies VideoExportSettings
}

describe('exporting a prototype as a video', () => {
  test('starts from the selected frame as an MP4 at the frame’s own size', () => {
    const { store, outro } = setup()
    store.select([outro])

    expect(videoExportDefaults(store)).toEqual(settings(outro))
  })

  test('plans the steps, length, and size the dialog shows', () => {
    const { store, intro } = setup()

    expect(planVideoExport(store, settings(intro))).toEqual({
      kind: 'ready',
      steps: 1,
      durationMs: 2500,
      width: 800,
      height: 600,
      loops: false,
      truncated: false
    })
  })

  test('fits the long edge into 1280 pixels', () => {
    const { store, intro } = setup()

    expect(planVideoExport(store, settings(intro, { size: '1280' }))).toMatchObject({
      width: 1280,
      height: 960
    })
  })

  test('says which frame has nothing to follow', () => {
    const { store, outro } = setup()

    expect(planVideoExport(store, settings(outro))).toEqual({
      kind: 'nothing-to-follow',
      frame: 'Outro'
    })
  })

  test('offers GIF while an MP4 is set to 60 fps, since GIF records at its own rate', async () => {
    const { store, intro } = setup()

    expect(await videoFormatsHere(store, settings(intro, { fps: 60 }))).toContain('gif')
  })
})
