import { compact, uniq, uniqBy } from 'es-toolkit/array'

import { colorToHex8, tryParseColor } from '@open-pencil/scene-graph/color'

import {
  MAX_STYLE_KIT_COLORS,
  MAX_STYLE_KIT_FONTS,
  MAX_STYLE_KIT_NAME,
  MAX_STYLE_KIT_NOTES
} from './limits'
import type { StyleKit, StyleKitColor } from './types'

/** A style kit as its editor holds it, with the fonts as the text the person typed. */
export interface StyleKitDraft {
  name: string
  colors: StyleKitColor[]
  fonts: string
  notes: string
}

/** A CSS colour as a kit stores it, `#RRGGBB` or `#RRGGBBAA`, or null when it is not one. */
export function normalizeKitColor(input: string): string | null {
  const color = tryParseColor(input.trim())
  return color ? colorToHex8(color) : null
}

/** The font families of a comma-separated list, each once. */
export function parseFontList(text: string): string[] {
  return uniq(
    compact(text.split(',').map((family) => family.trim().slice(0, MAX_STYLE_KIT_NAME)))
  ).slice(0, MAX_STYLE_KIT_FONTS)
}

export function draftOf(kit: StyleKit | null): StyleKitDraft {
  return {
    name: kit?.name ?? '',
    colors: kit ? kit.colors.map((color) => ({ ...color })) : [],
    fonts: kit?.fonts.join(', ') ?? '',
    notes: kit?.notes ?? ''
  }
}

/**
 * Adds a document's styles to a draft. What the person already wrote stays first: the document's
 * colours and fonts follow theirs, each once and within the kit's limits, and its name fills an
 * empty one.
 */
export function withDocumentStyles(draft: StyleKitDraft, document: StyleKit): StyleKitDraft {
  return {
    name: draft.name || document.name,
    colors: uniqBy([...draft.colors, ...document.colors], (color) => color.hex).slice(
      0,
      MAX_STYLE_KIT_COLORS
    ),
    fonts: parseFontList([draft.fonts, ...document.fonts].join(',')).join(', '),
    notes: draft.notes
  }
}

/** Whether the draft says anything the model could follow. */
export function draftHasContent(draft: StyleKitDraft): boolean {
  return Boolean(
    draft.colors.length > 0 || parseFontList(draft.fonts).length > 0 || draft.notes.trim()
  )
}

/** The kit a draft pins; an unnamed one takes `fallbackName`. */
export function styleKitFromDraft(draft: StyleKitDraft, fallbackName: string): StyleKit {
  return {
    name: (draft.name.trim() || fallbackName).slice(0, MAX_STYLE_KIT_NAME),
    colors: draft.colors
      .slice(0, MAX_STYLE_KIT_COLORS)
      .map(({ name, hex }) => ({ name: name.trim().slice(0, MAX_STYLE_KIT_NAME), hex })),
    fonts: parseFontList(draft.fonts),
    notes: draft.notes.trim().slice(0, MAX_STYLE_KIT_NOTES)
  }
}
