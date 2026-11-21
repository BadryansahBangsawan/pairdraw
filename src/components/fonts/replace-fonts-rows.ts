import type { DocumentFont } from '@pairdraw/core/text'

/** One font the document uses, and the face it would be replaced with. */
export interface ReplaceFontRow {
  font: DocumentFont
  selected: boolean
  targetFamily: string
  targetStyle: string
}
