import { afterEach, expect, test } from 'bun:test'

import { effectScope, ref } from 'vue'

import {
  backgroundServiceID,
  imageAIBaseURL,
  imageAIModel,
  imageAIProviderID
} from '@/app/editor/image-ai/preferences'
import { useBackgroundSettingsEditor } from '@/app/editor/image-ai/settings/background'
import type { ImageAICredentialServices } from '@/app/editor/image-ai/settings/credential'
import { useImageAISettingsEditor } from '@/app/editor/image-ai/settings/use'

const messages = ref({
  requiredField: 'Required',
  invalidURL: 'Invalid URL',
  insecureBaseURL: 'Use HTTPS'
})

function credentialServices(saved: string[], fail = false): ImageAICredentialServices {
  return {
    status: async () => 'missing',
    set: async (id, value) => {
      if (fail) throw new Error('Credential store unavailable')
      saved.push(`${id}=${value}`)
    }
  }
}

function inScope<T>(run: () => T) {
  const scope = effectScope()
  const value = scope.run(run)
  if (!value) throw new Error('Missing scope')
  return { value, stop: () => scope.stop() }
}

afterEach(() => {
  imageAIProviderID.value = 'openai'
  imageAIBaseURL.value = ''
  imageAIModel.value = ''
  backgroundServiceID.value = 'image-ai'
})

test('a compatible service needs an HTTPS address before anything is saved', async () => {
  const saved: string[] = []
  const { value: editor, stop } = inScope(() =>
    useImageAISettingsEditor(messages, credentialServices(saved))
  )
  try {
    editor.providerID.value = 'openai-compatible'
    editor.baseURL.value = 'http://images.example.com/v1'
    editor.key.value = 'sk-compatible'
    expect(await editor.save()).toBe(false)
    expect(editor.errors.value.baseURL).toBe('Use HTTPS')
    expect(saved).toEqual([])
    expect(imageAIProviderID.value).toBe('openai')

    editor.baseURL.value = 'https://images.example.com/v1'
    editor.model.value = 'flux-dev'
    expect(await editor.save()).toBe(true)
    expect(saved).toEqual(['openai-compatible=sk-compatible'])
    expect(imageAIProviderID.value).toBe('openai-compatible')
    expect(imageAIBaseURL.value).toBe('https://images.example.com/v1')
    expect(imageAIModel.value).toBe('flux-dev')
  } finally {
    stop()
  }
})

test('a key that cannot be saved keeps the preferences and the draft for a retry', async () => {
  const { value: editor, stop } = inScope(() =>
    useImageAISettingsEditor(messages, credentialServices([], true))
  )
  try {
    editor.model.value = 'gpt-image-1-mini'
    editor.key.value = 'sk-new'
    expect(await editor.save()).toBe(false)
    expect(editor.error.value).toBe('Credential store unavailable')
    expect(editor.key.value).toBe('sk-new')
    expect(imageAIModel.value).toBe('')
  } finally {
    stop()
  }
})

test('background removal saves the remove.bg key and the choice of service', async () => {
  const saved: string[] = []
  const { value: editor, stop } = inScope(() =>
    useBackgroundSettingsEditor(credentialServices(saved))
  )
  try {
    editor.serviceID.value = 'remove-bg'
    editor.key.value = 'rbg-key'
    expect(editor.dirty.value).toBe(true)
    expect(await editor.save()).toBe(true)
    expect(saved).toEqual(['remove-bg=rbg-key'])
    expect(backgroundServiceID.value).toBe('remove-bg')
  } finally {
    stop()
  }
})

test('a remove.bg key typed and then switched away from is never saved', async () => {
  const saved: string[] = []
  const { value: editor, stop } = inScope(() =>
    useBackgroundSettingsEditor(credentialServices(saved))
  )
  try {
    editor.serviceID.value = 'remove-bg'
    editor.key.value = 'rbg-key'
    editor.serviceID.value = 'image-ai'
    expect(editor.key.value).toBe('')
    expect(await editor.save()).toBe(true)
    expect(saved).toEqual([])
    expect(backgroundServiceID.value).toBe('image-ai')
  } finally {
    stop()
  }
})
