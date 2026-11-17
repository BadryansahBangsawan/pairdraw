import type { Vector } from './primitives'
import type { Effect, ShadowEffect } from './types'

const SHADOW_OFFSET: Vector = { x: 0, y: 4 }
const BLUR_OFFSET: Vector = { x: 0, y: 0 }

function fallbackOffset(type: ShadowEffect['type']): Vector {
  return type === 'DROP_SHADOW' || type === 'INNER_SHADOW' ? SHADOW_OFFSET : BLUR_OFFSET
}

function component(offset: object, key: 'x' | 'y', fallback: number): number {
  if (!(key in offset)) return fallback
  const value: unknown = Reflect.get(offset, key)
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** A new offset when `effect.offset` is missing or not finite; null when it can stay. */
function finiteOffset(effect: ShadowEffect): Vector | null {
  const fallback = fallbackOffset(effect.type)
  const offset: unknown = effect.offset
  if (offset === null || typeof offset !== 'object') return { x: fallback.x, y: fallback.y }
  const x = component(offset, 'x', fallback.x)
  const y = component(offset, 'y', fallback.y)
  if (Reflect.get(offset, 'x') === x && Reflect.get(offset, 'y') === y) return null
  return { x, y }
}

function withFiniteOffset(effect: ShadowEffect): Effect {
  const offset = finiteOffset(effect)
  return offset ? { ...effect, offset } : effect
}

/**
 * Shadows and blurs keep a finite offset. A drop or inner shadow missing one uses `{x: 0, y: 4}`,
 * the same default as `dropShadow()` and `set_effects`; a blur uses `{x: 0, y: 0}`. Shader effects
 * are left alone. An array that is already valid is returned as itself.
 */
export function normalizeEffects(effects: Effect[]): Effect[] {
  let next: Effect[] | null = null
  for (const [index, effect] of effects.entries()) {
    const normalized = effect.type === 'SHADER' ? effect : withFiniteOffset(effect)
    if (normalized === effect) {
      next?.push(effect)
      continue
    }
    next ??= effects.slice(0, index)
    next.push(normalized)
  }
  return next ?? effects
}
