import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'

import type { DocumentColorSpace, Fill, GradientStop } from '@pairdraw/scene-graph'
import { colorToDocumentCSS } from '@pairdraw/scene-graph/color'
import { BLACK, TRANSPARENT } from '@pairdraw/scene-graph/constants'
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

/**
 * A non-solid fill carries no `color` at runtime even though the model types it as required,
 * because image and shader paints have no colour; the swatch treats that as no colour paint.
 */
function fillColor(fill: Fill, fallback: Color): Color {
  return (fill as { color?: Color }).color ?? fallback
}

function effectiveColor(color: Color, opacity: number): Color {
  return { ...color, a: color.a * opacity }
}

function gradientCSS(stops: GradientStop[], opacity: number, profile: DocumentColorSpace): string {
  return stops
    .map(
      (stop) =>
        `${colorToDocumentCSS(effectiveColor(stop.color, opacity), profile)} ${stop.position * 100}%`
    )
    .join(', ')
}

export function fillCategory(fill: Fill): FillCategory {
  return FILL_CATEGORY[fill.type] ?? 'SOLID'
}

export function fillIsTransparent(fill: Fill): boolean {
  if (fill.opacity < 1) return true
  if (fillCategory(fill) === 'GRADIENT')
    return (
      fill.gradientStops?.some((stop) => stop.color.a < 1) ?? fillColor(fill, TRANSPARENT).a < 1
    )
  if (fillCategory(fill) === 'MESH')
    return fill.meshPoints?.some((point) => point.color.a < 1) ?? fillColor(fill, TRANSPARENT).a < 1
  return fillColor(fill, TRANSPARENT).a < 1
}

/**
 * A fill's swatch as CSS in `profile`: a Display P3 document's stored components are written in
 * its own profile, so the swatch shows the color the canvas draws.
 */
export function fillSwatchBackground(fill: Fill, profile: DocumentColorSpace = 'srgb'): string {
  if (fillCategory(fill) === 'GRADIENT' && fill.gradientStops?.length) {
    return `linear-gradient(to right, ${gradientCSS(fill.gradientStops, fill.opacity, profile)})`
  }
  if (fillCategory(fill) === 'MESH' && fill.meshPoints?.length) {
    const stops = fill.meshPoints
      .map(
        (point, index) =>
          `${colorToDocumentCSS(effectiveColor(point.color, fill.opacity), profile)} ${(index / (fill.meshPoints?.length ?? 1)) * 100}%`
      )
      .join(', ')
    return `linear-gradient(to right, ${stops})`
  }
  return colorToDocumentCSS(effectiveColor(fillColor(fill, TRANSPARENT), fill.opacity), profile)
}

/** Fill category state and immutable conversion actions without picker or popover behavior. */
export function useFill(
  fill: Ref<Fill>,
  onUpdate: (fill: Fill) => void,
  options: { colorProfile?: MaybeRefOrGetter<DocumentColorSpace | undefined> } = {}
) {
  const category = computed(() => fillCategory(fill.value))
  const swatchBackground = computed(() =>
    fillSwatchBackground(fill.value, toValue(options.colorProfile) ?? 'srgb')
  )
  const transparent = computed(() => fillIsTransparent(fill.value))

  function toSolid() {
    if (category.value === 'SOLID') return
    const color =
      fill.value.gradientStops?.[0]?.color ??
      fill.value.meshPoints?.[0]?.color ??
      fillColor(fill.value, BLACK)
    onUpdate({ ...fill.value, type: 'SOLID', color: { ...color } })
  }

  function toGradient() {
    if (category.value === 'GRADIENT') return
    const gradientStops = fill.value.gradientStops?.length
      ? structuredClone(fill.value.gradientStops)
      : defaultGradientStops(fillColor(fill.value, BLACK))
    onUpdate({
      ...fill.value,
      type: 'GRADIENT_LINEAR',
      gradientStops,
      gradientTransform: fill.value.gradientTransform ?? { ...DEFAULT_GRADIENT_TRANSFORM }
    })
  }

  function toMesh() {
    if (category.value === 'MESH') return
    const color = fill.value.meshPoints?.[0]?.color ?? fillColor(fill.value, BLACK)
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
