import type { BindingProvider, BindingTarget } from '#vue/controls/binding-provider/types'

/**
 * Creates one variable from the field's value and binds every target the field edits to it, as
 * picking a variable does: each selected layer, and each path a field such as a uniform corner
 * radius sets.
 */
export function createBindingForTargets<V>(
  provider: BindingProvider<V>,
  targets: readonly BindingTarget[],
  value: V,
  name: string
): void {
  const first = targets.at(0)
  if (!first || !provider.create) return
  provider.create(first, value, name)
  const variableId = provider.getBindingId(first)
  if (!variableId) return
  for (const target of targets.slice(1)) provider.bind(target, variableId)
}
