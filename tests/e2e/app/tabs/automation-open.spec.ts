import { readFileSync } from 'node:fs'

import * as v from 'valibot'

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { repoPath } from '#tests/helpers/paths'

const editor = useEditorSetup()

const FIRST = repoPath('tests/fixtures/material3.fig')
const SECOND = repoPath('tests/fixtures/slots.fig')

const listedDocumentsSchema = v.object({
  result: v.object({ documents: v.array(v.object({ id: v.string() })) })
})

test('opening a second document while the first loads answers both calls', async () => {
  // The automation `open_file` of a browser build reads the path from the app's own origin.
  await editor.page.route('**/e2e/first.fig', (route) =>
    route.fulfill({
      body: readFileSync(FIRST),
      contentType: 'application/octet-stream'
    })
  )
  await editor.page.route('**/e2e/second.fig', (route) =>
    route.fulfill({
      body: readFileSync(SECOND),
      contentType: 'application/octet-stream'
    })
  )

  const outcome = await editor.page.evaluate(async () => {
    const automation = window.pairdraw?.test?.automation
    if (!automation) throw new Error('Automation unavailable')
    const settle = (pending: Promise<unknown>) =>
      Promise.race([
        pending.then(
          () => 'done',
          (error) => `failed: ${String(error).slice(0, 120)}`
        ),
        new Promise((resolve) => {
          setTimeout(() => resolve('timeout'), 25_000)
        })
      ])
    const firstOpen = settle(automation('open_file', { path: '/e2e/first.fig' }))
    await new Promise((resolve) => {
      setTimeout(resolve, 100)
    })
    const secondOpen = settle(automation('open_file', { path: '/e2e/second.fig' }))
    return await Promise.all([firstOpen, secondOpen])
  })
  expect(outcome).toEqual(['done', 'done'])
  const listed = v.safeParse(
    listedDocumentsSchema,
    await editor.page.evaluate(() => window.pairdraw?.test?.automation?.('list_documents', {}))
  )
  expect(listed.success && listed.output.result.documents.length).toBeGreaterThanOrEqual(2)
})
