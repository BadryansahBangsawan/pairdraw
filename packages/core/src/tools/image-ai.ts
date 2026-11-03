export { removeBackground, replaceBackground } from './image-ai/background'
export { generateImage, generateSVG } from './image-ai/generate'
export { canHoldImageFill, layerNameFromPrompt, orientationFor } from './image-ai/apply'
export {
  getImageAIService,
  IMAGE_AI_ORIENTATIONS,
  registerImageAIService,
  type ImageAIImage,
  type ImageAIOrientation,
  type ImageAIService
} from './image-ai/service'
