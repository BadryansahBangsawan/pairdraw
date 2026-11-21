import { tryOnScopeDispose } from '@vueuse/core'
import { ref, watch, type Ref } from 'vue'

import { settingsErrorMessage } from '@/app/settings/credentials/errors'
import type { CredentialStatus } from '@/app/settings/credentials/types'

/** Reads and writes the saved key of one service among several, chosen by `ID`. */
export interface KeyCredentialServices<ID> {
  status: (id: ID) => Promise<CredentialStatus>
  set: (id: ID, value: string) => Promise<void>
}

/**
 * Whether the key of the chosen service is saved, and saving or clearing the one typed. Answers
 * for a service chosen before another never land, and a save that finishes after the person typed
 * on keeps what they typed.
 */
export function useKeyCredential<ID>(
  keyDraft: Ref<string>,
  credentialID: Readonly<Ref<ID>>,
  services: KeyCredentialServices<ID>
) {
  const keyStatus = ref<CredentialStatus>('missing')
  const error = ref('')
  let version = 0
  let disposed = false
  // Read through a call: a scope can be disposed while a request awaits.
  const isDisposed = () => disposed

  tryOnScopeDispose(() => {
    disposed = true
    version++
    keyDraft.value = ''
  })

  function failure(cause: unknown): string {
    return settingsErrorMessage(cause)
  }

  async function refreshStatus(): Promise<void> {
    const request = ++version
    try {
      const status = await services.status(credentialID.value)
      if (!isDisposed() && version === request) keyStatus.value = status
    } catch (cause) {
      if (!isDisposed() && version === request) error.value = failure(cause)
    }
  }

  /** Saves the typed key, or clears the saved one; true when nothing is left to save. */
  async function update(clear: boolean): Promise<boolean> {
    const value = keyDraft.value
    if (isDisposed()) return false
    if (!clear && !value.trim()) return true
    const request = ++version
    error.value = ''
    try {
      await services.set(credentialID.value, clear ? '' : value)
      if (isDisposed() || version !== request) return false
      if (keyDraft.value === value) keyDraft.value = ''
      await refreshStatus()
      return !isDisposed()
    } catch (cause) {
      if (!isDisposed() && version === request) error.value = failure(cause)
      return false
    }
  }

  watch(
    credentialID,
    () => {
      keyDraft.value = ''
      keyStatus.value = 'missing'
      error.value = ''
      void refreshStatus()
    },
    { immediate: true, flush: 'sync' }
  )

  return {
    keyStatus,
    error,
    saveCredential: () => update(false),
    clearCredential: () => update(true)
  }
}

/** What a settings form's save reports while it runs and when it fails. */
export interface CredentialSaveState {
  busy: Ref<boolean>
  saveError: Ref<string>
  /** Whether the form went away, after which nothing it shows changes. */
  isDisposed: () => boolean
}

/**
 * Runs one save of a form holding a key at a time: `busy` while it runs and its error in
 * `saveError`. True when `action` saved and the form is still there.
 */
export async function runCredentialSave(
  { busy, saveError, isDisposed }: CredentialSaveState,
  action: () => Promise<boolean>
): Promise<boolean> {
  if (busy.value || isDisposed()) return false
  busy.value = true
  saveError.value = ''
  try {
    return (await action()) && !isDisposed()
  } catch (cause) {
    if (!isDisposed()) saveError.value = settingsErrorMessage(cause)
    return false
  } finally {
    busy.value = false
  }
}
