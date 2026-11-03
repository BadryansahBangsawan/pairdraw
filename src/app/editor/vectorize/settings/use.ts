import { computed, type Ref } from 'vue'

import {
  setVectorizeCredential,
  vectorizeCredentialStatus,
  vectorizeProviderID,
  VECTORIZE_PROVIDER_DEFINITIONS,
  type VectorizeProviderID
} from '@/app/editor/vectorize'
import { useKeyCredential } from '@/app/settings/credentials/key-draft'

const vectorizeServices = { status: vectorizeCredentialStatus, set: setVectorizeCredential }

export function useVectorizeSettings(
  keyDraft: Ref<string>,
  selectedProvider: Readonly<Ref<VectorizeProviderID>> = vectorizeProviderID,
  services = vectorizeServices
) {
  const credential = useKeyCredential(keyDraft, selectedProvider, services)
  const provider = computed(() =>
    VECTORIZE_PROVIDER_DEFINITIONS.find((definition) => definition.id === selectedProvider.value)
  )
  const providerOptions = VECTORIZE_PROVIDER_DEFINITIONS.map((definition) => ({
    value: definition.id,
    label: definition.name
  }))

  return { ...credential, provider, providerOptions }
}
