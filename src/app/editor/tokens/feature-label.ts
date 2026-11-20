import type { StoreValue } from 'nanostores'

import type { panelMessages } from '@pairdraw/vue/i18n'

type Panels = StoreValue<typeof panelMessages>

/** The panel message each named OpenType feature tag reads, as Figma's type settings name it. */
const FEATURE_LABEL_KEYS = {
  LIGA: 'standardLigatures',
  CALT: 'contextualAlternates',
  DLIG: 'discretionaryLigatures',
  HLIG: 'historicalLigatures',
  KERN: 'kerning',
  LNUM: 'liningFigures',
  ONUM: 'oldstyleFigures',
  PNUM: 'proportionalFigures',
  TNUM: 'tabularFigures',
  FRAC: 'fractions',
  AFRC: 'stackedFractions',
  ORDN: 'ordinals',
  ZERO: 'slashedZero',
  SMCP: 'smallCaps',
  PCAP: 'petiteCaps',
  C2SC: 'allSmallCaps',
  C2PC: 'allPetiteCaps',
  UNIC: 'unicase',
  TITL: 'titling',
  CASE: 'caseSensitiveForms',
  SINF: 'scientificInferiors',
  SUBS: 'subscript',
  SUPS: 'superscript'
} as const satisfies Record<string, keyof Panels>

/** The label of one OpenType feature tag, as Figma's type settings name it. */
export function featureLabel(panels: Panels, tag: string): string {
  if (Object.hasOwn(FEATURE_LABEL_KEYS, tag)) {
    const key = FEATURE_LABEL_KEYS[tag as keyof typeof FEATURE_LABEL_KEYS]
    return panels[key]
  }
  const set = /^SS(\d{2})$/.exec(tag)
  if (set) return panels.stylisticSet({ number: Number(set[1]) })
  const variant = /^CV(\d{2})$/.exec(tag)
  if (variant) return panels.characterVariant({ number: Number(variant[1]) })
  return panels.fontFeatureTag({ tag })
}
