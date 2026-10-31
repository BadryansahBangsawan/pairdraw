import { expect, test, type Page } from '@playwright/test'

import { expectDefined } from '#tests/helpers/assert'
import { CanvasHelper } from '#tests/helpers/canvas'
import { ChatHarness } from '#tests/helpers/chat/harness'

async function openEditor(page: Page) {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  return new ChatHarness(page)
}

async function bounds(page: Page, testId: string) {
  return expectDefined(await page.getByTestId(testId).boundingBox(), `${testId} bounds`)
}

test('the chat column opens beside the Design panel and the canvas makes room', async ({
  page
}) => {
  const chat = await openEditor(page)
  const before = await bounds(page, 'properties-panel')
  const canvasBefore = await bounds(page, 'canvas-area')

  await chat.openChat()
  await expect(chat.chatToggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('properties-tab-design')).toHaveAttribute('data-state', 'active')

  const properties = await bounds(page, 'properties-panel')
  const column = await bounds(page, 'chat-column')
  // Both are in view, the chat to the right of the design, and the properties keep their width.
  expect(column.x).toBeGreaterThanOrEqual(properties.x + properties.width - 1)
  expect(Math.abs(properties.width - before.width)).toBeLessThanOrEqual(1)
  const canvas = await bounds(page, 'canvas-area')
  expect(canvas.width).toBeLessThan(canvasBefore.width - column.width / 2)

  await chat.closeChat()
  expect(
    Math.abs((await bounds(page, 'properties-panel')).width - before.width)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs((await bounds(page, 'canvas-area')).width - canvasBefore.width)
  ).toBeLessThanOrEqual(1)
})

test('the chat column keeps its width and open state across a reload', async ({ page }) => {
  const chat = await openEditor(page)
  await chat.openChat()
  const opened = (await bounds(page, 'chat-column')).width

  const handle = await bounds(page, 'chat-splitter-handle')
  const x = handle.x + handle.width / 2
  const y = handle.y + handle.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 80, y, { steps: 10 })
  await page.mouse.up()
  const resized = (await bounds(page, 'chat-column')).width
  expect(resized).toBeGreaterThan(opened + 40)

  await page.reload()
  await new CanvasHelper(page).waitForInit()
  await expect(chat.chatColumn).toBeVisible()
  expect(Math.abs((await bounds(page, 'chat-column')).width - resized)).toBeLessThanOrEqual(1)

  // Closing and reopening, or hiding and showing the panels, keeps the width too.
  await chat.closeChat()
  await chat.openChat()
  expect(Math.abs((await bounds(page, 'chat-column')).width - resized)).toBeLessThanOrEqual(1)
  await page.keyboard.press('ControlOrMeta+Backslash')
  await page.keyboard.press('ControlOrMeta+Backslash')
  await expect(chat.chatColumn).toBeVisible()
  expect(Math.abs((await bounds(page, 'chat-column')).width - resized)).toBeLessThanOrEqual(1)
})

test('a closed chat column stays closed after a reload', async ({ page }) => {
  const chat = await openEditor(page)
  await chat.openChat()
  await chat.closeChat()
  await page.reload()
  await new CanvasHelper(page).waitForInit()
  await expect(chat.chatToggle).toHaveAttribute('aria-pressed', 'false')
  await expect(chat.chatColumn).toBeHidden()
})
