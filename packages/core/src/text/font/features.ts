import { uniq } from 'es-toolkit/array'

import { fontTableView } from './variation'

/**
 * The OpenType feature tags a font's GSUB table lists, in the table's own order, or `null` for a
 * font without one. The panel offers a feature only when the font actually has it, as Figma does.
 */
export function fontFeatureTags(data: ArrayBuffer): string[] | null {
  const gsub = fontTableView(data, 'GSUB')
  if (!gsub || gsub.byteLength < 14) return null
  // GSUB header: version (4), ScriptList offset (2), FeatureList offset (2), LookupList offset (2);
  // version 1.1 adds a FeatureVariations offset (4). The FeatureList offset is at byte 6 either way.
  const featureListOffset = gsub.getUint16(6)
  if (featureListOffset + 2 > gsub.byteLength) return null
  const count = gsub.getUint16(featureListOffset)
  const tags: string[] = []
  for (let index = 0; index < count; index++) {
    // Each FeatureRecord: a 4-byte tag and a 2-byte offset to its feature table.
    const record = featureListOffset + 2 + index * 6
    if (record + 4 > gsub.byteLength) break
    let tag = ''
    for (let c = 0; c < 4; c++) tag += String.fromCharCode(gsub.getUint8(record + c))
    tags.push(tag.toUpperCase())
  }
  return uniq(tags)
}
