import type { StoreValue } from 'nanostores'

import type { panelMessages } from '@pairdraw/vue/i18n'

type Panels = StoreValue<typeof panelMessages>

/** The label of one OpenType feature tag, as Figma's type settings name it. */
export function featureLabel(panels: Panels, tag: string): string {
  switch (tag) {
    case 'LIGA':
      return panels.standardLigatures
    case 'CALT':
      return panels.contextualAlternates
    case 'DLIG':
      return panels.discretionaryLigatures
    case 'HLIG':
      return panels.historicalLigatures
    case 'KERN':
      return panels.kerning
    case 'LNUM':
      return panels.liningFigures
    case 'ONUM':
      return panels.oldstyleFigures
    case 'PNUM':
      return panels.proportionalFigures
    case 'TNUM':
      return panels.tabularFigures
    case 'FRAC':
      return panels.fractions
    case 'AFRC':
      return panels.stackedFractions
    case 'ORDN':
      return panels.ordinals
    case 'ZERO':
      return panels.slashedZero
    case 'SMCP':
      return panels.smallCaps
    case 'PCAP':
      return panels.petiteCaps
    case 'C2SC':
      return panels.allSmallCaps
    case 'C2PC':
      return panels.allPetiteCaps
    case 'UNIC':
      return panels.unicase
    case 'TITL':
      return panels.titling
    case 'CASE':
      return panels.caseSensitiveForms
    case 'SINF':
      return panels.scientificInferiors
    case 'SUBS':
      return panels.subscript
    case 'SUPS':
      return panels.superscript
    default: {
      const set = /^SS(\d{2})$/.exec(tag)
      if (set) return panels.stylisticSet({ number: Number(set[1]) })
      const variant = /^CV(\d{2})$/.exec(tag)
      if (variant) return panels.characterVariant({ number: Number(variant[1]) })
      return panels.fontFeatureTag({ tag })
    }
  }
}