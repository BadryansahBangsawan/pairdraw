import { describe, expect, test } from 'bun:test'

import { resolveFontFamilyStack } from '#dom-css/import/fonts'
import { designDocumentToSceneGraph } from '#dom-css/import/scene-graph'
import { createHeadlessCSSRuntime, htmlToDesignDocument } from '#dom-css/index'

/** The family of the one text layer an HTML snippet makes. */
async function textFamily(
  html: string,
  options: { resolveFontFamily?: (value: string) => string | null } = {}
): Promise<string> {
  const document = await htmlToDesignDocument(html, { runtime: createHeadlessCSSRuntime() })
  const graph = designDocumentToSceneGraph(document, options)
  const text = [...graph.getAllNodes()].find((node) => node.type === 'TEXT')
  if (!text) throw new Error('No text layer')
  return text.fontFamily
}

describe('a CSS font stack resolves to a face the document can draw', () => {
  test('a generic keyword first maps its class to a concrete family', async () => {
    const html = '<p style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace">code</p>'
    const family = await textFamily(html)
    expect(family).toBe('Menlo')
    expect(family).not.toBe('ui-monospace')
  })

  test('a concrete family first stays the family', async () => {
    expect(await textFamily('<p style="font-family: Inter, ui-monospace">text</p>')).toBe('Inter')
  })

  test('a stack skips a concrete family the font service cannot provide', async () => {
    const html = '<p style="font-family: SFMono-Regular, Menlo, monospace">code</p>'
    const resolve = (value: string) =>
      resolveFontFamilyStack(value, { isAvailable: (family) => family === 'Menlo' })
    expect(await textFamily(html, { resolveFontFamily: resolve })).toBe('Menlo')
  })

  test('stacks of only generics take their class default', async () => {
    expect(await textFamily('<p style="font-family: system-ui">text</p>')).toBe('Inter')
    expect(await textFamily('<p style="font-family: monospace">code</p>')).toBe('Menlo')
    expect(await textFamily('<p style="font-family: serif">text</p>')).toBe('Georgia')
  })

  test('a quoted concrete family is read as one name', async () => {
    expect(await textFamily('<p style="font-family: \'Fira Code\', monospace">code</p>')).toBe(
      'Fira Code'
    )
  })
})
