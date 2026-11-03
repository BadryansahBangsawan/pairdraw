import { tryOnScopeDispose } from '@vueuse/core'
import { computed, ref, watch, type Ref } from 'vue'

import { findModelConnectionForDraft, resolveModelConnectionAPIKey } from '@/app/ai/models'
import type { AIModelProfileDraft } from '@/app/ai/models'
import { parseBedrockCredential, type BedrockAuthKind } from '@/app/ai/providers/bedrock/credential'
import { isVertexClaudeModel } from '@/app/ai/providers/vertex/adapter'
import { parseVertexCredential, type VertexCredential } from '@/app/ai/providers/vertex/credential'
import { parseVertexBaseURL } from '@/app/ai/providers/vertex/endpoint'

type PlatformDraft = Pick<
  AIModelProfileDraft,
  'providerID' | 'modelID' | 'customModelID' | 'customBaseURL'
>

export type VertexCredentialKind = VertexCredential['kind']

/** The credential saved for the connection this draft would use, or `null` without one. */
async function savedCredential(draft: AIModelProfileDraft): Promise<string | null> {
  const connection = findModelConnectionForDraft(draft)
  return connection ? resolveModelConnectionAPIKey(connection.id) : null
}

/**
 * How a saved Bedrock connection signs in, so its form opens on the same choice; `null` when
 * nothing is saved. Only the kind leaves this function, never the credential.
 */
export async function savedBedrockAuthKind(
  draft: AIModelProfileDraft
): Promise<BedrockAuthKind | null> {
  if (draft.providerID !== 'amazon-bedrock') return null
  const credential = await savedCredential(draft)
  return credential ? parseBedrockCredential(credential).kind : null
}

/** Whether a saved Vertex AI connection holds an access token or an API key; never the value. */
export async function savedVertexCredentialKind(
  draft: AIModelProfileDraft
): Promise<VertexCredentialKind | null> {
  if (draft.providerID !== 'google-vertex') return null
  const credential = await savedCredential(draft)
  return credential ? parseVertexCredential(credential).kind : null
}

/** Whether the draft runs a Claude model on Vertex AI, which needs a project and access token. */
export function isVertexClaudeDraft(draft: PlatformDraft): boolean {
  if (draft.providerID !== 'google-vertex') return false
  return isVertexClaudeModel(draft.customModelID.trim() || draft.modelID)
}

/** Claude on Vertex AI runs only in a project; Gemini can use express mode without one. */
export function vertexNeedsProject(draft: PlatformDraft): boolean {
  return isVertexClaudeDraft(draft) && !parseVertexBaseURL(draft.customBaseURL).project
}

/**
 * The kind of credential a Vertex AI model would sign in with: the one being entered, else the
 * saved one, or `''` while there is none. A Claude model refuses an API key with it.
 */
export function useVertexCredentialKind(
  draft: AIModelProfileDraft,
  keyInput: Readonly<Ref<string>>,
  hasExistingKey: Readonly<Ref<boolean>>
): Readonly<Ref<VertexCredentialKind | ''>> {
  const saved = ref<VertexCredentialKind | null>(null)
  let request = 0
  tryOnScopeDispose(() => request++)
  watch(
    () => [draft.providerID, draft.customBaseURL, hasExistingKey.value] as const,
    async ([providerID, , existing]) => {
      const current = ++request
      const kind =
        providerID === 'google-vertex' && existing
          ? await savedVertexCredentialKind(draft).catch(() => null)
          : null
      if (current === request) saved.value = kind
    },
    { immediate: true }
  )
  return computed(() => {
    if (draft.providerID !== 'google-vertex') return ''
    const entered = keyInput.value.trim()
    if (entered) return parseVertexCredential(entered).kind
    return hasExistingKey.value ? (saved.value ?? '') : ''
  })
}
