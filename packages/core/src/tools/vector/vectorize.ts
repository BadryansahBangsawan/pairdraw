import * as v from 'valibot'

import { underlyingGraph } from '#core/figma-api/graph-ref'
import { defineTool, nodeIdInputSchema, nodeNotFound, toolFailure } from '#core/tools/schema'
import {
  createVectorFrameBeside,
  svgToVectorPaths,
  vectorizableImageFill
} from '#core/vector/vectorize'

/** An image to vectorize: its hash in the document and its encoded bytes. */
export interface ImageVectorizeRequest {
  imageHash: string
  bytes: Uint8Array
}

/**
 * The vectorize service a host set up, such as the app with the user's provider key. It answers
 * with SVG markup, or rejects with a message the agent can pass on to the user.
 */
export interface ImageVectorizer {
  vectorize(request: ImageVectorizeRequest): Promise<string>
}

const vectorizers = new WeakMap<object, ImageVectorizer>()

/** Lets `vectorize_image` run for the documents of `owner`, a document's graph. */
export function registerImageVectorizer(owner: object, vectorizer: ImageVectorizer): () => void {
  const target = underlyingGraph(owner)
  vectorizers.set(target, vectorizer)
  return () => {
    if (vectorizers.get(target) === vectorizer) vectorizers.delete(target)
  }
}

export function getImageVectorizer(owner: object): ImageVectorizer | undefined {
  return vectorizers.get(underlyingGraph(owner))
}

export const vectorizeImage = defineTool({
  name: 'vectorize_image',
  description:
    'Convert the image a layer shows (its topmost visible image fill, on a layer of any kind) into editable vector paths with the vectorize service the user set up in Settings. The original layer stays; the paths go in a new frame beside it, whose id is returned. It sends the image to that service with the user’s own key and can take a few minutes, so call it only when the user asks for vectors from an image.',
  execution: { kind: 'async', mutation: 'document' },
  content: 'imported',
  capabilities: ['document:write', 'network:access'],
  input: v.strictObject({
    id: v.pipe(nodeIdInputSchema, v.description('Layer whose image fill to vectorize'))
  }),
  execute: async (figma, { id }) => {
    const graph = figma.graph
    const node = graph.getNode(id)
    if (!node) return nodeNotFound(id)
    const fill = vectorizableImageFill(node)
    if (!fill) return { error: `"${node.name}" has no visible image fill to vectorize` }
    const vectorizer = getImageVectorizer(graph)
    if (!vectorizer) {
      return {
        error:
          'Vectorizing runs in the app, with the vectorize service and key set up in its Settings; it is not available here.'
      }
    }
    const bytes = graph.images.get(fill.imageHash)
    if (!bytes) return { error: `The image data of "${node.name}" is missing` }

    let svg: string
    try {
      svg = await vectorizer.vectorize({ imageHash: fill.imageHash, bytes })
    } catch (error) {
      return toolFailure(error)
    }

    // The service may outlast the layer or its image: another edit can change either meanwhile.
    const current = graph.getNode(id)
    if (!current || vectorizableImageFill(current)?.imageHash !== fill.imageHash) {
      return { error: `The image of "${node.name}" changed before vectorizing finished` }
    }
    const vectorized = svgToVectorPaths(svg, { width: current.width, height: current.height })
    if (!vectorized?.paths.length) return { error: 'The vectorize service returned no paths' }
    const frameId = createVectorFrameBeside(graph, id, vectorized)
    const frame = frameId ? graph.getNode(frameId) : undefined
    if (!frame) return { error: `Could not add the vectors beside "${current.name}"` }
    return {
      id: frame.id,
      name: frame.name,
      type: frame.type,
      source_id: id,
      paths: frame.childIds.length
    }
  }
})
