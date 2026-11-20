import { defineRule } from '#core/lint/rule'
import type { LintFix, LintNode, TokenNumberField } from '#core/lint/types'

const SPACING_FIELDS = [
  'itemSpacing',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft'
] as const satisfies readonly TokenNumberField[]

const FIELD_LABELS: Record<TokenNumberField, string> = {
  cornerRadius: 'Corner radius',
  itemSpacing: 'Gap',
  paddingTop: 'Top padding',
  paddingRight: 'Right padding',
  paddingBottom: 'Bottom padding',
  paddingLeft: 'Left padding',
  fontSize: 'Font size'
}

/**
 * The fields a layer of this kind sets for itself: spacing only in auto layout, and no font size
 * where a text style supplies it, since the style is where a binding belongs.
 */
function fieldsOf(node: LintNode): TokenNumberField[] {
  if (node.type === 'TEXT') return node.textStyleId ? [] : ['fontSize']
  const fields: TokenNumberField[] = ['cornerRadius']
  if (node.layoutMode !== 'NONE') fields.push(...SPACING_FIELDS)
  return fields
}

function bindTo(field: TokenNumberField, variable: { id: string; name: string }): LintFix {
  return {
    kind: 'bind-variable',
    path: field,
    variableId: variable.id,
    variableName: variable.name
  }
}

export default defineRule({
  meta: {
    id: 'no-unbound-token-values',
    category: 'design-tokens',
    description: 'Radii, spacing, and font sizes that equal a token should be bound to it'
  },
  match: ['RECTANGLE', 'FRAME', 'COMPONENT', 'INSTANCE', 'TEXT'],
  check(node, context) {
    const { numbersByField } = context.variables
    if (numbersByField.size === 0) return
    for (const field of fieldsOf(node)) {
      const value = node[field]
      // Zero means "none" far more often than it means a token.
      if (value <= 0 || node.boundVariables[field]) continue
      const matches = numbersByField.get(field)?.get(value) ?? []
      const only = matches.at(0)
      if (!only) continue
      const label = FIELD_LABELS[field]
      const names = matches.map((variable) => `"${variable.name}"`).join(', ')
      context.report({
        node,
        message: `${label} ${value} matches token ${names}`,
        suggest:
          matches.length === 1 ? `Bind ${label.toLowerCase()} to "${only.name}"` : 'Bind one token',
        data: { field, value, variableId: only.id, variableName: only.name },
        ...(matches.length === 1
          ? { fix: bindTo(field, only) }
          : { suggestions: matches.map((variable) => bindTo(field, variable)) })
      })
    }
  }
})
