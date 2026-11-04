import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

test('enables the built-in Pairdraw Basics library, inserts Button, and keeps both after reopening', async ({
  page
}) => {
  test.setTimeout(60_000)
  const canvas = new CanvasHelper(page)
  await page.goto('/?test')
  await canvas.waitForInit()
  await page.getByTestId('left-panel-assets-tab').click()
  await page.getByRole('button', { name: 'Manage libraries' }).click()

  const dialog = page.getByTestId('asset-libraries-dialog')
  const basics = dialog.locator('[data-library-id="pairdraw-basics"]')
  await expect(basics.getByTestId('builtin-library-badge')).toHaveText('Built-in')
  await basics.getByRole('button', { name: 'Enable library' }).click()
  await expect(basics.getByRole('button', { name: 'Disable library' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  await page.getByTestId('asset-item').filter({ hasText: 'Button' }).click()
  await page.getByTestId('asset-details-insert').click()
  await expect(page.getByTestId('asset-details-insert')).toBeHidden()

  await expect
    .poll(() =>
      page.evaluate(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) return []
        return [...store.graph.getAllNodes()]
          .filter((node) => node.type === 'INSTANCE')
          .map((node) => {
            const component = node.componentId ? store.graph.getNode(node.componentId) : undefined
            return {
              type: node.type,
              componentName: component?.name ?? null,
              componentType: component?.type ?? null
            }
          })
      })
    )
    .toEqual([{ type: 'INSTANCE', componentName: 'Button', componentType: 'COMPONENT' }])

  const saved = await page.evaluate(async () => {
    const writes: Uint8Array[] = []
    window.showSaveFilePicker = async () =>
      ({
        name: 'basics.fig',
        getFile: async () => new File([], 'basics.fig'),
        createWritable: async (): Promise<
          Pick<FileSystemWritableFileStream, 'write' | 'close'>
        > => ({
          write: async (data: FileSystemWriteChunkType) => {
            if (!(data instanceof Uint8Array)) throw new Error('Unexpected write chunk')
            writes.push(data)
          },
          close: async () => undefined
        })
      }) as FileSystemFileHandle
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    await store.saveFigFileAs()
    return Array.from(writes[0] ?? [])
  })
  expect(saved.length).toBeGreaterThan(0)

  await page.evaluate(async (bytes) => {
    const file = new File([new Uint8Array(bytes)], 'basics.fig')
    window.showOpenFilePicker = async () => [{ getFile: async () => file } as FileSystemFileHandle]
  }, saved)
  await page.keyboard.press('ControlOrMeta+KeyO')

  await expect
    .poll(() =>
      page.evaluate(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) return null
        const instances = [...store.graph.getAllNodes()]
          .filter((node) => node.type === 'INSTANCE')
          .map((node) => {
            const component = node.componentId ? store.graph.getNode(node.componentId) : undefined
            return {
              type: node.type,
              componentName: component?.name ?? null,
              componentType: component?.type ?? null
            }
          })
        return {
          instances,
          enabled: store.graph.enabledLibraries.get('pairdraw-basics')?.enabled === true
        }
      })
    )
    .toEqual({
      instances: [{ type: 'INSTANCE', componentName: 'Button', componentType: 'COMPONENT' }],
      enabled: true
    })
})
