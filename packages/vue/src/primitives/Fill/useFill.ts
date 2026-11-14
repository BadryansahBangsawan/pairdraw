import { computed } from 'vue'
import type { Ref } from 'vue'

import type { Fill, GradientStop } from '@pairdraw/scene-graph'
import { colorToCSS } from '@pairdraw/scene-graph/color'
import {
  DEFAULT_GRADIENT_TRANSFORM,
  defaultGradientStops,
  defaultMeshPoints
} from '@pairdraw/scene-graph/gradient'
import type { Color } from '@pairdraw/scene-graph/primitives'

import type { FillCategory } from './types'

const FILL_CATEGORY: Partial<Record<Fill['type'], FillCategory>> = {
  SOLID: 'SOLID',
  GRADIENT_LINEAR: 'GRADIENT',
  GRADIENT_RADIAL: 'GRADIENT',
  GRADIENT_ANGULAR: 'GRADIENT',
  GRADIENT_DIAMOND: 'GRADIENT',
  MESH: 'MESH',
  IMAGE: 'IMAGE'
}

function effectiveColor(color: Color, opacity: number): Color {
  return { ...color, a: color.a * opacity }
}

function gradientCSS(stops: GradientStop[], opacity: number): string {
  return stops
    .map((stop) => `${colorToCSS(effectiveColor(stop.color, opacity))} ${stop.position * 100}%`)
    .join(', ')
}

export function fillCategory(fill: Fill): FillCategory {
  return FILL_CATEGORY[fill.type] ?? 'SOLID'
}

export function fillIsTransparent(fill: Fill): boolean {
  if (fill.opacity < 1) return true
  if (fillCategory(fill) === 'GRADIENT')
    return fill.gradientStops?.some((stop) => stop.color.a < 1) ?? fill.color.a < 1
  if (fillCategory(fill) === 'MESH')
    return fill.meshPoints?.some((point) => point.color.a < 1) ?? fill.color.a < 1
  return fill.color.a < 1
}

export function fillSwatchBackground(fill: Fill): string {
  if (fillCategory(fill) === 'GRADIENT' && fill.gradientStops?.length) {
    return `linear-gradient(to right, ${gradientCSS(fill.gradientStops, fill.opacity)})`
  }
  if (fillCategory(fill) === 'MESH' && fill.meshPoints?.length) {
    const stops = fill.meshPoints
      .map(
        (point, index) =>
          `${colorToCSS(effectiveColor(point.color, fill.opacity))} ${(index / (fill.meshPoints?.length ?? 1)) * 100}%`
      )
      .join(', ')
    return `linear-gradient(to right, ${stops})`
  }
  return colorToCSS(effectiveColor(fill.color, fill.opacity))
}

/** Fill category state and immutable conversion actions without picker or popover behavior. */
export function useFill(fill: Ref<Fill>, onUpdate: (fill: Fill) => void) {
  const category = computed(() => fillCategory(fill.value))
  const swatchBackground = computed(() => fillSwatchBackground(fill.value))
  const transparent = computed(() => fillIsTransparent(fill.value))

  function toSolid() {
    if (category.value === 'SOLID') return
    const color =
      fill.value.gradientStops?.[0]?.color ?? fill.value.meshPoints?.[0]?.color ?? fill.value.color
    onUpdate({ ...fill.value, type: 'SOLID', color: { ...color } })
  }

  function toGradient() {
    if (category.value === 'GRADIENT') return
    const gradientStops = fill.value.gradientStops?.length
      ? structuredClone(fill.value.gradientStops)
      : defaultGradientStops(fill.value.color)
    onUpdate({
      ...fill.value,
      type: 'GRADIENT_LINEAR',
      gradientStops,
      gradientTransform: fill.value.gradientTransform ?? { ...DEFAULT_GRADIENT_TRANSFORM }
    })
  }

  function toMesh() {
    if (category.value === 'MESH') return
    const color = fill.value.meshPoints?.[0]?.color ?? fill.value.color
    onUpdate({
      ...fill.value,
      type: 'MESH',
      meshColumns: 1,
      meshRows: 1,
      meshPoints: defaultMeshPoints(color)
    })
  }

  function toImage() {
    if (category.value === 'IMAGE') return
    onUpdate({ ...fill.value, type: 'IMAGE' })
  }

  const actions = { toSolid, toGradient, toMesh, toImage }

  return {
    category,
    swatchBackground,
    transparent,
    actions,
    toSolid,
    toGradient,
    toMesh,
    toImage
  }
}
