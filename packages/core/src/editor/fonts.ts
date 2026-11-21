import {
  replaceDocumentFonts,
  type FontReplacement,
  type FontReplacementCounts
} from '#core/text/replace-fonts'

import { recordEdit } from './history/edit'
import type { EditorContext } from './types'

export function createFontActions(ctx: EditorContext) {
  /** Replaces font faces across the document as one undoable step. */
  function replaceFonts(replacements: readonly FontReplacement[]): FontReplacementCounts {
    return recordEdit(ctx, { label: 'Replace fonts' }, () =>
      replaceDocumentFonts(ctx.graph, replacements)
    )
  }

  return { replaceFonts }
}
