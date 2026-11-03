import { useLocalStorage } from '@vueuse/core'
import { computed } from 'vue'

import {
  BACKGROUND_SERVICE_IDS,
  IMAGE_AI_PROVIDER_IDS,
  type BackgroundServiceID,
  type ImageAIProviderID
} from './types'

/** The model asked when none is set: OpenAI's image model, which edits as well as generates. */
export const DEFAULT_IMAGE_AI_MODEL = 'gpt-image-1'

const storedProvider = useLocalStorage<string>('open-pencil:image-ai:provider', 'openai')
const storedBaseURL = useLocalStorage<string>('open-pencil:image-ai:base-url', '')
const storedModel = useLocalStorage<string>('open-pencil:image-ai:model', '')
const storedBackgroundService = useLocalStorage<string>(
  'open-pencil:image-ai:background-service',
  'image-ai'
)

function isImageAIProviderID(value: string): value is ImageAIProviderID {
  return IMAGE_AI_PROVIDER_IDS.some((id) => id === value)
}

function isBackgroundServiceID(value: string): value is BackgroundServiceID {
  return BACKGROUND_SERVICE_IDS.some((id) => id === value)
}

export const imageAIProviderID = computed<ImageAIProviderID>({
  get: () => (isImageAIProviderID(storedProvider.value) ? storedProvider.value : 'openai'),
  set: (id) => {
    storedProvider.value = id
  }
})

/** The OpenAI-compatible server's API root, such as `https://example.com/v1`. */
export const imageAIBaseURL = computed<string>({
  get: () => storedBaseURL.value,
  set: (url) => {
    storedBaseURL.value = url.trim()
  }
})

/** The model set in Settings; empty asks the default one. */
export const imageAIModel = computed<string>({
  get: () => storedModel.value,
  set: (model) => {
    storedModel.value = model.trim()
  }
})

export const backgroundServiceID = computed<BackgroundServiceID>({
  get: () =>
    isBackgroundServiceID(storedBackgroundService.value)
      ? storedBackgroundService.value
      : 'image-ai',
  set: (id) => {
    storedBackgroundService.value = id
  }
})

export function resolvedImageAIModel(model = imageAIModel.value): string {
  return model.trim() || DEFAULT_IMAGE_AI_MODEL
}
