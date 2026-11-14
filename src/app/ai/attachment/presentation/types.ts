import type { SceneNode } from '@pairdraw/scene-graph'
import type { Vector } from '@pairdraw/scene-graph/primitives'

import type { ImageAttachmentMediaType } from '@/app/ai/attachment/image/types'

export interface AttachmentBase {
  id: string
  messageId: string
  kind: 'image' | 'node' | 'file'
  name: string
  preview: Blob
}

export interface ImagePresentation extends AttachmentBase {
  kind: 'image'
  mediaType: ImageAttachmentMediaType
  originalSize: Vector
}

export interface NodePresentation extends AttachmentBase {
  kind: 'node'
  nodeId: string
  nodeType: SceneNode['type']
  originalSize: Vector
}

/** A text file attached to the message; its preview holds the text. */
export interface FilePresentation extends AttachmentBase {
  kind: 'file'
  mediaType: string
  /** Bytes, as the file had them. */
  size: number
}

export type AttachmentPresentation = ImagePresentation | NodePresentation | FilePresentation
