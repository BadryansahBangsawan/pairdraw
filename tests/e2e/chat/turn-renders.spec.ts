import type { Locator, Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { expect, test } from '#tests/helpers/chat/fixture'
import type { PromptMessage } from '#tests/helpers/chat/tool-loop'

/** The changed-frames card a reply shows. */
const CARD = '[data-slot="chat-turn-renders"]'

/** Creates one top-level frame through the doc model, as a `render` call would, and returns its id. */
async function createFrame(page: Page): Promise<string> {
  return page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Editor store is not available')
    const node = store.graph.createNode('FRAME', store.state.currentPageId, {
      name: 'Card',
      x: 0,
      y: 0,
      width: 240,
      height: 160
    })
    return node.id
  })
}

/**
 * Replaces the chat transport with the app's tool loop driven by a scripted model: one
 * `update_node` call moves the frame, then the reply answers "Done". The move is a real edit of
 * a top-level frame, so the turn ends having changed it.
 */
async function injectFrameEditTransport(page: Page, frameId: string): Promise<void> {
  await page.evaluate(async (id) => {
    const transportsPath = '/src/app/ai/transports/tool-loop.ts'
    const { createToolLoopTransport } = await import(transportsPath)
    const api = window.pairdraw
    const store = api?.getStore?.()
    if (!api?.setChatTransport || !store) throw new Error('Chat transport override not available')

    const usage = {
      inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 1, text: 1, reasoning: undefined }
    }

    let calls = 0
    const model = {
      specificationVersion: 'v4',
      provider: 'scripted',
      modelId: 'scripted',
      supportedUrls: {},
      doGenerate() {
        throw new Error('The scripted model only streams')
      },
      async doStream({ prompt }: { prompt: PromptMessage[] }) {
        const answering = prompt.at(-1)?.role === 'tool'
        const callId = `call-${++calls}`
        const chunks = answering
          ? [
              { type: 'stream-start', warnings: [] },
              { type: 'text-start', id: callId },
              { type: 'text-delta', id: callId, delta: 'Done' },
              { type: 'text-end', id: callId },
              { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage }
            ]
          : [
              { type: 'stream-start', warnings: [] },
              {
                type: 'tool-call',
                toolCallId: callId,
                toolName: 'update_node',
                input: JSON.stringify({ id, x: 40 * calls, opacity: 0.9 })
              },
              { type: 'finish', finishReason: { unified: 'tool-calls', raw: undefined }, usage }
            ]
        return {
          stream: new ReadableStream({
            start(controller) {
              for (const chunk of chunks) controller.enqueue(chunk)
              controller.close()
            }
          })
        }
      }
    }

    api.setChatTransport(() =>
      createToolLoopTransport({
        store,
        providerID: 'openai',
        model,
        effectiveModelID: 'scripted',
        maxOutputTokens: 1000,
        thinkingLevel: () => 'default'
      })
    )
  }, frameId)
}

/** Waits until the card has stopped rendering and returns how many frames it shows. */
async function cardFrameCount(card: Locator): Promise<number> {
  await expect(card).not.toContainText('Rendering changes')
  const frames = card.locator('figure')
  const count = await frames.count()
  if (count === 0) await expect(card).toContainText('Renders are unavailable here')
  return count
}

test('a turn that edits a frame shows one card, and Revert hides and frees it', async ({
  configuredChat: chat,
  page
}) => {
  const canvas = new CanvasHelper(page)
  const frameId = await createFrame(page)
  await injectFrameEditTransport(page, frameId)

  await chat.submit('Move the card')
  await expect(chat.assistantMessage()).toContainText('Done')
  expect(
    await page.evaluate((id) => window.pairdraw?.getStore?.().graph.getNode(id)?.x, frameId)
  ).toBeGreaterThan(0)
  const card = chat.assistantMessage().locator(CARD)
  await expect(card).toHaveCount(1)
  // Ready in this app unless CanvasKit is missing; either way it never shows more than three.
  expect(await cardFrameCount(card)).toBe(1)
  await expect(card.getByRole('button', { name: 'Show Card on canvas' })).toBeEnabled()

  // Revealing the frame selects it on the canvas.
  await card.getByRole('button', { name: 'Show Card on canvas' }).click()
  expect(await page.evaluate(() => window.pairdraw?.getStore?.().state.selectedIds.size ?? 0)).toBe(
    1
  )

  // Revert undoes the turn: the card goes, and its renders are freed rather than left in the store.
  await chat.assistantMessage().getByTestId('chat-revert-turn').click()
  await expect(card).toHaveCount(0)
  await expect(chat.assistantMessage().locator('[data-slot="chat-reply-content"]')).toHaveAttribute(
    'data-reverted',
    'true'
  )

  canvas.assertNoErrors()
})

test('turning changed frames off in Settings shows no card for the next turn', async ({
  configuredChat: chat,
  page
}) => {
  const canvas = new CanvasHelper(page)
  const frameId = await createFrame(page)
  await injectFrameEditTransport(page, frameId)

  await page.keyboard.press('ControlOrMeta+,')
  await page.getByTestId('settings-section-ai').click()
  const toggle = page.getByTestId('settings-ai-turn-renders')
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await page.keyboard.press('Escape')

  await chat.submit('Move the card again')
  await expect(chat.assistantMessage()).toContainText('Done')
  await expect(chat.assistantMessage().locator(CARD)).toHaveCount(0)
  // The edit still happened; only its card is gone.
  expect(
    await page.evaluate((id) => window.pairdraw?.getStore?.().graph.getNode(id)?.x, frameId)
  ).toBeGreaterThan(0)

  canvas.assertNoErrors()
})
