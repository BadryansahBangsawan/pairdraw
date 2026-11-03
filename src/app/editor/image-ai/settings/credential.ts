import type { KeyCredentialServices } from '@/app/settings/credentials/key-draft'

import {
  imageAICredentialStatus,
  setImageAICredential,
  type ImageAICredentialID
} from '../credentials'

export type ImageAICredentialServices = KeyCredentialServices<ImageAICredentialID>

export const imageAICredentialServices: ImageAICredentialServices = {
  status: imageAICredentialStatus,
  set: setImageAICredential
}
