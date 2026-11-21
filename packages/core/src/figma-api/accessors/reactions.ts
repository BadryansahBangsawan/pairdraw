import type { PrototypeReaction } from '@pairdraw/scene-graph'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'

import type { NodeProxyInternals, ProxyThis } from '#core/figma-api/accessor-utils'
import { graph, raw, updateNode } from '#core/figma-api/accessor-utils'
import { parseFigmaReactions, toFigmaReaction, type FigmaReaction } from '#core/figma-api/reactions'

/**
 * `reactions` on every layer, in Figma's plugin shape. Pairdraw keeps them on the layer's
 * `prototypeReactions`; a write goes through the same validation as the tool, so a trigger,
 * action, transition, navigation or destination the play cannot show is refused.
 */
export function installReactionAccessors(prototype: object, internals: NodeProxyInternals): void {
  Object.defineProperties(prototype, {
    reactions: {
      get(this: ProxyThis): readonly FigmaReaction[] {
        return Object.freeze(raw(this, internals).prototypeReactions.map(toFigmaReaction))
      },
      set(this: ProxyThis, value: readonly FigmaReaction[]) {
        const node = raw(this, internals)
        const sceneGraph = graph(this, internals)
        const pageId = sceneGraph.pageOf(node.id) ?? ''
        const previous: readonly PrototypeReaction[] = node.prototypeReactions
        updateNode(this, internals, {
          prototypeReactions: parseFigmaReactions(value, {
            graph: sceneGraph,
            nodeId: node.id,
            pageId,
            previous,
            inherited:
              node.type === 'INSTANCE'
                ? instanceMainComponent(sceneGraph, node)?.prototypeReactions
                : undefined
          })
        })
      }
    }
  })
}
