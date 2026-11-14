import type { Editor } from '@pairdraw/core'
import { TEXT_CONTENT_VARIABLE_TYPES, variableText } from '@pairdraw/scene-graph/variables'

import { usePairdrawBindingProvider } from '#vue/controls/binding-provider/pairdraw'
import type { BindingTarget } from '#vue/controls/binding-provider/types'

/** What a variable shows as a text layer's content: text as it is, a number formatted as text. */
function resolveTextContent(editor: Editor, id: string, target?: BindingTarget) {
  return variableText(
    target
      ? editor.graph.resolveVariableForNode(target.nodeId, id)
      : editor.graph.resolveVariable(id)
  )
}

/** Binds a text layer's content to a text or number variable, as Figma's layer panel does. */
export function useTextContentBindingProvider() {
  return usePairdrawBindingProvider<string>({
    types: TEXT_CONTENT_VARIABLE_TYPES,
    resolve: resolveTextContent
  })
}
