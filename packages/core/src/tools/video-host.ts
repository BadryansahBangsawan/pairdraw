import { underlyingGraph } from '#core/figma-api/graph-ref'
import type { VideoHostEncoder } from '#core/io/formats/video'

const encoders = new WeakMap<object, VideoHostEncoder>()

/**
 * Lets `export_video` encode, for the documents of `owner` (a document's graph), the formats
 * WebCodecs cannot encode in that host, as the CLI does with ffmpeg. The app needs none.
 */
export function registerVideoEncoder(owner: object, encoder: VideoHostEncoder): () => void {
  const target = underlyingGraph(owner)
  encoders.set(target, encoder)
  return () => {
    if (encoders.get(target) === encoder) encoders.delete(target)
  }
}

export function getVideoEncoder(owner: object): VideoHostEncoder | undefined {
  return encoders.get(underlyingGraph(owner))
}
