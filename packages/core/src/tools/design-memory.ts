import * as v from 'valibot'

import { PairdrawAPI } from '#core/pairdraw-api'
import { defineTool, toolFailure } from '#core/tools/schema'

function valuesInput<T extends v.GenericSchema>(description: string, value: T) {
  return v.optional(v.pipe(v.array(value), v.maxLength(64), v.description(description)))
}

export const getDesignMemory = defineTool({
  name: 'get_design_memory',
  description:
    'Read the document’s design memory before you design in it: the colors, fonts, font sizes, ' +
    'spacing and corner radii it allows (its variables and styles plus values the person added), ' +
    'whether an edit with another value is refused or warned about, the decisions written down, ' +
    'and frames pinned as examples to follow (read them with get_jsx or export_image). ' +
    'Returns null when the document has none.',
  execution: { kind: 'sync', mutation: 'none' },
  input: v.strictObject({}),
  execute: (figma) => ({ design_memory: new PairdrawAPI(figma).designMemory })
})

export const checkDesignValuesTool = defineTool({
  name: 'check_design_values',
  description:
    'Check values against the document’s design memory before you use them: each comes back ' +
    'ok, warn (allowed with a warning), refuse (an edit using it is undone) or invalid, with the ' +
    'nearest allowed value and the variable that holds it.',
  execution: { kind: 'sync', mutation: 'none' },
  input: v.strictObject({
    colors: valuesInput('CSS colors, such as #1A73E8', v.string()),
    fonts: valuesInput('Font families', v.string()),
    font_sizes: valuesInput('Font sizes in px', v.number()),
    spacing: valuesInput('Gaps and padding in px', v.number()),
    radius: valuesInput('Corner radii in px', v.number())
  }),
  execute: (figma, { colors, fonts, font_sizes, spacing, radius }) => {
    try {
      const verdicts = new PairdrawAPI(figma).checkDesignValues({
        colors,
        fonts,
        fontSizes: font_sizes,
        spacing,
        radius
      })
      return { verdicts }
    } catch (error) {
      return toolFailure(error)
    }
  }
})

export const recordDesignDecisionTool = defineTool({
  name: 'record_design_decision',
  description:
    'Write a design decision down in the document’s design memory, such as “Cards use 16 px ' +
    'padding and the Surface/Raised color”, so later work follows it; optionally pin a frame ' +
    'that shows it as an example. It cannot change which values the memory allows: only the ' +
    'person can.',
  execution: { kind: 'sync', mutation: 'document' },
  input: v.strictObject({
    text: v.pipe(v.string(), v.description('The decision, at most 400 characters')),
    example_node_id: v.optional(v.pipe(v.string(), v.description('A layer that shows it')))
  }),
  execute: (figma, { text, example_node_id }) => {
    try {
      return new PairdrawAPI(figma).recordDesignDecision(text, example_node_id)
    } catch (error) {
      return toolFailure(error)
    }
  }
})
