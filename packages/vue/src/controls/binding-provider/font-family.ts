import type { Editor } from '@pairdraw/core'
import { variableFontFamily } from '@pairdraw/scene-graph/variables'

import { usePairdrawBindingProvider } from '#vue/controls/binding-provider/pairdraw'
import type { BindingTarget } from '#vue/controls/binding-provider/types'

/** The family a variable names for a text layer: its text, trimmed; empty text names none. */
function resolveFontFamily(editor: Editor, id: string, target?: BindingTarget) {
  return variableFontFamily(
    target
      ? editor.graph.resolveVariableForNode(target.nodeId, id)
      : editor.graph.resolveVariable(id)
  )
}

/**
 * Binds a text layer's font family to a text variable, as Figma's typography panel does. The
 * editor loads the family a variable names whenever the variable or its mode changes it.
 */
export function useFontFamilyBindingProvider() {
  return usePairdrawBindingProvider<string>({
    types: ['STRING'],
    resolve: resolveFontFamily
  })
}
