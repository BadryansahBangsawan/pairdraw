import { tryOnScopeDispose } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

import { useKeyCredential } from '@/app/settings/credentials/key-draft'

import type { ImageAICredentialID } from '../credentials'
import { backgroundServiceID } from '../preferences'
import type { BackgroundServiceID } from '../types'
import { imageAICredentialServices } from './credential'

/**
 * The background removal form: the AI image service, which needs nothing more here, or
 * remove.bg with its own key. Saving saves the key first, then the choice; a key typed for
 * remove.bg is dropped when the form switches away from it, so it is never saved unseen.
 */
export function useBackgroundSettingsEditor(services = imageAICredentialServices) {
  const key = ref('')
  const serviceID = ref<BackgroundServiceID>(backgroundServiceID.value)
  const initialService = serviceID.value
  const removeKey = ref(false)
  const busy = ref(false)
  const removeBgID = computed<ImageAICredentialID>(() => 'remove-bg')
  const credential = useKeyCredential(key, removeBgID, services)
  let disposed = false
  // Read through a call: a scope can be disposed while a request awaits.
  const isDisposed = () => disposed
  tryOnScopeDispose(() => {
    disposed = true
  })

  const usesRemoveBg = computed(() => serviceID.value === 'remove-bg')
  watch(
    serviceID,
    (id) => {
      if (id === 'remove-bg') return
      key.value = ''
      removeKey.value = false
    },
    { flush: 'sync' }
  )
  const keyStatus = computed(() => (removeKey.value ? 'missing' : credential.keyStatus.value))
  const dirty = computed(
    () => key.value.length > 0 || removeKey.value || serviceID.value !== initialService
  )

  function clearCredential() {
    if (busy.value) return
    key.value = ''
    removeKey.value = true
  }

  async function save(): Promise<boolean> {
    if (busy.value || isDisposed()) return false
    busy.value = true
    try {
      if (usesRemoveBg.value) {
        const saved =
          removeKey.value && !key.value.trim()
            ? await credential.clearCredential()
            : await credential.saveCredential()
        if (!saved || isDisposed()) return false
      }
      backgroundServiceID.value = serviceID.value
      return true
    } finally {
      busy.value = false
    }
  }

  return {
    key,
    serviceID,
    usesRemoveBg,
    keyStatus,
    error: credential.error,
    dirty,
    busy,
    clearCredential,
    save
  }
}
