import type { DesignMemoryGroup } from '@pairdraw/scene-graph/design-memory'

import type { DesignViolation } from './check'
import type { DesignRules } from './rules'

/** How many violations a message names before it counts the rest. */
const NAMED_VIOLATIONS = 8
/** How many allowed fonts a message lists. */
const LISTED_FONTS = 8

/** What one value of each group is called in messages. */
export const DESIGN_VALUE_NOUNS: Record<DesignMemoryGroup, string> = {
  colors: 'color',
  fonts: 'font',
  fontSizes: 'font size',
  spacing: 'spacing',
  radius: 'corner radius'
}

function quote(value: string | number): string {
  return typeof value === 'number' ? `${value}` : `"${value}"`
}

function describeNearest(violation: DesignViolation): string {
  const { nearest } = violation
  if (!nearest) return ''
  const named = nearest.name ? `"${nearest.name}" ${nearest.value}` : `${nearest.value}`
  const bind = nearest.variableId
    ? ` (bind variable ${nearest.variableId} to ${violation.path})`
    : ''
  return ` — nearest allowed: ${named}${bind}`
}

/** One violation as a line an agent can act on. */
export function describeDesignViolation(violation: DesignViolation, rules?: DesignRules): string {
  const where = `"${violation.nodeName}" (${violation.nodeId}) ${violation.path}`
  const noun = DESIGN_VALUE_NOUNS[violation.group]
  let line = `${where} ${quote(violation.value)} is not an allowed ${noun}${describeNearest(violation)}`
  if (violation.group === 'fonts' && rules) {
    const fonts = rules.fonts.allowed.slice(0, LISTED_FONTS).map((font) => font.value)
    if (fonts.length > 0) line += ` — allowed: ${fonts.join(', ')}`
  }
  return line
}

function describeAll(violations: readonly DesignViolation[], rules?: DesignRules): string {
  const lines = violations
    .slice(0, NAMED_VIOLATIONS)
    .map((violation) => describeDesignViolation(violation, rules))
  const more = violations.length - NAMED_VIOLATIONS
  if (more > 0) lines.push(`+${more} more`)
  return lines.join('\n')
}

/**
 * An agent's edit undone because it used values the document's design memory does not allow.
 * Its message stands on its own for any client: what broke the memory, the closest allowed
 * values, and what to do instead.
 */
export class DesignMemoryRefusalError extends Error {
  override name = 'DesignMemoryRefusalError'

  constructor(
    readonly violations: readonly DesignViolation[],
    rules?: DesignRules,
    message = `Refused by the document's design memory; nothing was changed.\n${describeAll(violations, rules)}\n` +
      'Use only allowed values (get_design_memory lists them, check_design_values checks yours). ' +
      'To propose a new value, write it down with record_design_decision; the person adds it with Allow.'
  ) {
    super(message)
  }

  /** The failed call's result, with the violations for interfaces that offer to allow them. */
  toResult(): { error: string; design_memory: { refused: readonly DesignViolation[] } } {
    return { error: this.message, design_memory: { refused: this.violations } }
  }
}

/** Why an agent's change to the memory itself was undone. */
export const MEMORY_CHANGE_REFUSED =
  "Refused: agents cannot change, switch off or remove the document's design memory; nothing was changed. " +
  'Write decisions down and pin examples with record_design_decision; the person changes what the memory allows.'

/** Warnings an edit that went through carries in its result. */
export function describeDesignWarnings(
  violations: readonly DesignViolation[],
  rules?: DesignRules
): string {
  return `The edit used values the document's design memory warns about; prefer allowed values.\n${describeAll(violations, rules)}`
}
