import { fontManager } from '@pairdraw/core/text'

import { expectDefined } from '#tests/helpers/assert'

/**
 * Registers the app's bundled variable Inter as `family`, upright and italic, as a host's own
 * fonts are, so `loadFontAsync` loads any weight of it: text edits refuse unloaded fonts.
 */
export async function registerTestFont(family = 'Inter'): Promise<void> {
  const data = expectDefined(await fontManager.fetchBundledFont('/InterVariable.ttf'), 'Inter')
  // The app's own bundled font loads as 'bundled', not as a document's font file: registered as
  // 'registered', it would list as a document font in every later test of the shard.
  const source = family === 'Inter' ? 'bundled' : 'registered'
  await fontManager.markLoaded(family, 'Regular', data, source)
  await fontManager.markLoaded(family, 'Regular Italic', data, source)
}
