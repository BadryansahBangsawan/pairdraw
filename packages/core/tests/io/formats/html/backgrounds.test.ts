import { describe, expect, test } from 'bun:test'

import { readHTMLDocument } from '#core/io/formats/html/import'

// A 1×1 PNG: the placement tests only need a picture with a known natural size.
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

// A second 1×1 PNG, so two layers cannot share an image hash.
const PNG2 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

async function read(html: string) {
  const { graph } = await readHTMLDocument(html)
  return { graph, boxes: graph.getChildren(graph.getPages()[0].id) }
}

describe('background pictures in imported HTML', () => {
  test('crops a picture that covers its box over the color', async () => {
    const { boxes } = await read(`<style>body{margin:0}div{width:200px;height:100px}
      .cover { background: url(${PNG}) center / cover, #2563eb }</style>
      <div class="cover"></div>`)
    const cover = boxes[0]

    expect(cover?.fills.map((fill) => fill.type)).toEqual(['SOLID', 'IMAGE'])
    expect(cover?.fills[1]).toMatchObject({ imageScaleMode: 'CROP' })
  })

  test('tiles a repeated picture at its own size', async () => {
    const { boxes } = await read(`<style>body{margin:0}div{width:200px;height:100px}
      .tile { background-image: url(${PNG}); background-repeat: repeat }</style>
      <div class="tile"></div>`)
    const tile = boxes[0]

    expect(tile?.fills).toEqual([expect.objectContaining({ type: 'IMAGE', imageScaleMode: 'TILE' })])
  })

  test('puts a picture covering part of its box in a layer at the area it shows', async () => {
    const { graph, boxes } = await read(`<style>body{margin:0}
      .icon { width: 50px; height: 50px; background: url(${PNG}) center / 50% auto no-repeat }
      .hero { width: 400px; height: 100px; background: url(${PNG}) 100% 50% / auto 100% no-repeat }</style>
      <div class="icon"></div><div class="hero"></div>`)
    const [icon, hero] = boxes
    const [iconPicture] = graph.getChildren(icon?.id ?? '')
    const [heroPicture] = graph.getChildren(hero?.id ?? '')

    expect(iconPicture).toMatchObject({ name: 'background image', width: 25, x: 12.5 })
    expect(heroPicture).toMatchObject({ name: 'background image', width: 100 })
    expect(heroPicture?.x).toBeCloseTo(300)
  })

  test('positions a picture in the box background-origin names', async () => {
    const { graph, boxes } = await read(`<style>body{margin:0}
      div { box-sizing: border-box; width: 100px; height: 100px; border: 10px solid #000; padding: 10px }
      .padding { background: url(${PNG}) 0 0 / 20px 20px no-repeat }
      .content { background: url(${PNG}) 0 0 / 20px 20px no-repeat content-box }</style>
      <div class="padding"></div><div class="content"></div>`)
    const [padding, content] = boxes

    expect(graph.getChildren(padding?.id ?? '')[0]).toMatchObject({ x: 10, y: 10, width: 20 })
    expect(graph.getChildren(content?.id ?? '')[0]).toMatchObject({ x: 20, y: 20, width: 20 })
  })
})

describe('background layers paint in CSS order', () => {
  test('keeps the last background layer at the bottom', async () => {
    const { graph, boxes } = await read(`<style>body{margin:0}
      div { width: 200px; height: 100px;
        background-image: url(${PNG}), url(${PNG2});
        background-size: 10px 10px, 20px 20px;
        background-position: 0 0, 0 0;
        background-repeat: no-repeat, no-repeat }</style><div></div>`)
    const [box] = boxes
    const layers = graph.getChildren(box?.id ?? '')

    // The 20px picture is the last layer, so it paints first, under the 10px one.
    expect(layers.map((layer) => layer.width)).toEqual([20, 10])
  })

  test('keeps the layer order the shorthand names', async () => {
    const { graph, boxes } = await read(`<style>body{margin:0}
      div { width: 200px; height: 100px;
        background: url(${PNG}) 0 0 / 10px 10px no-repeat, url(${PNG2}) 0 0 / 20px 20px no-repeat }
      </style><div></div>`)
    const [box] = boxes

    expect(graph.getChildren(box?.id ?? '').map((layer) => layer.width)).toEqual([20, 10])
  })

  test('paints a gradient above a picture it lists above', async () => {
    const { graph, boxes } = await read(`<style>body{margin:0}
      div { width: 200px; height: 100px;
        background-image: linear-gradient(#f00, #f00), url(${PNG2});
        background-size: auto, 20px 20px;
        background-position: 0 0, 0 0;
        background-repeat: repeat, no-repeat }</style><div></div>`)
    const [box] = boxes
    const layers = graph.getChildren(box?.id ?? '')

    expect(layers.map((layer) => layer.name)).toEqual(['background image', 'background'])
    expect(layers[1]?.fills.map((fill) => fill.type)).toEqual(['GRADIENT_LINEAR'])
    expect(box?.fills).toEqual([])
  })

  test('leaves layers that cover the box as fills, in their order', async () => {
    const { graph, boxes } = await read(`<style>body{margin:0}
      div { width: 200px; height: 100px;
        background-image: linear-gradient(#f00, #f00), url(${PNG});
        background-size: auto, cover;
        background-repeat: repeat, no-repeat }</style><div></div>`)
    const [box] = boxes

    expect(box?.fills.map((fill) => fill.type)).toEqual(['IMAGE', 'GRADIENT_LINEAR'])
    expect(graph.getChildren(box?.id ?? '')).toHaveLength(0)
  })
})
