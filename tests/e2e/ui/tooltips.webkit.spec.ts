import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { routeModelCatalog } from '#tests/helpers/chat/catalog'
import { ChatHarness } from '#tests/helpers/chat/harness'
import { propertyItems, propertySection } from '#tests/helpers/properties'

const editor = useEditorSetup()

test.skip(({ browserName }) => browserName !== 'webkit', 'WebKit tooltip smoke test')

test('tooltips stay hoverable and clickable in WebKit', async () => {
  await editor.canvas.clearCanvas()
  await editor.canvas.drawRect(180, 180, 80, 80)

  const strokeItems = propertyItems(editor.page, 'strokes')
  const strokeCount = await strokeItems.count()
  const strokeAdd = propertySection(editor.page, 'Stroke').getByRole('button', {
    name: 'Add stroke'
  })
  await strokeAdd.hover()
  await expect(
    editor.page.locator('[role=tooltip]').filter({ hasText: 'Add stroke' })
  ).toBeVisible()
  await strokeAdd.click()
  await expect(strokeItems).toHaveCount(strokeCount + 1)

  const effectAdd = propertySection(editor.page, 'Effects').getByRole('button', {
    name: 'Add effect'
  })
  await effectAdd.hover()
  await expect(
    editor.page.locator('[role=tooltip]').filter({ hasText: 'Add effect' })
  ).toBeVisible()
  await effectAdd.click()
  await expect(propertyItems(editor.page, 'effects')).toHaveCount(1)

  // ⌘J opens the chat column, whose provider setup leads to Settings.
  await routeModelCatalog(editor.page)
  const chat = new ChatHarness(editor.page)
  await editor.page.keyboard.press('Meta+J')
  await expect(editor.page.getByTestId('provider-setup')).toBeVisible()
  await chat.configureOpenRouter('sk-or-test-key-12345')
  await expect(editor.page.getByTestId('chat-input')).toBeVisible()

  const settings = editor.page.getByTestId('provider-settings-trigger')
  await settings.hover()
  await expect(
    editor.page.locator('[role=tooltip]').filter({ hasText: 'Provider settings' })
  ).toBeVisible()
  await settings.click()
  await expect(editor.page.getByTestId('app-settings-dialog')).toBeVisible()
})
