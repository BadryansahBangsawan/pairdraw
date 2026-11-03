import { params } from '@nanostores/i18n'

import { i18n } from '#vue/i18n/create'

export const mediaMessageDefaults = {
  vectorization: 'Image vectorization',
  vectorizationDescription:
    'Send image layers to Recraft, fal.ai, or QuiverAI and return editable vectors. Provider charges may apply.',
  vectorizeProvider: 'Vectorization service',
  pexelsAPIKey: 'Pexels API Key (stock photos)',
  unsplashAccessKey: 'Unsplash Access Key',
  stockPhotoToolOptional: 'Optional — for stock_photo tool',
  pexelsAlternativeOptional: 'Optional — alternative to Pexels',
  getPexelsAPIKey: 'Get free Pexels API key →',
  getUnsplashAccessKey: 'Get free Unsplash access key →',
  photoKeyWorks: params('{service} accepted this key.'),
  photoKeyRejected: params('{service} refused this key. Check that you copied all of it.'),
  unsplashKeyRejected:
    'Unsplash refused this key. Paste your app’s Access Key, not its Secret key.',
  photoKeyRateLimited: params(
    'This key has used up its {service} requests for this hour. Try again later.'
  ),
  photoKeyUnreachable: params('Couldn’t reach {service}. Check your network connection.'),
  photoKeyCheckFailed: params('{service} didn’t answer the test. Try again later.'),
  imageAI: 'AI images',
  imageAIDescription:
    'Generate images, and remove or replace their backgrounds, with OpenAI or an OpenAI-compatible service and your own key. Provider charges may apply.',
  imageAIProvider: 'Image service',
  imageAIProviderCompatible: 'OpenAI-compatible',
  imageAIBaseURL: 'Base URL',
  imageAIBaseURLHint: 'The root of the service’s OpenAI-style API, such as https://example.com/v1.',
  imageAIBaseURLInsecure: 'Use an HTTPS address, or HTTP only to localhost.',
  imageAIModel: 'Model',
  imageAIModelHint: params('Leave empty to use {model}.'),
  backgroundRemoval: 'Background removal',
  backgroundRemovalDescription:
    'Remove the background of image layers with the AI image service or remove.bg. Provider charges may apply.',
  backgroundService: 'Background service',
  backgroundServiceImageAI: 'AI image service',
  svgGenerationNote: 'Generate SVG uses this service too.',
  aiImage: 'AI image',
  removeBackground: 'Remove background',
  replaceBackground: 'Replace background…',
  generateImageFill: 'Generate image fill…',
  generateImage: 'Generate image…',
  generateSVG: 'Generate SVG…',
  replaceBackgroundTitle: 'Replace background',
  generateImageFillTitle: 'Generate image fill',
  generateImageTitle: 'Generate image',
  generateSVGTitle: 'Generate SVG',
  imagePrompt: 'Prompt',
  replaceBackgroundPlaceholder: 'A sunny beach at golden hour',
  generateImagePlaceholder: 'A ceramic coffee cup on a wooden table, soft daylight',
  generateSVGPlaceholder: 'A minimal rocket icon with rounded shapes',
  imageOrientation: 'Shape',
  imageOrientationSquare: 'Square',
  imageOrientationLandscape: 'Landscape',
  imageOrientationPortrait: 'Portrait',
  transparentBackground: 'Transparent background',
  generate: 'Generate',
  replace: 'Replace',
  imageAIPromptNote: params('Your prompt is sent to {service} with your own key.')
} as const

export const mediaMessages = i18n('media', mediaMessageDefaults)
