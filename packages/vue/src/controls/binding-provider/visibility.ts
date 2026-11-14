import type { Editor } from '@pairdraw/core'
import { VISIBILITY_VARIABLE_TYPES, variableTruthy } from '@pairdraw/scene-graph/variables'

import { usePairdrawBindingProvider } from '#vue/controls/binding-provider/pairdraw'
import type { BindingTarget } from '#vue/controls/binding-provider/types'

/** Whether a variable shows the layer: a boolean as it is, text unless it reads as false. */
function resolveVisibility(editor: Editor, id: string, target?: BindingTarget) {
  return variableTruthy(
    target
      ? editor.graph.resolveVariableForNode(target.nodeId, id)
      : editor.graph.resolveVariable(id)
  )
}

/** Binds a layer's visibility to a boolean or text variable, as Figma's layer panel does. */
export function useVisibilityBindingProvider() {
  return usePairdrawBindingProvider<boolean>({
    types: VISIBILITY_VARIABLE_TYPES,
    resolve: resolveVisibility
  })
}
