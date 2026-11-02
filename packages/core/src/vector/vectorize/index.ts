export { createVectorFrameBeside, VECTORIZE_RESULT_GAP } from './beside'
export { vectorizableImageFill, type VectorizableImageFill } from './image'
export {
  createVectorFrameChildren,
  resolveVectorFramePlacement,
  type VectorFramePlacement
} from './placement'
export {
  preprocessForVectorize,
  type GetCanvasKit,
  type PreprocessForVectorizeResult
} from './preprocess'
export { svgToVectorPaths, type SVGVectorizeResult, type VectorizedPath } from './svg/to-vectors'
