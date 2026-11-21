import * as v from 'valibot'

import { replaceDocumentFonts } from '#core/text/replace-fonts'
import { defineTool } from '#core/tools/schema'

const faceInputSchema = v.strictObject({
  family: v.pipe(v.string(), v.description('Font family, as list_fonts or a text node names it')),
  style: v.pipe(v.string(), v.description('Face style, such as "Regular" or "Semi Bold"'))
})

const replacementInputSchema = v.strictObject({
  from: faceInputSchema,
  to: faceInputSchema
})

export const replaceFonts = defineTool({
  name: 'replace_fonts',
  description:
    'Replace font faces everywhere in the document: text layers, character runs, and text ' +
    'styles. Other faces keep their runs. One undoable step. Run list_fonts with scope ' +
    '"document" first to see the faces in use and which are missing.',
  execution: { kind: 'sync', mutation: 'document' },
  exposure: { webmcp: false },
  input: v.strictObject({
    replacements: v.pipe(
      v.array(replacementInputSchema),
      v.minLength(1),
      v.description(
        'Faces to swap, each { from: { family, style }, to: { family, style } }. A source face may appear once.'
      )
    )
  }),
  execute: (figma, args) => replaceDocumentFonts(figma.graph, args.replacements)
})
