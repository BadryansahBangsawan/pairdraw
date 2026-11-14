import type { Page } from '@playwright/test'

import { expect, test } from '#tests/helpers/chat/fixture'

const PILOT = 'tests/fixtures/vectorize/pilot_avatar.png'
const PYTHON = 'tests/fixtures/vectorize/python_logo.png'

test('the selection button mentions the selected layers, which history shows', async ({
  configuredChat: chat
}) => {
  const nodeId = await chat.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Store not available')
    const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
      name: 'Pinned hero'
    })
    store.select([node.id])
    return node.id
  })
  await chat.input.click()
  await chat.page.keyboard.type('Make ')
  await chat.page.getByRole('button', { name: 'Mention the selected layers' }).click()
  await expect(chat.input.locator('[data-slot="chat-reference"]')).toHaveText('Pinned hero')
  await chat.page.keyboard.type('larger')
  await chat.page.keyboard.press('Enter')

  await expect(chat.userMessage().locator('[data-slot="chat-reference"]')).toHaveText('Pinned hero')
  await expect(
    chat.userMessage().getByRole('button', { name: /View attachment Pinned hero/ })
  ).toBeVisible()
  await expect
    .poll(() => chat.page.locator('html').getAttribute('data-last-chat-request'))
    .toContain(encodeURIComponent(nodeId))
})

test('image drafts can be attached and removed', async ({ configuredChat: chat }) => {
  const chooser = chat.page.waitForEvent('filechooser')
  await chat.page.getByRole('button', { name: 'Attach images' }).click()
  await (await chooser).setFiles([PILOT, PYTHON])

  await expect(chat.page.getByText('pilot_avatar.png', { exact: true })).toBeVisible()
  await expect(chat.page.getByText('python_logo.png', { exact: true })).toBeVisible()
  await chat.page.getByRole('button', { name: 'Remove image pilot_avatar.png' }).click()
  await expect(chat.page.getByText('pilot_avatar.png', { exact: true })).toBeHidden()
  await chat.page.getByRole('button', { name: 'Remove image python_logo.png' }).click()
})

test('sent images and text appear immediately in history', async ({ configuredChat: chat }) => {
  await chat.input.fill('Use these images for the new layout')
  const chooser = chat.page.waitForEvent('filechooser')
  await chat.page.getByRole('button', { name: 'Attach images' }).click()
  await (await chooser).setFiles([PILOT, PYTHON])
  await chat.sendButton.click()

  await expect(chat.userMessage()).toContainText('Use these images for the new layout')
  await expect(
    chat.userMessage().getByRole('button', { name: 'View attachment pilot_avatar.png' })
  ).toBeVisible()
  await expect(
    chat.userMessage().getByRole('button', { name: 'View attachment python_logo.png' })
  ).toBeVisible()
})

test('a mentioned layer sends with an image', async ({ configuredChat: chat }) => {
  await chat.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Store not available')
    const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, { name: 'Card' })
    store.select([node.id])
  })
  await chat.input.fill('Use this reference ')
  await chat.page.getByRole('button', { name: 'Mention the selected layers' }).click()
  const chooser = chat.page.waitForEvent('filechooser')
  await chat.page.getByRole('button', { name: 'Attach images' }).click()
  await (await chooser).setFiles(PILOT)
  await chat.sendButton.click()

  await expect(chat.userMessage()).toContainText('Use this reference')
  await expect(chat.userMessage()).not.toContainText('[Referenced nodes')
})

type DroppedFile = { name: string; type: string; content: 'svg' | 'png' | 'text' }

/**
 * Drags files onto the chat transcript; `drop: false` stops at the drag, so what it shows over
 * the composer can be checked. Returns whether the page took the drag.
 */
async function dragOntoChat(
  page: Page,
  files: DroppedFile[],
  { drop = true }: { drop?: boolean } = {}
) {
  return page.getByTestId('chat-panel').evaluate(
    async (panel, { files, drop }) => {
      async function png(): Promise<Blob> {
        const canvas = new OffscreenCanvas(8, 8)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas context unavailable')
        context.fillStyle = '#08f'
        context.fillRect(0, 0, 8, 8)
        return canvas.convertToBlob({ type: 'image/png' })
      }
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="12"><rect width="24" height="12" fill="#f00"/></svg>'
      const bodies = { svg: async () => svg, png, text: async () => 'notes' }
      const transfer = new DataTransfer()
      for (const file of files) {
        const body = await bodies[file.content]()
        transfer.items.add(new File([body], file.name, { type: file.type }))
      }
      const bounds = panel.getBoundingClientRect()
      const options = {
        bubbles: true,
        cancelable: true,
        clientX: bounds.left + bounds.width / 2,
        clientY: bounds.top + 40,
        dataTransfer: transfer
      }
      panel.dispatchEvent(new DragEvent('dragenter', options))
      const accepted = !panel.dispatchEvent(new DragEvent('dragover', options))
      if (drop) panel.dispatchEvent(new DragEvent('drop', options))
      return accepted
    },
    { files, drop }
  )
}

test('images dropped anywhere on the chat attach, with SVGs drawn as PNGs', async ({
  configuredChat: chat
}) => {
  const files: DroppedFile[] = [
    { name: 'photo.png', type: 'image/png', content: 'png' },
    { name: 'icon.svg', type: 'image/svg+xml', content: 'svg' }
  ]
  expect(await dragOntoChat(chat.page, files, { drop: false })).toBe(true)
  const overlay = chat.page.locator('[data-slot="drop-overlay"]')
  await expect(overlay).toContainText('Drop images to attach')

  await dragOntoChat(chat.page, files)
  await expect(overlay).toBeHidden()
  await expect(chat.page.getByText('photo.png', { exact: true })).toBeVisible()
  await expect(chat.page.getByText('icon.png', { exact: true })).toBeVisible()
})

test('a drag of design files is left to the window', async ({ configuredChat: chat }) => {
  // The window still takes it, to open documents, but the chat does not offer to attach it.
  const design: DroppedFile[] = [{ name: 'design.fig', type: '', content: 'text' }]
  await dragOntoChat(chat.page, design, { drop: false })
  await expect(chat.page.locator('[data-slot="drop-overlay"]')).toBeHidden()
})

test('text files dropped on the chat attach beside images', async ({ configuredChat: chat }) => {
  const files: DroppedFile[] = [
    { name: 'notes.md', type: 'text/markdown', content: 'text' },
    { name: 'photo.png', type: 'image/png', content: 'png' }
  ]
  expect(await dragOntoChat(chat.page, files, { drop: false })).toBe(true)
  const overlay = chat.page.locator('[data-slot="drop-overlay"]')
  await expect(overlay).toBeVisible()

  await dragOntoChat(chat.page, files)
  await expect(overlay).toBeHidden()
  await expect(chat.page.getByRole('button', { name: 'Remove file notes.md' })).toBeVisible()
  await expect(chat.page.getByText('photo.png', { exact: true })).toBeVisible()
})

test('code files the system reports no type for still attach when dropped', async ({
  configuredChat: chat
}) => {
  // macOS browsers report `.tsx` with no type and `.ts` as video; the drop judges them by name.
  const files: DroppedFile[] = [
    { name: 'Button.tsx', type: '', content: 'text' },
    { name: 'tokens.ts', type: 'video/mp2t', content: 'text' }
  ]
  await dragOntoChat(chat.page, files, { drop: false })
  const overlay = chat.page.locator('[data-slot="drop-overlay"]')
  await expect(overlay).toBeHidden()

  await dragOntoChat(chat.page, files)
  await expect(chat.page.getByRole('button', { name: 'Remove file Button.tsx' })).toBeVisible()
  await expect(chat.page.getByRole('button', { name: 'Remove file tokens.ts' })).toBeVisible()
  // Taken whole by the chat, the drop does not also reach the window's document opener.
  await expect(chat.page.getByText(/Unsupported document format/)).toHaveCount(0)
})

test('Markdown, CSS, and code files go to the model and show in history', async ({
  configuredChat: chat
}) => {
  const css = ':root { --brand: #ff5b2e; }'
  await chat.input.fill('Use these tokens')
  const chooser = chat.page.waitForEvent('filechooser')
  await chat.page.getByRole('button', { name: 'Attach images or files' }).click()
  await (
    await chooser
  ).setFiles([
    { name: 'tokens.css', mimeType: 'text/css', buffer: Buffer.from(css) },
    { name: 'Card.tsx', mimeType: '', buffer: Buffer.from('export const Card = () => null') }
  ])
  await expect(chat.page.getByRole('button', { name: 'Remove file tokens.css' })).toBeVisible()
  await expect(chat.page.getByRole('button', { name: 'Remove file Card.tsx' })).toBeVisible()
  await chat.sendButton.click()

  // The transcript shows the text as written, with the files as attachments.
  await expect(chat.userMessage()).toContainText('Use these tokens')
  await expect(chat.userMessage()).not.toContainText(css)
  const tokens = chat.userMessage().getByRole('button', { name: 'View attachment tokens.css' })
  await expect(tokens).toBeVisible()
  await expect
    .poll(() => chat.page.locator('html').getAttribute('data-last-chat-request'))
    .toContain(css)

  await tokens.click()
  await expect(chat.page.getByRole('dialog')).toContainText(css)
})

test('an edited message is sent again with its files', async ({ configuredChat: chat }) => {
  const { page } = chat
  const css = ':root { --brand: #ff5b2e; }'
  await chat.input.fill('Use these tokens')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Attach images or files' }).click()
  await (
    await chooser
  ).setFiles({ name: 'tokens.css', mimeType: 'text/css', buffer: Buffer.from(css) })
  await chat.sendButton.click()
  await expect(chat.assistantMessage()).toBeVisible()

  await chat.userMessage().hover()
  await page.getByRole('button', { name: 'Edit message' }).click()
  const editor = page.getByRole('textbox', { name: 'Edit message' })
  await editor.fill('Use these tokens for the buttons')
  await page.keyboard.press('Enter')

  await expect(chat.userMessage()).toContainText('Use these tokens for the buttons')
  await expect(
    chat.userMessage().getByRole('button', { name: 'View attachment tokens.css' })
  ).toBeVisible()
  await expect
    .poll(() => page.locator('html').getAttribute('data-last-chat-request'))
    .toContain('for the buttons')
  await expect
    .poll(() => page.locator('html').getAttribute('data-last-chat-request'))
    .toContain(css)
})

test('a file that is not text does not attach', async ({ configuredChat: chat }) => {
  const chooser = chat.page.waitForEvent('filechooser')
  await chat.page.getByRole('button', { name: 'Attach images or files' }).click()
  await (
    await chooser
  ).setFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from([0xff, 0xfe, 0x00, 0x80])
  })
  await expect(chat.page.getByRole('listitem').getByText(/notes\.txt/)).toBeVisible()
  await expect(chat.page.getByRole('button', { name: 'Remove file notes.txt' })).toHaveCount(0)
})

test('the drop overlay leaves with the drag even when the leave no longer lists the image', async ({
  configuredChat: chat
}) => {
  // Apps such as Yoink hand their files over late, so WebKit's leave event lists no items.
  const photo: DroppedFile[] = [{ name: 'photo.png', type: 'image/png', content: 'png' }]
  await dragOntoChat(chat.page, photo, { drop: false })
  const overlay = chat.page.locator('[data-slot="drop-overlay"]')
  await expect(overlay).toBeVisible()

  await chat.page.getByTestId('chat-panel').evaluate((panel) => {
    panel.dispatchEvent(
      new DragEvent('dragleave', { bubbles: true, dataTransfer: new DataTransfer() })
    )
  })
  await expect(overlay).toBeHidden()
})

test('a drag that ends without leaving the chat hides the overlay at the next pointer move', async ({
  configuredChat: chat
}) => {
  const photo: DroppedFile[] = [{ name: 'photo.png', type: 'image/png', content: 'png' }]
  await dragOntoChat(chat.page, photo, { drop: false })
  const overlay = chat.page.locator('[data-slot="drop-overlay"]')
  await expect(overlay).toBeVisible()

  await chat.page.mouse.move(10, 10)
  await expect(overlay).toBeHidden()
})

test('a full message shows why more images cannot be dropped', async ({ configuredChat: chat }) => {
  const chooser = chat.page.waitForEvent('filechooser')
  await chat.page.getByRole('button', { name: 'Attach images' }).click()
  await (await chooser).setFiles([PILOT, PYTHON, PILOT, PYTHON])
  await expect(chat.page.getByRole('button', { name: /Remove image/ })).toHaveCount(4)

  const photo: DroppedFile[] = [{ name: 'photo.png', type: 'image/png', content: 'png' }]
  await dragOntoChat(chat.page, photo, { drop: false })
  await expect(chat.page.locator('[data-slot="drop-overlay"]')).toContainText(
    'Up to 4 images per message'
  )
  await dragOntoChat(chat.page, photo)
  await expect(chat.page.locator('[data-slot="drop-overlay"]')).toBeHidden()
  await expect(chat.page.getByRole('button', { name: /Remove image/ })).toHaveCount(4)
  await expect(chat.page.getByText('Up to 4 images per message', { exact: true })).toBeVisible()
})

test('a full message says why more images chosen cannot be attached, as a drop does', async ({
  configuredChat: chat
}) => {
  const chooser = chat.page.waitForEvent('filechooser')
  await chat.page.getByRole('button', { name: 'Attach images' }).click()
  await (await chooser).setFiles([PILOT, PYTHON, PILOT, PYTHON, PILOT])

  await expect(chat.page.getByRole('button', { name: /Remove image/ })).toHaveCount(4)
  await expect(chat.page.getByText('Up to 4 images per message', { exact: true })).toBeVisible()
})
