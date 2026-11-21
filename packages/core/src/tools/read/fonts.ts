import { uniq } from 'es-toolkit/array'
import * as v from 'valibot'

import { PairdrawAPI } from '#core/pairdraw-api'
import { listDocumentFonts } from '#core/text/replace-fonts'
import { defineTool } from '#core/tools/schema'

export const getFontStatus = defineTool({
  name: 'get_font_status',
  description:
    'Report whether fonts used on the current page are faithfully available. Returns requested ' +
    'faces, their loaded source, active substitutions, why an installed face could not be ' +
    'loaded, and affected nodes.',
  execution: { kind: 'sync', mutation: 'none' },
  exposure: { webmcp: false },
  input: v.strictObject({}),
  execute: (figma) => new PairdrawAPI(figma).getFontStatus()
})

export const listFonts = defineTool({
  name: 'list_fonts',
  description:
    'List fonts used in the current page as families with their weights. Pass scope ' +
    '"document" for every face used anywhere in the document, with whether the host has it ' +
    'and how many text layers use it, missing faces first; use replace_fonts to swap one for ' +
    'an available face.',
  execution: { kind: 'sync', mutation: 'none' },
  exposure: { webmcp: false },
  input: v.strictObject({
    family: v.optional(v.pipe(v.string(), v.description('Filter by family name (substring)'))),
    scope: v.optional(
      v.pipe(
        v.picklist(['page', 'document']),
        v.description(
          'page (default): families and weights of the current page. document: every face ' +
            'across the document with missing and layerCount'
        )
      )
    )
  }),
  execute: (figma, args) => {
    if (args.scope === 'document') {
      let fonts = listDocumentFonts(figma.graph)
      if (args.family) {
        const query = args.family.toLocaleLowerCase()
        fonts = fonts.filter((font) => font.family.toLocaleLowerCase().includes(query))
      }
      return { count: fonts.length, fonts }
    }
    const fonts = new Map<string, Set<number>>()
    const page = figma.currentPage
    page.findAll((node) => {
      if (node.type === 'TEXT') {
        const raw = figma.graph.getNode(node.id)
        if (raw) {
          const key = raw.fontFamily
          if (!fonts.has(key)) fonts.set(key, new Set())
          fonts.get(key)?.add(raw.fontWeight)
        }
      }
      return false
    })
    let result = [...fonts.entries()].map(([family, weights]) => ({
      family,
      weights: [...weights].sort((a, b) => a - b)
    }))
    if (args.family) {
      const q = args.family.toLowerCase()
      result = result.filter((font) => font.family.toLowerCase().includes(q))
    }
    return { count: result.length, fonts: result }
  }
})

export const listAvailableFonts = defineTool({
  name: 'list_available_fonts',
  description:
    'List font families the host can render: installed, bundled, and online families. ' +
    'Use this to discover what fonts are available to set on a text node — distinct from list_fonts ' +
    'which only reports families currently used in the page.',
  execution: { kind: 'async', mutation: 'none' },
  exposure: { webmcp: false },
  input: v.strictObject({
    family: v.optional(
      v.pipe(v.string(), v.description('Filter by family name (substring, case-insensitive)'))
    )
  }),
  execute: async (figma, args) => {
    const fonts = await figma.listAvailableFontsAsync()
    let families = uniq(fonts.map((font) => font.fontName.family))
    if (args.family) {
      const q = args.family.toLowerCase()
      families = families.filter((family) => family.toLowerCase().includes(q))
    }
    families.sort((a, b) => a.localeCompare(b))
    return { count: families.length, fonts: families }
  }
})
