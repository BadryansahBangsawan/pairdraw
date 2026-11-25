import { describe, expect, test } from 'bun:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { FIXTURES } from '#cli-tests/helpers/paths'

import { tokenDriftForFile } from '#cli/check/tokens'

const DOCUMENT = join(FIXTURES, 'pen-variables.pen')

const MATCHING = `:root {
  --color-merk-blauw: #4094D0;
  --font-tekst: "Noto Naskh Arabic";
  --color-merk-blauw-2: #4094D0;
  --font-tekst-2: "Noto Naskh Arabic";
}
`

async function stylesheet(css: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'pairdraw-check-tokens-'))
  const path = join(dir, 'globals.css')
  await writeFile(path, css)
  return path
}

describe('token drift for a check', () => {
  test('a stylesheet that matches the document is in sync', async () => {
    const result = await tokenDriftForFile(DOCUMENT, await stylesheet(MATCHING))
    expect(result).toEqual({ inSync: true, drift: [], issues: [] })
  })

  test('a changed value is drift, with the code and the canvas values', async () => {
    const result = await tokenDriftForFile(
      DOCUMENT,
      await stylesheet(':root { --color-merk-blauw: #FF0000; }')
    )
    expect(result.inSync).toBe(false)
    expect(result.drift).toHaveLength(1)
    expect(result.drift[0]).toMatchObject({
      kind: 'conflict',
      variable: 'merk-blauw',
      code: '#FF0000',
      canvas: '#4094D0'
    })
  })

  test('a missing stylesheet fails with its path named', async () => {
    await expect(tokenDriftForFile(DOCUMENT, '/nonexistent/styles.css')).rejects.toThrow(
      /styles\.css/
    )
  })
})
