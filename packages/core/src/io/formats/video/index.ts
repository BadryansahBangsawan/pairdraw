export { crossfade, dim, drawOver, filledImage } from './composite'
export { createGIFSink, MAX_GIF_FPS } from './gif'
export {
  VIDEO_FORMATS,
  VIDEO_MIME_TYPES,
  type VideoFormat,
  type VideoSink,
  type VideoSinkOptions
} from './sink'
export { recordPrototype, type RecordOptions, type RecordResult, type RenderFrame } from './record'
export { MAX_VIDEO_BYTES, MAX_VIDEO_EDGE, videoSize } from './size'
export { canRecordVideo, createWebCodecsSink, type EncodedVideoFormat } from './webcodecs'
export {
  canRecordFormat,
  openVideoSink,
  recordableFormats,
  type VideoHostEncoder,
  VIDEO_FORMAT_LABELS,
  VideoFormatError
} from './formats'
export {
  DEFAULT_VIDEO_TAIL_MS,
  exportedFrameRenderer,
  MAX_GIF_EDGE,
  planPrototypeVideo,
  recordPrototypeVideo,
  VIDEO_DEFAULTS,
  type PrototypeVideoOptions,
  type PrototypeVideoPlan
} from './plan'
