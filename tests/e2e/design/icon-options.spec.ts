import { readFileSync } from 'node:fs'

import type { Page } from '@playwright/test'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { testPath } from '#tests/helpers/paths'
import { propertySection } from '#tests/helpers/properties'

// A Material Symbols icon is drawn from Google's variable font at the axes the Icon section
// sets: weight, fill, grade, and optical size. Each change draws it again as one undo step.

const FONT_URL = 'https://fonts.gstatic.com/s/test/material.ttf'
const FONT = readFileSync(testPath('fixtures/fonts/MaterialSymbolsRounded-home-dark_mode.ttf'))
/** The names each set's font draws, as Google lists them beside the fonts. */
const CODEPOINTS = 'home e88a\ndark_mode e51c\n'

const ctx = useEditorSetupWithClear()

test.beforeAll(async () => {
  await ctx.page.route('https://api.iconify.design/**', (route) => route.fulfill({ json: {} }))
  await ctx.page.route('https://cdn.jsdelivr.net/**', (route) =>
    route.request().url().endsWith('.codepoints')
      ? route.fulfill({ body: CODEPOINTS, headers: { 'access-control-allow-origin': '*' } })
      : route.fulfill({ status: 404 })
  )
  await ctx.page.route('https://fonts.googleapis.com/css2**', (route) =>
    route.fulfill({
      body: `@font-face { src: url(${FONT_URL}) format('woff2'); }`,
      headers: { 'access-control-allow-origin': '*' }
    })
  )
  await ctx.page.route(FONT_URL, (route) =>
    route.fulfill({ body: FONT, headers: { 'access-control-allow-origin': '*' } })
  )
})

/** Inserts Material Symbols' rounded home icon, selected, and returns its layer. */
async function insertHome(page: Page) {
  const id = await page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return store.insertIcon('material-symbols-rounded:home')
  })
  if (!id) throw new Error('The icon was not inserted')
  return id
}

/** The options the icon was last drawn with. */
function drawnOptions(page: Page, id: string) {
  return page.evaluate((frameId) => {
    const node = window.pairdraw?.getStore?.().graph.getNode(frameId)
    const data = node?.pluginData.find(
      (entry) => entry.pluginId === 'pairdraw' && entry.key === 'icon'
    )?.value
    if (!data) return null
    const icon: unknown = JSON.parse(data)
    return typeof icon === 'object' && icon !== null && 'options' in icon ? icon.options : null
  }, id)
}

test('the Icon section sets a Material Symbol’s weight, fill, and grade, each undoable', async () => {
  const page = ctx.page
  const id = await insertHome(page)
  const section = propertySection(page, 'Icon')
  const weight = section.getByRole('spinbutton', { name: 'Weight', exact: true })
  await expect(weight).toHaveText('400')

  await weight.focus()
  await weight.fill('700')
  await weight.press('Enter')
  await expect.poll(() => drawnOptions(page, id)).toMatchObject({ wght: 700, FILL: 0 })

  await section.getByRole('switch', { name: 'Filled' }).click()
  await expect.poll(() => drawnOptions(page, id)).toMatchObject({ wght: 700, FILL: 1 })

  const grade = section.getByRole('spinbutton', { name: 'Grade', exact: true })
  await grade.focus()
  await grade.fill('-25')
  await grade.press('Enter')
  await expect.poll(() => drawnOptions(page, id)).toMatchObject({ GRAD: -25 })

  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => drawnOptions(page, id)).toMatchObject({ wght: 700, FILL: 1, GRAD: 0 })
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => drawnOptions(page, id)).toMatchObject({ wght: 700, FILL: 0 })
  await expect(section.getByRole('switch', { name: 'Filled' })).toHaveAttribute(
    'aria-checked',
    'false'
  )
})
