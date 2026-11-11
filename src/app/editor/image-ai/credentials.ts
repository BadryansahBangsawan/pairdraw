import { appCredentialServices } from '@/app/settings/credentials/app'
import { credentialRef } from '@/app/settings/credentials/reference'
import type { CredentialRef, CredentialStatus } from '@/app/settings/credentials/types'

import type { ImageAIProviderID } from './types'

/** The keys image AI uses: one per image service, and remove.bg's for background removal. */
export type ImageAICredentialID = ImageAIProviderID | 'remove-bg'

function imageAICredentialRef(id: ImageAICredentialID): CredentialRef {
  return credentialRef(id === 'remove-bg' ? 'remove-bg' : `image-ai-${id}`, 'api-key')
}

export const IMAGE_AI_CREDENTIAL_REFS = [
  imageAICredentialRef('openai'),
  imageAICredentialRef('openai-compatible'),
  imageAICredentialRef('remove-bg')
] as const

export function imageAICredentialStatus(id: ImageAICredentialID): Promise<CredentialStatus> {
  return appCredentialServices.manager.status(imageAICredentialRef(id))
}

/** Saves a key, or clears the saved one when `value` is blank. */
export async function setImageAICredential(id: ImageAICredentialID, value: string): Promise<void> {
  const reference = imageAICredentialRef(id)
  const credential = value.trim()
  if (credential) await appCredentialServices.manager.set(reference, credential)
  else await appCredentialServices.manager.clear(reference)
}

/** The saved key, read when a request starts and never kept beyond it. */
export function resolveImageAICredential(id: ImageAICredentialID): Promise<string | null> {
  return appCredentialServices.resolver.resolve(imageAICredentialRef(id))
}
