import type { WebCitation } from '@pairdraw/scene-graph/plugin-data'

import { referenceLink, type ChatReference } from '@/app/ai/chat/references/link'

/** The words a sticky uses when it shows a citation. */
export interface CitationLabels {
  source: string
  read: string
}

/**
 * The citation as plain text: the quote, then the page it came from. Tags in the quote stay
 * characters. Nothing here is HTML.
 */
export function citationStickyText(citation: WebCitation, labels: CitationLabels): string {
  return [
    citation.quote,
    '',
    `${labels.source}: ${citation.title}`,
    citation.url,
    `${labels.read}: ${citation.readAt}`
  ].join('\n')
}

/** A chat reference to the sticky that holds this citation, beside the usual node links. */
function citationReference(stickyId: string, citation: WebCitation): ChatReference {
  return { kind: 'citation', id: stickyId, label: citation.title }
}

/** The citation reference written the way chat text carries every other reference. */
export function citationReferenceLink(stickyId: string, citation: WebCitation): string {
  return referenceLink(citationReference(stickyId, citation))
}
