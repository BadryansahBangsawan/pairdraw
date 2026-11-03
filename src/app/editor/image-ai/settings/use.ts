import { tryOnScopeDispose } from '@vueuse/core'
import * as v from 'valibot'
import { computed, ref, watch, type Ref } from 'vue'

import { runCredentialSave, useKeyCredential } from '@/app/settings/credentials/key-draft'
import {
  requiredSettingsURL,
  type SettingsValidationMessages
} from '@/app/settings/validation/schema'
import { useSettingsValidation } from '@/app/settings/validation/use'

import { IMAGE_AI_PROVIDER_DEFINITIONS, validateImageAIBaseURL } from '../openai'
import { imageAIBaseURL, imageAIModel, imageAIProviderID } from '../preferences'
import type { ImageAIProviderID } from '../types'
import { imageAICredentialServices } from './credential'

export interface ImageAISettingsMessages extends SettingsValidationMessages {
  /** Shown when the address is a URL the app will not send a key to, such as plain HTTP. */
  insecureBaseURL: string
}

export function isAllowedImageAIBaseURL(value: string): boolean {
  try {
    validateImageAIBaseURL(value)
    return true
  } catch {
    return false
  }
}

/**
 * The AI images form: which service, its address and model, and its key. Saving checks the
 * address, then saves the key, then the preferences; a key that cannot be saved leaves the
 * preferences as they were and the draft in place to retry.
 */
export function useImageAISettingsEditor(
  messages: Readonly<Ref<ImageAISettingsMessages>>,
  services = imageAICredentialServices
) {
  const key = ref('')
  const providerID = ref<ImageAIProviderID>(imageAIProviderID.value)
  const baseURL = ref(imageAIBaseURL.value)
  const model = ref(imageAIModel.value)
  const initial = { providerID: providerID.value, baseURL: baseURL.value, model: model.value }
  const removeKey = ref(false)
  const busy = ref(false)
  const saveError = ref('')
  const credential = useKeyCredential(key, providerID, services)
  let disposed = false
  // Read through a call: a scope can be disposed while a request awaits.
  const isDisposed = () => disposed
  tryOnScopeDispose(() => {
    disposed = true
  })

  watch(
    providerID,
    () => {
      removeKey.value = false
    },
    { flush: 'sync' }
  )

  const compatible = computed(() => providerID.value === 'openai-compatible')
  const provider = computed(() =>
    IMAGE_AI_PROVIDER_DEFINITIONS.find((definition) => definition.id === providerID.value)
  )
  const values = computed(() => ({ baseURL: compatible.value ? baseURL.value : '' }))
  const schema = computed(() =>
    v.object({
      baseURL: compatible.value
        ? v.pipe(
            requiredSettingsURL(messages.value),
            v.check(isAllowedImageAIBaseURL, messages.value.insecureBaseURL)
          )
        : v.string()
    })
  )
  const validation = useSettingsValidation(values, schema)

  const keyStatus = computed(() => (removeKey.value ? 'missing' : credential.keyStatus.value))
  const error = computed(() => saveError.value || credential.error.value)
  const dirty = computed(
    () =>
      key.value.length > 0 ||
      removeKey.value ||
      providerID.value !== initial.providerID ||
      baseURL.value !== initial.baseURL ||
      model.value !== initial.model
  )

  function clearCredential() {
    if (busy.value) return
    key.value = ''
    removeKey.value = true
  }

  async function save(): Promise<boolean> {
    if (busy.value || isDisposed()) return false
    if (!(await validation.validate()) || isDisposed()) return false
    return runCredentialSave({ busy, saveError, isDisposed }, async () => {
      const saved =
        removeKey.value && !key.value.trim()
          ? await credential.clearCredential()
          : await credential.saveCredential()
      if (!saved || isDisposed()) return false
      imageAIProviderID.value = providerID.value
      if (compatible.value) imageAIBaseURL.value = baseURL.value
      imageAIModel.value = model.value
      return true
    })
  }

  return {
    key,
    providerID,
    baseURL,
    model,
    provider,
    compatible,
    keyStatus,
    error,
    errors: validation.errors,
    blur: validation.blur,
    dirty,
    busy,
    clearCredential,
    save
  }
}
