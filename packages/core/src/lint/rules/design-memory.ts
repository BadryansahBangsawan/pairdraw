import { DESIGN_MEMORY_GROUPS, type DesignMemoryGroup } from '@pairdraw/scene-graph/design-memory'

import { DESIGN_VALUE_NOUNS, type DesignViolation } from '#core/design-memory'
import { defineRule } from '#core/lint/rule'
import type { LintFix, LintFixProperty, LintMessageData, Rule } from '#core/lint/types'

/** The rule that checks each group of the document's design memory. */
export const DESIGN_MEMORY_RULE_IDS = {
  colors: 'design-memory-colors',
  fonts: 'design-memory-fonts',
  fontSizes: 'design-memory-font-sizes',
  spacing: 'design-memory-spacing',
  radius: 'design-memory-radius'
} as const satisfies Record<DesignMemoryGroup, string>

const DESCRIPTIONS: Record<DesignMemoryGroup, string> = {
  colors: "Colors should be ones the document's design memory allows",
  fonts: "Fonts should be ones the document's design memory allows",
  fontSizes: "Font sizes should follow the document's design memory",
  spacing: "Spacing should follow the document's design memory",
  radius: "Corner radii should follow the document's design memory"
}

/** The numeric fields a lint fix may set that the memory's groups judge. */
const SETTABLE: ReadonlySet<string> = new Set<LintFixProperty>([
  'fontSize',
  'itemSpacing',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'cornerRadius'
])

const BINDABLE_PAINT = /^(?:fills|strokes)\/\d+\/color$/

/** The change that puts the nearest allowed value in place, when one can. */
function suggestion(violation: DesignViolation): LintFix | null {
  const { nearest, path } = violation
  if (!nearest) return null
  if (violation.group === 'colors') {
    if (!nearest.variableId || !BINDABLE_PAINT.test(path)) return null
    return {
      kind: 'bind-variable',
      path,
      variableId: nearest.variableId,
      variableName: nearest.name ?? String(nearest.value)
    }
  }
  if (typeof nearest.value !== 'number' || !SETTABLE.has(path)) return null
  return { kind: 'set', changes: { [path]: nearest.value } }
}

/** What a finding carries for interfaces: the value, and the nearest allowed one when there is one. */
function findingData(violation: DesignViolation): LintMessageData {
  const data: Record<string, string | number> = {
    group: violation.group,
    path: violation.path,
    value: violation.value
  }
  if (violation.nearest) data.nearest = violation.nearest.value
  if (violation.nearest?.name) data.nearestName = violation.nearest.name
  return data
}

function memoryRule(group: DesignMemoryGroup): Rule {
  return defineRule({
    meta: {
      id: DESIGN_MEMORY_RULE_IDS[group],
      category: 'design-memory',
      description: DESCRIPTIONS[group]
    },
    check(node, context) {
      for (const violation of context.design?.violations(node) ?? []) {
        if (violation.group !== group) continue
        const nearest = violation.nearest
        const fix = suggestion(violation)
        context.report({
          node,
          message: `${violation.path} ${violation.value} is not an allowed ${DESIGN_VALUE_NOUNS[group]}`,
          suggest: nearest
            ? `Use ${nearest.name ? `"${nearest.name}" ` : ''}${nearest.value}`
            : 'Use an allowed value, or allow this one in the design memory',
          data: findingData(violation),
          suggestions: fix ? [fix] : undefined,
          // Gradient stops and shadow colors only ever warn.
          severity: violation.severity === 'warn' ? 'warning' : undefined
        })
      }
    }
  })
}

/** The design memory's rules, by id; they run only in a document that has a memory. */
export const designMemoryRules: Record<string, Rule> = Object.fromEntries(
  DESIGN_MEMORY_GROUPS.map((group) => [DESIGN_MEMORY_RULE_IDS[group], memoryRule(group)])
)
