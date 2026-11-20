import { defineCommand } from 'citty'
import { compact } from 'es-toolkit/array'
import * as v from 'valibot'

import {
  DESIGN_DECISION_AUTHORS,
  DESIGN_MEMORY_ENFORCEMENTS,
  DESIGN_MEMORY_GROUPS
} from '@pairdraw/scene-graph/design-memory'

import { appTargetOptions } from '#cli/app/target'
import { bold, dim, kv, printJSON } from '#cli/format'
import { runToolData } from '#cli/tool-data'

const GROUP_LABELS = {
  colors: 'Colors',
  fonts: 'Fonts',
  fontSizes: 'Font sizes',
  spacing: 'Spacing',
  radius: 'Corner radius'
} as const

const groupSchema = v.object({
  enforce: v.picklist(DESIGN_MEMORY_ENFORCEMENTS),
  allowed: v.array(
    v.object({ value: v.union([v.string(), v.number()]), name: v.nullable(v.string()) })
  ),
  more: v.number()
})

/** What `get_design_memory` answers, from the running app or a file. */
const resultSchema = v.object({
  design_memory: v.nullable(
    v.object({
      groups: v.object({
        colors: groupSchema,
        fonts: groupSchema,
        fontSizes: groupSchema,
        spacing: groupSchema,
        radius: groupSchema
      }),
      decisions: v.array(
        v.object({ text: v.string(), author: v.picklist(DESIGN_DECISION_AUTHORS) })
      ),
      examples: v.array(
        v.object({ id: v.string(), name: v.nullable(v.string()), page: v.nullable(v.string()) })
      )
    })
  )
})

type Report = NonNullable<v.InferOutput<typeof resultSchema>['design_memory']>

function printReport(report: Report): void {
  console.log('')
  for (const group of DESIGN_MEMORY_GROUPS) {
    const label = GROUP_LABELS[group]
    const { enforce, allowed, more } = report.groups[group]
    const values = allowed.map(({ value, name }) => (name ? `${value} (${name})` : `${value}`))
    const listed =
      values.length > 0 ? values.join(', ') + (more > 0 ? `, +${more} more` : '') : dim('none')
    console.log(kv(`${label} [${enforce}]`, listed))
  }
  if (report.decisions.length > 0) {
    console.log('')
    console.log(bold('  Decisions'))
    for (const { text, author } of report.decisions) console.log(kv(author, text))
  }
  if (report.examples.length > 0) {
    console.log('')
    console.log(bold('  Examples'))
    for (const { id, name, page } of report.examples)
      console.log(kv(id, name === null ? dim('missing') : compact([name, page]).join(', ')))
  }
  console.log('')
}

export default defineCommand({
  meta: {
    name: 'design-memory',
    description:
      "Show the document's design memory: the colors, fonts, sizes, spacing and radii agents may use, its decisions, and its examples"
  },
  args: {
    file: {
      type: 'positional',
      description: 'Document file path (omit to connect to running app)',
      required: false
    },
    ...appTargetOptions,
    json: { type: 'boolean', description: 'Output as JSON' }
  },
  async run({ args }) {
    const { result } = await runToolData(args.file, 'get_design_memory', {}, args)
    const memory = v.parse(resultSchema, result).design_memory
    if (args.json) {
      await printJSON(memory)
      return
    }
    if (!memory) {
      console.log(dim('  This document has no design memory.'))
      return
    }
    printReport(memory)
  }
})
