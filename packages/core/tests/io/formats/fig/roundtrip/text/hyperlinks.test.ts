import { beforeAll, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor } from '@open-pencil/core'
import { exportFigFile, parseFigFile } from '@open-pencil/core/io/formats/fig'
import { initCodec } from '@open-pencil/kiwi/fig/codec'

beforeAll(async () => {
  await initCodec()
})

test('keeps links set on ranges and whole texts through a .fig file', async () => {
  const editor = createEditor()
  const page = editor.state.currentPageId
  const ranged = editor.graph.createNode('TEXT', page, { name: 'Ranged', text: 'Read the docs' })
  const whole = editor.graph.createNode('TEXT', page, { name: 'Whole', text: 'Mail us' })
  expect(editor.setTextHyperlink(ranged.id, 'openpencil.dev/docs', [9, 13])).toBe(true)
  expect(editor.setTextHyperlink(whole.id, 'hello@openpencil.dev')).toBe(true)

  const reopened = await parseFigFile((await exportFigFile(editor.graph)).slice().buffer)
  const text = (name: string) =>
    expectDefined(
      [...reopened.getAllNodes()].find((node) => node.name === name),
      `reopened ${name}`
    )

  const docs = { type: 'URL', value: 'https://openpencil.dev/docs' }
  expect(text('Ranged').styleRuns).toEqual([
    expect.objectContaining({
      start: 9,
      length: 4,
      style: expect.objectContaining({ hyperlink: docs, textDecoration: 'UNDERLINE' })
    })
  ])
  expect(text('Whole').styleRuns.map((run) => run.style.hyperlink)).toEqual([
    { type: 'URL', value: 'mailto:hello@openpencil.dev' }
  ])
  editor.dispose()
})
