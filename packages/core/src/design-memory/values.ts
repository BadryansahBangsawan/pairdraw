import type { SceneNode } from '@pairdraw/scene-graph'
import { colorToHex } from '@pairdraw/scene-graph/color'
import type { DesignMemoryGroup } from '@pairdraw/scene-graph/design-memory'
import { AUTO_LAYOUT_FIELDS, CORNER_FIELDS } from '@pairdraw/scene-graph/fields'

/** A value on a layer that a group of the memory judges. */
export interface DesignValue {
  group: DesignMemoryGroup
  /** The layer field that holds it, which an edit changes. */
  field: keyof SceneNode
  /** Where on the layer, such as `fills/0/color` or `styleRuns/2/fontSize`. */
  path: string
  value: string | number
  /** Bound to a variable or given by a shared style, so the system's by construction. */
  fromSystem: boolean
  /** Judged at most as a warning: gradient stops and shadow colors are content as much as tokens. */
  soft: boolean
}

/** Gaps and padding, which the spacing group judges. */
const SPACING_FIELDS: readonly (keyof SceneNode)[] = AUTO_LAYOUT_FIELDS.filter((field) =>
  /^padding|Spacing$|Gap$/.test(field)
)
/** Each corner's own radius, judged when the corners differ. */
const CORNER_RADIUS_FIELDS: readonly (keyof SceneNode)[] = CORNER_FIELDS.filter(
  (field) => field !== 'cornerRadius' && field.endsWith('Radius')
)

function paintValues(node: SceneNode, field: 'fills' | 'strokes', styled: boolean): DesignValue[] {
  return node[field].flatMap((paint, index): DesignValue[] => {
    if (!paint.visible) return []
    const path = `${field}/${index}/color`
    if (paint.type === 'SOLID') {
      const fromSystem = styled || Boolean(node.boundVariables[path])
      return [
        { group: 'colors', field, path, value: colorToHex(paint.color), fromSystem, soft: false }
      ]
    }
    return (paint.gradientStops ?? []).map((stop, stopIndex): DesignValue => ({
      group: 'colors',
      field,
      path: `${field}/${index}/gradientStops/${stopIndex}`,
      value: colorToHex(stop.color),
      fromSystem: styled,
      soft: true
    }))
  })
}

function textValues(node: SceneNode): DesignValue[] {
  const values: DesignValue[] = []
  const styled = Boolean(node.textStyleId)
  values.push({
    group: 'fonts',
    field: 'fontFamily',
    path: 'fontFamily',
    value: node.fontFamily,
    fromSystem: styled || Boolean(node.boundVariables.fontFamily),
    soft: false
  })
  values.push({
    group: 'fontSizes',
    field: 'fontSize',
    path: 'fontSize',
    value: node.fontSize,
    fromSystem: styled || Boolean(node.boundVariables.fontSize),
    soft: false
  })
  node.styleRuns.forEach(({ style }, index) => {
    const runStyled = Boolean(style.textStyleId)
    if (style.fontFamily !== undefined)
      values.push({
        group: 'fonts',
        field: 'styleRuns',
        path: `styleRuns/${index}/fontFamily`,
        value: style.fontFamily,
        fromSystem: runStyled || Boolean(style.boundVariables?.fontFamily),
        soft: false
      })
    if (style.fontSize !== undefined)
      values.push({
        group: 'fontSizes',
        field: 'styleRuns',
        path: `styleRuns/${index}/fontSize`,
        value: style.fontSize,
        fromSystem: runStyled || Boolean(style.boundVariables?.fontSize),
        soft: false
      })
    style.fills?.forEach((paint, paintIndex) => {
      if (paint.type !== 'SOLID' || !paint.visible) return
      values.push({
        group: 'colors',
        field: 'styleRuns',
        path: `styleRuns/${index}/fills/${paintIndex}`,
        value: colorToHex(paint.color),
        fromSystem: Boolean(style.fillStyleId),
        soft: false
      })
    })
  })
  return values
}

function layoutValues(node: SceneNode): DesignValue[] {
  if (node.layoutMode === 'NONE') return []
  // The cross-axis gap counts only when rows wrap, and the grid gaps only in a grid.
  const fields = SPACING_FIELDS.filter((field) => {
    if (field === 'counterAxisSpacing') return node.layoutWrap === 'WRAP'
    if (field.endsWith('Gap')) return node.layoutMode === 'GRID'
    return node.layoutMode !== 'GRID' || field.startsWith('padding')
  })
  return fields.flatMap((field): DesignValue[] => {
    const value = node[field]
    if (typeof value !== 'number' || value === 0) return []
    const fromSystem = Boolean(node.boundVariables[field])
    return [{ group: 'spacing', field, path: field, value, fromSystem, soft: false }]
  })
}

function radiusValues(node: SceneNode): DesignValue[] {
  // A pill's radius follows its size, so no scale step describes it.
  const pill = Math.min(node.width, node.height) / 2
  const fields: readonly (keyof SceneNode)[] = node.independentCorners
    ? CORNER_RADIUS_FIELDS
    : ['cornerRadius']
  return fields.flatMap((field): DesignValue[] => {
    const value = node[field]
    if (typeof value !== 'number' || value <= 0 || (pill > 0 && value >= pill)) return []
    const fromSystem = Boolean(node.boundVariables[field])
    return [{ group: 'radius', field, path: field, value, fromSystem, soft: false }]
  })
}

function effectValues(node: SceneNode): DesignValue[] {
  return node.effects.flatMap((effect, index): DesignValue[] => {
    if (!effect.visible || (effect.type !== 'DROP_SHADOW' && effect.type !== 'INNER_SHADOW'))
      return []
    const fromSystem = Boolean(node.effectStyleId)
    const value = colorToHex(effect.color)
    return [
      {
        group: 'colors',
        field: 'effects',
        path: `effects/${index}/color`,
        value,
        fromSystem,
        soft: true
      }
    ]
  })
}

/** Every value on the layer that the memory judges. A style's own layer defines the system. */
export function designValues(node: SceneNode): DesignValue[] {
  if (node.sharedStyleType) return []
  const text = node.type === 'TEXT' ? textValues(node) : []
  const fillStyled = Boolean(node.fillStyleId)
  return [
    ...paintValues(node, 'fills', fillStyled),
    ...paintValues(node, 'strokes', Boolean(node.strokeStyleId)),
    ...effectValues(node),
    ...text,
    ...layoutValues(node),
    ...radiusValues(node)
  ]
}

/** How a value is told apart from others of its group: a color as `#RRGGBB`, a font in lowercase. */
export function designValueKey(group: DesignMemoryGroup, value: string | number): string {
  return `${group}:${typeof value === 'string' ? value.toLowerCase() : value}`
}

/**
 * A value's key with whether it only warns, so a copied gradient stop or shadow color never
 * vouches for a fill of the same color.
 */
export function copiedValueKey(value: DesignValue): string {
  return `${value.soft ? 'soft:' : ''}${designValueKey(value.group, value.value)}`
}
