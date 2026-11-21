import type {
  Effect,
  OverflowDirection,
  SceneNode,
  ShaderEffect,
  Stroke
} from '@pairdraw/scene-graph'
import { newStrokeGeometry } from '@pairdraw/scene-graph/node-defaults'
import { independentCornerChanges } from '@pairdraw/scene-graph/variables'

import {
  graph,
  raw,
  strokeOwner,
  updateNode,
  type NodeProxyInternals,
  type ProxyThis
} from '#core/figma-api/accessor-utils'
import { parseFigmaEffects, toFigmaEffect, type FigmaEffect } from '#core/figma-api/effects'
import { finiteNumber } from '#core/figma-api/finite'
import { parseFigmaPaints, toFigmaPaint, type FigmaPaint } from '#core/figma-api/paints'
import { getTextStyle } from '#core/figma-api/text/style'
import { paintBindings, setPaintBindings } from '#core/figma-api/variables/bindings'
import { textStyleChanges } from '#core/text/character-style'

const OVERFLOW_DIRECTIONS: readonly OverflowDirection[] = ['NONE', 'HORIZONTAL', 'VERTICAL', 'BOTH']

/** `value` as a frame's overflow scrolling, refused in the words Figma's plugin API uses. */
function checkedOverflowDirection(value: unknown): OverflowDirection {
  const direction = OVERFLOW_DIRECTIONS.find((candidate) => candidate === value)
  if (direction) return direction
  const expected = OVERFLOW_DIRECTIONS.map((candidate) => `'${candidate}'`).join(' | ')
  throw new Error(
    `in set_overflowDirection: Property "overflowDirection" failed validation: Invalid enum value. Expected ${expected}, received '${String(value)}'`
  )
}

function styleReference(
  internals: NodeProxyInternals,
  field: 'fillStyleId' | 'strokeStyleId' | 'effectStyleId' | 'gridStyleId',
  mixed: symbol
): PropertyDescriptor {
  return {
    get(this: ProxyThis): string | symbol {
      const node = raw(this, internals)
      // Characters of a text can each use a fill style of their own.
      if (field === 'fillStyleId' && node.type === 'TEXT') {
        return getTextStyle(node, 'fillStyleId', mixed) as string | symbol
      }
      return node[field] ?? ''
    },
    set(this: ProxyThis, value: string) {
      const node = raw(this, internals)
      const changes = { [field]: value || null }
      updateNode(
        this,
        internals,
        field === 'fillStyleId' && node.type === 'TEXT' ? textStyleChanges(node, changes) : changes
      )
    }
  }
}

/**
 * `node`'s fills as Figma's plugin API reads them, each carrying the variable it is bound to. A
 * bound paint reads as it stores its color and opacity, which its variable writes into it when it
 * binds and whenever the color it gives the layer changes, as in Figma.
 */
export function figmaFills(node: SceneNode): FigmaPaint[] {
  const bound = paintBindings(node, 'fills')
  return node.fills.map((fill, index) => toFigmaPaint(fill, bound.get(index)))
}

/** `node`'s strokes as Figma's plugin API reads them, as {@link figmaFills} reads fills. */
export function figmaStrokes(node: SceneNode): FigmaPaint[] {
  const bound = paintBindings(node, 'strokes')
  return node.strokes.map((stroke, index) => toFigmaPaint(stroke, bound.get(index)))
}

export function installVisualNodeProxyAccessors(
  prototype: object,
  internals: NodeProxyInternals,
  mixed: symbol
): void {
  Object.defineProperties(prototype, {
    fills: {
      // Text reads mixed while its characters are filled differently, and setting it fills them all.
      get(this: ProxyThis): readonly FigmaPaint[] | symbol {
        const node = raw(this, internals)
        if (node.type !== 'TEXT') return Object.freeze(figmaFills(node))
        const fills = getTextStyle(node, 'fills', mixed)
        // Text styles read for scripts already give Figma's paints.
        return typeof fills === 'symbol' ? fills : Object.freeze(fills as FigmaPaint[])
      },
      set(this: ProxyThis, value: readonly FigmaPaint[]) {
        const node = raw(this, internals)
        const fills = parseFigmaPaints(value)
        updateNode(
          this,
          internals,
          node.type === 'TEXT' ? textStyleChanges(node, { fills }) : { fills }
        )
        setPaintBindings(graph(this, internals), raw(this, internals), 'fills', value)
      }
    },
    strokes: {
      get(this: ProxyThis): readonly FigmaPaint[] {
        const owner = raw(strokeOwner(this, internals), internals)
        return Object.freeze(figmaStrokes(owner))
      },
      // Figma paints carry no geometry; a stroke takes the node's weight and alignment, which
      // outlast its strokes.
      set(this: ProxyThis, value: readonly FigmaPaint[]) {
        const owner = strokeOwner(this, internals)
        const geometry = newStrokeGeometry(raw(owner, internals))
        const strokes = parseFigmaPaints(value, 'set_strokes', 'strokes').map((paint): Stroke => ({
          ...paint,
          weight: geometry.weight,
          align: geometry.align
        }))
        const kept = newStrokeGeometry({
          strokes,
          strokeWeight: geometry.weight,
          strokeAlign: geometry.align
        })
        updateNode(owner, internals, {
          strokes,
          strokeWeight: kept.weight,
          strokeAlign: kept.align
        })
        setPaintBindings(graph(this, internals), raw(owner, internals), 'strokes', value)
      }
    },
    effects: {
      get(this: ProxyThis): readonly FigmaEffect[] {
        // A shader effect has no Figma plugin-API form yet (`UNSUPPORTED_EFFECT_TYPES`).
        return Object.freeze(
          raw(this, internals)
            .effects.filter(
              (effect): effect is Exclude<Effect, ShaderEffect> => effect.type !== 'SHADER'
            )
            .map(toFigmaEffect)
        )
      },
      set(this: ProxyThis, value: readonly FigmaEffect[]) {
        updateNode(this, internals, { effects: parseFigmaEffects(value) })
      }
    },
    // Applied shared styles, as Figma exposes them; an assignment inside an instance is an override.
    fillStyleId: styleReference(internals, 'fillStyleId', mixed),
    strokeStyleId: styleReference(internals, 'strokeStyleId', mixed),
    effectStyleId: styleReference(internals, 'effectStyleId', mixed),
    gridStyleId: styleReference(internals, 'gridStyleId', mixed),
    opacity: {
      get(this: ProxyThis): number {
        return raw(this, internals).opacity
      },
      set(this: ProxyThis, value: unknown) {
        updateNode(this, internals, { opacity: finiteNumber(value, 'opacity') })
      }
    },
    visible: {
      get(this: ProxyThis): boolean {
        return raw(this, internals).visible
      },
      set(this: ProxyThis, value: boolean) {
        updateNode(this, internals, { visible: value })
      }
    },
    locked: {
      get(this: ProxyThis): boolean {
        return raw(this, internals).locked
      },
      set(this: ProxyThis, value: boolean) {
        updateNode(this, internals, { locked: value })
      }
    },
    blendMode: {
      get(this: ProxyThis): string {
        return raw(this, internals).blendMode
      },
      set(this: ProxyThis, value: string) {
        updateNode(this, internals, { blendMode: value as SceneNode['blendMode'] })
      }
    },
    clipsContent: {
      get(this: ProxyThis): boolean {
        return raw(this, internals).clipsContent
      },
      set(this: ProxyThis, value: boolean) {
        updateNode(this, internals, { clipsContent: value })
      }
    },
    overflowDirection: {
      get(this: ProxyThis): OverflowDirection {
        return raw(this, internals).overflowDirection
      },
      set(this: ProxyThis, value: unknown) {
        const node = raw(this, internals)
        // Only a frame-like layer scrolls in play, and only its record carries the field.
        if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') {
          throw new Error(
            `in set_overflowDirection: Only a frame, component or instance scrolls; ${node.type} "${node.name}" cannot`
          )
        }
        updateNode(this, internals, { overflowDirection: checkedOverflowDirection(value) })
      }
    },
    cornerRadius: {
      get(this: ProxyThis): number | symbol {
        const node = raw(this, internals)
        if (!node.independentCorners) return node.cornerRadius
        // Corners set or bound one by one read as one radius while they agree, as in Figma.
        const { topLeftRadius, topRightRadius, bottomLeftRadius, bottomRightRadius } = node
        const agree = [topRightRadius, bottomLeftRadius, bottomRightRadius].every(
          (radius) => radius === topLeftRadius
        )
        return agree ? topLeftRadius : mixed
      },
      set(this: ProxyThis, value: unknown) {
        if (value === mixed) return
        const radius = finiteNumber(value, 'cornerRadius')
        updateNode(this, internals, {
          cornerRadius: radius,
          topLeftRadius: radius,
          topRightRadius: radius,
          bottomRightRadius: radius,
          bottomLeftRadius: radius,
          independentCorners: false
        })
      }
    },
    topLeftRadius: cornerAccessor(internals, 'topLeftRadius'),
    topRightRadius: cornerAccessor(internals, 'topRightRadius'),
    bottomLeftRadius: cornerAccessor(internals, 'bottomLeftRadius'),
    bottomRightRadius: cornerAccessor(internals, 'bottomRightRadius'),
    cornerSmoothing: {
      get(this: ProxyThis): number {
        return raw(this, internals).cornerSmoothing
      },
      set(this: ProxyThis, value: unknown) {
        updateNode(this, internals, { cornerSmoothing: finiteNumber(value, 'cornerSmoothing') })
      }
    }
  })
}

function cornerAccessor(
  internals: NodeProxyInternals,
  field: 'topLeftRadius' | 'topRightRadius' | 'bottomLeftRadius' | 'bottomRightRadius'
): PropertyDescriptor {
  return {
    get(this: ProxyThis): number {
      return raw(this, internals)[field]
    },
    set(this: ProxyThis, value: unknown) {
      updateNode(this, internals, {
        ...independentCornerChanges(raw(this, internals)),
        [field]: finiteNumber(value, field)
      })
    }
  }
}
