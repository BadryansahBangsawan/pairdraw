import { expect, test } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'
import { readScenePixels } from '#tests/helpers/canvas/pixels'

for (const colorSpace of ['srgb', 'display-p3'] as const) {
  test(`sRGB bitmap colors survive a ${colorSpace} document on an sRGB display`, async ({
    page
  }) => {
    await page.goto('/?test&no-chrome&no-rulers')
    const canvas = new CanvasHelper(page)
    await canvas.waitForInit()
    await canvas.clearCanvas()
    test.skip(
      await page.evaluate(() => matchMedia('(color-gamut: p3)').matches),
      'Requires an sRGB display'
    )
    const samples = [
      [248, 130, 29],
      [17, 181, 143],
      [65, 117, 235]
    ]
    await page.evaluate(
      async ({ colorSpace, samples }) => {
        const store = window.pairdraw?.getStore?.()
        if (!store) throw new Error('Editor unavailable')
        store.setDocumentColorSpace(colorSpace)
        const source = document.createElement('canvas')
        source.width = 96
        source.height = 32
        const context = source.getContext('2d', { colorSpace: 'srgb' })
        if (!context) throw new Error('sRGB canvas unavailable')
        const data = context.createImageData(source.width, source.height)
        for (let pixel = 0; pixel < source.width * source.height; pixel++) {
          const rgb = samples[Math.floor((pixel % source.width) / 32)]
          data.data.set([...rgb, 255], pixel * 4)
        }
        context.putImageData(data, 0, 0)
        const blob = await new Promise<Blob>((resolve, reject) => {
          source.toBlob((value) => {
            if (value) resolve(value)
            else reject(new Error('Cannot encode bitmap'))
          })
        })
        const imageHash = store.storeImage(new Uint8Array(await blob.arrayBuffer()))
        store.graph.createNode('RECTANGLE', store.state.currentPageId, {
          x: 40,
          y: 40,
          width: 96,
          height: 32,
          fills: [
            {
              type: 'IMAGE',
              imageHash,
              imageScaleMode: 'FIT',
              color: { r: 0, g: 0, b: 0, a: 1 },
              opacity: 1,
              visible: true
            }
          ]
        })
        store.requestRender()
      },
      { colorSpace, samples }
    )
    await canvas.waitForRender()
    const expected = samples.map((rgb) => [...rgb, 255])
    // The canvas moves when the document-space banner appears and the view pans to keep the drawing
    // still, so the sampled canvas pixels carry the view's pan and zoom, as in play's overlapPoint.
    const points = await page.evaluate(
      ({ count }) => {
        const store = window.pairdraw?.getStore?.()
        if (!store) throw new Error('Editor unavailable')
        const { panX, panY, zoom } = store.state
        return Array.from({ length: count }, (_, index) => ({
          x: (56 + index * 32) * zoom + panX,
          y: 56 * zoom + panY
        }))
      },
      { count: samples.length }
    )
    const pixels = await readScenePixels(page, points)
    const deltas = pixels.map((pixel, stripe) =>
      pixel.map((value, channel) => value - (expected[stripe]?.[channel] ?? 0))
    )
    // A display-p3 document reaches the sRGB canvas through the colour-managed presentation, which
    // can round a channel by one; the sample is here to catch a bitmap that never draws at all.
    const tolerance = colorSpace === 'display-p3' ? 1 : 0
    expect({
      within: deltas.every((row) => row.every((delta) => Math.abs(delta) <= tolerance)),
      deltas
    }).toMatchObject({ within: true })
    canvas.assertNoErrors()
  })
}
