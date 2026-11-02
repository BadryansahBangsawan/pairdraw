import assert from 'node:assert/strict'

import { targetFiles } from './config.ts'
import type { BrandTarget } from './config.ts'
import { generateDesktop } from './desktop.ts'
import { validateFiles } from './validate.ts'
import { generateWeb } from './web.ts'

/** Validate fresh output and determinism without publishing into the checkout. */
export async function checkBrandAssets(
  root: string,
  selected: readonly BrandTarget[]
): Promise<void> {
  const generate = (target: BrandTarget) =>
    target === 'desktop' ? generateDesktop(root) : generateWeb(root, target)
  for (const target of selected) {
    const first = await generate(target)
    const second = await generate(target)
    await validateFiles(first, target)
    for (const name of targetFiles(target)) {
      assert.deepEqual(
        first.get(name),
        second.get(name),
        `Non-deterministic ${target} asset: ${name}`
      )
    }
    console.info(`Verified ${target} brand assets`)
  }
}
