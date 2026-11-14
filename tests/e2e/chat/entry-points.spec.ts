import type { Page } from '@playwright/test'

import { expectDefined } from '#tests/helpers/assert'
import { CanvasHelper } from '#tests/helpers/canvas'
import { stickyDriver } from '#tests/helpers/canvas/sticky-driver'
import { expect, openChatEditor, test } from '#tests/helpers/chat/fixture'
import { toolbarToolTestId } from '#tests/helpers/test-ids'

async function rightClickCanvas(page: Page, x: number, y: number) {
  const box = expectDefined(await new CanvasHelper(page).canvas.boundingBox(), 'canvas bounds')
  await page.mouse.click(box.x + x, box.y + y, { button: 'right' })
}

test.describe('Run sticky as prompt', () => {
  test("sends the note's text, with a reference to the note, into the chat", async ({
    page,
    configuredChat: chat
  }) => {
    await chat.closeChat()
    const sticky = stickyDriver(() => page)
    await sticky.showOrigin()
    await sticky.add([{ x: 300, y: 300, text: 'A hero section for a bakery' }])
    const point = sticky.point(300, 300)

    await rightClickCanvas(page, point.x, point.y)
    await page.getByTestId('context-run-sticky-prompt').click()

    await expect(chat.chatColumn).toBeVisible()
    await expect(chat.userMessage()).toContainText('A hero section for a bakery')
    await expect(chat.userMessage()).toContainText('From the sticky note')
    await expect(chat.assistantMessage()).not.toBeEmpty()
  })

  test('is offered only for sticky notes', async ({ page, configuredChat: chat }) => {
    await chat.closeChat()
    const canvas = new CanvasHelper(page)
    await canvas.drawRect(200, 200, 120, 80)
    await rightClickCanvas(page, 250, 230)
    await expect(page.getByTestId('context-copy')).toBeVisible()
    await expect(page.getByTestId('context-run-sticky-prompt')).toHaveCount(0)
    await page.keyboard.press('Escape')
  })
})

test.describe('Apply with AI', () => {
  const list = (page: Page) => page.locator('[data-slot="comments-panel"]')
  const items = (page: Page) => list(page).locator('[data-slot="comment-list-item"]')

  async function placeComment(page: Page, x: number, y: number, text: string) {
    const tool = page.getByTestId(toolbarToolTestId('COMMENT'))
    if ((await tool.getAttribute('aria-pressed')) !== 'true') await tool.click()
    const box = expectDefined(await new CanvasHelper(page).canvas.boundingBox(), 'canvas bounds')
    await page.mouse.click(box.x + x, box.y + y)
    const composer = page.getByRole('textbox', { name: 'Add a comment' })
    await expect(composer).toBeFocused()
    await composer.fill(text)
    await composer.press('Enter')
    // Closes the thread, and leaves the comments list showing.
    await page.keyboard.press('Escape')
  }

  test('a thread goes to the chat with its messages, asking to apply, reply and resolve', async ({
    page,
    configuredChat: chat
  }) => {
    await chat.closeChat()
    await new CanvasHelper(page).drawRect(100, 100, 200, 150)
    await placeComment(page, 150, 150, 'Make the title bigger')
    await expect(items(page)).toHaveCount(1)

    await items(page).first().click({ button: 'right' })
    await page.getByRole('menu').locator('[data-command="comment-apply-with-ai"]').click()

    await expect(chat.chatColumn).toBeVisible()
    await expect(chat.userMessage()).toContainText('Apply the feedback in this comment thread')
    await expect(chat.userMessage()).toContainText('Make the title bigger')
    await expect(chat.assistantMessage()).not.toBeEmpty()
  })

  test('the comments list sends every open thread, and waits when none is open', async ({
    page,
    configuredChat: chat
  }) => {
    await chat.closeChat()
    await placeComment(page, 150, 150, 'Use the brand colour')
    await placeComment(page, 320, 220, 'Tighten the spacing')
    await expect(items(page)).toHaveCount(2)

    const applyAll = list(page).locator('[data-command="comments-apply-open-with-ai"]')
    await applyAll.click()
    await expect(chat.userMessage()).toContainText('Apply the feedback in these comment threads')
    await expect(chat.userMessage()).toContainText('Use the brand colour')
    await expect(chat.userMessage()).toContainText('Tighten the spacing')
    await expect(chat.assistantMessage()).not.toBeEmpty()

    for (let open = 2; open > 0; open--) {
      await items(page).first().hover()
      await items(page).first().locator('[data-command="comment-resolve"]').click()
      await expect(items(page)).toHaveCount(open - 1)
    }
    await expect(applyAll).toBeDisabled()
  })
})

test.describe('What to create', () => {
  test('on Home, choosing a kind marks it and moves to the prompt, and sends nothing yet', async ({
    page
  }) => {
    await openChatEditor(page)
    await page.getByTestId('tabbar-new').click()
    const home = page.getByTestId('recent-files-home')
    const prompt = home.getByRole('textbox', { name: 'Describe a design' })
    const kinds = home.getByRole('list', { name: 'What to create' })
    const mobile = kinds.getByRole('button', { name: 'Mobile app' })

    await expect(kinds.getByRole('button', { name: 'Landing page' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await mobile.click()
    await expect(mobile).toHaveAttribute('aria-pressed', 'true')
    await expect(kinds.getByRole('button', { name: 'Landing page' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    await expect(prompt).toBeFocused()
    // Nothing went: Home stays, with no new design and no AI setup.
    await expect(home).toBeVisible()
    await expect(page.getByTestId('ai-setup-dialog')).toHaveCount(0)
    await expect(page.getByTestId('tabbar-tab')).toHaveCount(2)
  })

  test('Home offers its places as tabs and its ways to start from something that exists', async ({
    page
  }) => {
    await openChatEditor(page)
    await page.getByTestId('tabbar-new').click()
    const home = page.getByTestId('recent-files-home')
    await expect(home.getByTestId('home-import-figma')).toBeVisible()
    await expect(home.getByTestId('home-recreate-screenshot')).toBeVisible()

    const drafts = home.getByTestId('home-tab-drafts')
    await expect(home.getByTestId('home-tab-recent')).toHaveAttribute('aria-current', 'page')
    await drafts.click()
    await expect(drafts).toHaveAttribute('aria-current', 'page')
    await expect(home.getByTestId('home-tab-recent')).not.toHaveAttribute('aria-current', 'page')
    await home.getByTestId('home-tab-recent').click()
  })
})
