import { describeDesignMemory, type DesignGroupReport } from '@pairdraw/core/design-memory'
import type { SceneGraph } from '@pairdraw/scene-graph'
import type { DesignMemoryGroup } from '@pairdraw/scene-graph/design-memory'

import { DESIGN_MEMORY_MAX_LENGTH, inert } from '@/app/ai/chat/context'

/** How many allowed values of a group the note lists; get_design_memory reads them all. */
const LISTED_VALUES = 40

const LABELS: Record<DesignMemoryGroup, string> = {
  colors: 'Colors',
  fonts: 'Fonts',
  fontSizes: 'Font sizes',
  spacing: 'Spacing',
  radius: 'Corner radii'
}

const ENFORCEMENT = {
  refuse: 'an edit with another value is undone',
  warn: 'other values are warned about',
  off: 'not checked'
} as const

/** The most characters one group's values take, so five groups leave room for decisions. */
const GROUP_LINE_LENGTH = 280

function groupLine(group: DesignMemoryGroup, report: DesignGroupReport): string {
  if (report.enforce === 'off') return `${LABELS[group]}: ${ENFORCEMENT.off}`
  const head = `${LABELS[group]} (${ENFORCEMENT[report.enforce]}): `
  const listed: string[] = []
  let length = head.length
  for (const { value, name } of report.allowed) {
    const item = name ? `${inert(name)} ${value}` : `${value}`
    if (length + item.length + 2 > GROUP_LINE_LENGTH) break
    listed.push(item)
    length += item.length + 2
  }
  const more = report.allowed.length - listed.length + report.more
  return `${head}${listed.join(', ')}${more > 0 ? `, +${more} more` : ''}`
}

/**
 * The document's design memory as the model reads it, or null when it has none: what each group
 * allows and how it is enforced, the decisions, and the pinned examples. Decisions past the
 * length budget are counted rather than cut.
 */
export function designMemoryNote(graph: SceneGraph): string | null {
  const report = describeDesignMemory(graph, LISTED_VALUES)
  if (!report) return null
  const lines = ['<design-memory>']
  for (const group of ['colors', 'fonts', 'fontSizes', 'spacing', 'radius'] as const)
    lines.push(groupLine(group, report.groups[group]))
  const examples = report.examples.flatMap(({ id, name }) =>
    name === null ? [] : [`"${inert(name)}" (${id})`]
  )
  if (examples.length > 0) lines.push(`Examples to follow: ${examples.join(', ')}`)
  let length = lines.join('\n').length
  const decisions: string[] = []
  for (const { text } of report.decisions) {
    const line = `- ${inert(text)}`
    if (length + line.length > DESIGN_MEMORY_MAX_LENGTH) break
    decisions.push(line)
    length += line.length + 1
  }
  if (decisions.length > 0) lines.push('Decisions:', ...decisions)
  const left = report.decisions.length - decisions.length
  if (left > 0) lines.push(`(${left} more decisions; get_design_memory reads them)`)
  lines.push('</design-memory>')
  return lines.join('\n')
}
