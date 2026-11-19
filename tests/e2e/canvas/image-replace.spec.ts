import { toUint8Array } from 'js-base64'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { openDesignPanel } from '#tests/helpers/properties'

const editor = useEditorSetupWithClear('/?test')

/** 8×8 images, the two ends of a replace: only their bytes differ. */
const RED_PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEklEQVQImWP4z8CAFWEXHbQSACj/P8FTKqelAAAAAElFTkSuQmCC'
)
const BLUE_PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEElEQVQImWNgYPiPAw0pCQCpcD/B+Cvn4QAAAABJRU5ErkJggg=='
)

const CROP = { m00: 0.5, m01: 0, m02: 0.25, m10: 0, m11: 0.5, m12: 0.25 }

/** Two layers filled with the same image, the crop and scale mode a replace must keep. */
async function twoImageLayers() {
  return editor.page.evaluate(
    ({ crop, bytes }) => {
      const store = window.pairdraw?.getStore?.()
      if (!store) throw new Error('Pairdraw store not initialized')
      const hash = store.storeImage(Uint8Array.from(bytes))
      const ids: string[] = []
      for (const x of [0, 160]) {
        const id = store.createShape('RECTANGLE', x, 0, 120, 120)
        store.updateNode(id, {
          name: `Image ${x}`,
          fills: [
            {
              type: 'IMAGE',
              imageHash: hash,
              imageScaleMode: 'CROP',
              imageTransform: crop,
              color: { r: 0, g: 0, b: 0, a: 1 },
              visible: true,
              opacity: 1,
              blendMode: 'NORMAL'
            }
          ]
        })
        ids.push(id)
      }
      store.select(ids)
      store.requestRender()
      return { ids, hash }
    },
    { crop: CROP, bytes: Array.from(RED_PNG) }
  )
}

const fills = () =>
  editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const ids = [...store.state.selectedIds]
    return ids.map((id) => {
      const fill = store.graph.getNode(id)?.fills.find((f) => f.type === 'IMAGE')
      return {
        id,
        hash: fill?.imageHash ?? null,
        mode: fill?.imageScaleMode ?? null,
        transform: fill?.imageTransform ?? null
      }
    })
  })

test('Replace swaps the bytes of every selected image fill in one undo step', async () => {
  const { ids, hash } = await twoImageLayers()
  await openDesignPanel(editor.page)
  await expect(editor.page.getByTestId('fill-picker-swatch').first()).toBeVisible()
  await editor.page.getByTestId('fill-picker-swatch').first().click()

  const choose = editor.page.getByTestId('fill-picker-choose-image').first()
  await expect(choose).toBeVisible()
  const [chooser] = await Promise.all([editor.page.waitForEvent('filechooser'), choose.click()])
  await chooser.setFiles({
    name: 'blue.png',
    mimeType: 'image/png',
    buffer: Buffer.from(BLUE_PNG)
  })
  await expect.poll(async () => (await fills()).map((f) => f.hash)).not.toEqual([hash, hash])

  const replaced = await fills()
  expect(replaced.map((f) => f.id)).toEqual(ids)
  expect(replaced.every((f) => f.hash && f.hash !== hash)).toBe(true)
  expect(replaced.every((f) => f.mode === 'CROP')).toBe(true)
  expect(replaced.every((f) => f.transform?.m00 === CROP.m00)).toBe(true)

  await editor.canvas.undo()
  await expect.poll(async () => (await fills()).map((f) => f.hash)).toEqual([hash, hash])

  await editor.page.keyboard.press('ControlOrMeta+Shift+z')
  await expect
    .poll(async () => (await fills()).map((f) => f.hash))
    .toEqual(replaced.map((f) => f.hash))
})
