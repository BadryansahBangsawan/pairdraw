import type { Effect, SceneGraph, SceneNode, ShadowEffect } from '@pairdraw/scene-graph'

export function expectDefined<T>(value: T | null | undefined, label = 'value'): NonNullable<T> {
  if (value == null) {
    throw new Error(`${label} was expected to be defined`)
  }
  return value
}

export function getNodeOrThrow(graph: SceneGraph, id: string): SceneNode {
  return expectDefined(graph.getNode(id), `node ${id}`)
}

export function childIdAt(node: SceneNode, index: number): string {
  return expectDefined(node.childIds[index], `child ${index} of ${node.id}`)
}

/** A script-visible node's fills, failing when they read `figma.mixed`, as differently filled text does. */
export function expectFills<T>(fills: readonly T[] | symbol, label = 'fills'): readonly T[] {
  if (typeof fills === 'symbol')
    throw new Error(`${label} were expected to be one value, not mixed`)
  return fills
}

/**
 * The shadow effect at `index`, failing when a shader effect sits there instead: a test that reads
 * a shadow's radius or offset means a layer it expects to cast one.
 */
export function shadowEffectAt(effects: readonly Effect[], index = 0): ShadowEffect {
  const effect = expectDefined(effects[index], `effect ${index}`)
  if (effect.type === 'SHADER' || effect.type === 'NOISE' || effect.type === 'TEXTURE')
    throw new Error(`effect ${index} was expected to be a shadow`)
  return effect
}
