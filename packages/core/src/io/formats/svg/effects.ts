import type { Effect, SceneNode, ShaderEffect } from '@pairdraw/scene-graph'

import { nextDefId, type SVGExportContext } from './defs'
import { FilterBuilder, floodColor } from './filter'
import { noiseFilter, textureFilter } from './grain'
import { svg, type SVGNode } from './node'
import { round } from './paths'

/** The effects SVG can draw, which have no shader source. */
type DrawnEffect = Exclude<Effect, ShaderEffect>

/**
 * A filter region that holds what every visible effect draws, in the layer's own coordinates. A
 * texture moves the layer's edges by its radius, and a shadow reaches by its blur and spread.
 */
function filterRegion(node: SceneNode, id: string, effects: readonly DrawnEffect[]) {
  let reach = 0
  for (const effect of effects) {
    if (effect.type === 'NOISE') continue
    if (effect.type === 'TEXTURE') {
      reach = Math.max(reach, effect.radius)
      continue
    }
    const offset = Math.max(Math.abs(effect.offset.x), Math.abs(effect.offset.y))
    reach = Math.max(reach, effect.radius + effect.spread + offset)
  }
  return {
    id,
    x: round(-reach),
    y: round(-reach),
    width: round(node.width + reach * 2),
    height: round(node.height + reach * 2),
    filterUnits: 'userSpaceOnUse',
    'color-interpolation-filters': 'sRGB'
  }
}

/**
 * The filter for a layer's visible effects, `null` when it has none SVG can draw. Shadows and
 * layer blurs come first, then a texture roughens the result and noise grains it, as Figma's SVG
 * export orders them. Shader effects cannot be drawn as filters and are left out.
 */
export function createFilterDef(
  node: SceneNode,
  ctx: SVGExportContext
): { id: string; node: SVGNode } | null {
  const visible = node.effects.filter(
    (effect): effect is DrawnEffect => effect.visible && effect.type !== 'SHADER'
  )
  if (visible.length === 0) return null

  const id = nextDefId(ctx, 'fx')
  const filter = new FilterBuilder(id, ctx)
  let shape = 'SourceGraphic'

  for (const effect of visible) {
    if (effect.type === 'DROP_SHADOW') {
      const dropped = filter.result('dropShadow')
      filter.push('feDropShadow', {
        in: shape,
        dx: round(effect.offset.x),
        dy: round(effect.offset.y),
        stdDeviation: round(effect.radius / 2),
        'flood-color': floodColor(effect.color, ctx.colorSpace),
        'flood-opacity': round(effect.color.a),
        result: dropped
      })
      shape = dropped
      continue
    }
    if (effect.type === 'INNER_SHADOW') {
      const blur = filter.result('innerBlur')
      const offset = filter.result('innerOffset')
      const inverted = filter.result('innerInverse')
      const shadow = filter.result('innerShadow')
      const composited = filter.result('innerComposited')
      filter.push('feGaussianBlur', {
        in: shape,
        stdDeviation: round(effect.radius / 2),
        result: blur
      })
      filter.push('feOffset', {
        in: blur,
        dx: round(effect.offset.x),
        dy: round(effect.offset.y),
        result: offset
      })
      filter.push('feComposite', { in: shape, in2: offset, operator: 'out', result: inverted })
      filter.push('feFlood', {
        'flood-color': floodColor(effect.color, ctx.colorSpace),
        'flood-opacity': round(effect.color.a),
        result: shadow
      })
      filter.push('feComposite', {
        in: shadow,
        in2: inverted,
        operator: 'in',
        result: `${shadow}Masked`
      })
      filter.push('feComposite', {
        in: `${shadow}Masked`,
        in2: shape,
        operator: 'over',
        result: composited
      })
      shape = composited
      continue
    }
    if (effect.type === 'TEXTURE') {
      shape = textureFilter(filter, effect, shape)
      continue
    }
    if (effect.type === 'NOISE') {
      shape = noiseFilter(filter, effect, shape)
      continue
    }
    if (effect.radius <= 0) continue
    const blurred = filter.result('layerBlur')
    filter.push('feGaussianBlur', {
      in: shape,
      stdDeviation: round(effect.radius / 2),
      result: blurred
    })
    shape = blurred
  }

  return {
    id,
    node: svg('filter', filterRegion(node, id, visible), ...filter.primitives)
  }
}
