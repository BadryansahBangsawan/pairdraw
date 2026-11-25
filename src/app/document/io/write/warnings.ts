import type { WriteDocumentWarning } from '@pairdraw/core/io'

import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'

/**
 * What a save or export could not put in its file, said in one toast: the writer's facts, in a
 * fixed order, with the surplus counted. A host that wants the English sentences takes them from
 * the writer itself (`ExportResult.warnings`); this is the app's own voice.
 */

/** Most sentences one toast shows; more than this would push the first ones off the stack. */
const SHOWN_SENTENCES = 3

/** Fixed order, so the same losses always read in the same sequence. */
const KIND_ORDER: readonly WriteDocumentWarning['kind'][] = [
  'merged-pages',
  'display-p3-colors',
  'library-definitions',
  'missing-image-fills',
  'dropped-effects',
  'dropped-filters',
  'dropped-scroll',
  'dropped-font-features',
  'unbound-variables'
]

function messageOf(warning: WriteDocumentWarning): string {
  const messages = notificationMessages.get()
  switch (warning.kind) {
    case 'merged-pages':
      return messages.penMergedPages({ pages: warning.pages, name: warning.name })
    case 'display-p3-colors':
      return messages.penColorsToSRGB
    case 'library-definitions':
      return warning.count === 1
        ? messages.penLibraryDefinitionsOne
        : messages.penLibraryDefinitionsMany({ count: warning.count })
    case 'missing-image-fills':
      return warning.count === 1
        ? messages.penMissingImageFillsOne
        : messages.penMissingImageFillsMany({ count: warning.count })
    case 'dropped-effects':
      return warning.count === 1
        ? messages.penDroppedEffectsOne
        : messages.penDroppedEffectsMany({ count: warning.count })
    case 'dropped-filters':
      return warning.count === 1
        ? messages.penDroppedFiltersOne
        : messages.penDroppedFiltersMany({ count: warning.count })
    case 'dropped-scroll':
      return warning.count === 1
        ? messages.penDroppedScrollOne
        : messages.penDroppedScrollMany({ count: warning.count })
    case 'dropped-font-features':
      return warning.count === 1
        ? messages.penDroppedFontFeaturesOne
        : messages.penDroppedFontFeaturesMany({ count: warning.count })
    case 'unbound-variables': {
      const params = {
        variables:
          warning.variables === 1
            ? messages.oneVariable
            : messages.manyVariables({ count: warning.variables }),
        collections:
          warning.collections.length === 1
            ? messages.oneCollection
            : messages.manyCollections({ count: warning.collections.length }),
        names: warning.collections.join(', ')
      }
      if (warning.layers === 0) return messages.drawioUnboundVariablesNoLayers(params)
      if (warning.layers === 1) return messages.drawioUnboundVariablesOneLayer(params)
      return messages.drawioUnboundVariablesManyLayers({ ...params, layers: warning.layers })
    }
    default: {
      const unhandled: never = warning
      throw new Error(`Unhandled write warning: ${String(unhandled)}`)
    }
  }
}

/** Shows what a written file left out, once per write; an empty list says nothing. */
export function reportWriteWarnings(warnings: readonly WriteDocumentWarning[]): void {
  if (warnings.length === 0) return
  const sentences = warnings
    .map((warning) => ({ rank: KIND_ORDER.indexOf(warning.kind), text: messageOf(warning) }))
    .sort((left, right) => left.rank - right.rank)
    .map((entry) => entry.text)
  const shown = sentences.slice(0, SHOWN_SENTENCES)
  const rest = sentences.length - shown.length
  if (rest > 0) shown.push(notificationMessages.get().writeWarningsMore({ count: rest }))
  toast.warning(shown.join(' '))
}
