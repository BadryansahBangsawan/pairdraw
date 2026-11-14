import type { SceneGraph } from '@pairdraw/scene-graph'

export interface RPCCommand<A = unknown, R = unknown> {
  name: string
  execute: (graph: SceneGraph, args: A) => R | Promise<R>
}
