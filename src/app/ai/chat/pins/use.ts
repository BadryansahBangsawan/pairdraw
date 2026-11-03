import { computed, ref, toRaw, type Ref } from 'vue'

import { VisionModelUnavailableError } from '@/app/ai/attachment/image/analyze'
import { isAttachableImageFile } from '@/app/ai/attachment/image/prepare'

import { MAX_PINNED_REFERENCES } from './limits'
import { pinReferenceImage, type PinReferenceDependencies } from './references'
import type { ConversationPins, StyleKit } from './types'

/** Why pinning did not go through, which the pins popover explains with its fix. */
export type PinFailure = 'vision-unavailable' | 'unsupported' | 'too-many' | 'failed'

/** The part of the conversation history the pins act on. */
export interface PinsHistory {
  current: Readonly<Ref<{ id: string } | null>>
  pins: Readonly<Ref<ConversationPins>>
  readOnly: Readonly<Ref<boolean>>
  updatePins(id: string, change: (pins: ConversationPins) => ConversationPins): Promise<void>
}

/** A reference the Vision model is still describing, in the conversation it was pinned to. */
export interface PendingReference {
  id: string
  conversationId: string
  name: string
}

/** Why pinning failed, in the conversation it was pinned to. */
interface ConversationFailure {
  conversationId: string
  kind: PinFailure
}

function failureOf(error: unknown): PinFailure {
  return error instanceof VisionModelUnavailableError ? 'vision-unavailable' : 'failed'
}

/**
 * Pins a style kit and reference images to the open conversation. Each reference is described as
 * it is pinned and lands in the conversation it was pinned to, even after a switch.
 */
export function useConversationPins(history: PinsHistory, dependencies?: PinReferenceDependencies) {
  const pending = ref<PendingReference[]>([])
  const failures = ref<ConversationFailure | null>(null)
  // A pin that fails after a switch explains itself in its own conversation, not the open one.
  const failure = computed(() =>
    failures.value && failures.value.conversationId === history.current.value?.id
      ? failures.value.kind
      : null
  )
  function fail(conversationId: string, kind: PinFailure): void {
    failures.value = { conversationId, kind }
  }
  function dismissFailure(): void {
    failures.value = null
  }

  const pendingHere = computed(() =>
    pending.value.filter((entry) => entry.conversationId === history.current.value?.id)
  )
  const remaining = computed(() =>
    Math.max(
      0,
      MAX_PINNED_REFERENCES - history.pins.value.references.length - pendingHere.value.length
    )
  )
  const editable = computed(() => history.current.value !== null && !history.readOnly.value)

  async function pinOne(conversationId: string, file: File): Promise<void> {
    const entry: PendingReference = { id: crypto.randomUUID(), conversationId, name: file.name }
    pending.value = [...pending.value, entry]
    try {
      const reference = await pinReferenceImage(file, dependencies)
      await history.updatePins(conversationId, (pins) => ({
        ...pins,
        references: [...pins.references, reference].slice(0, MAX_PINNED_REFERENCES)
      }))
    } catch (error) {
      fail(conversationId, failureOf(error))
    } finally {
      pending.value = pending.value.filter((candidate) => candidate.id !== entry.id)
    }
  }

  async function addReferences(files: readonly File[]): Promise<void> {
    dismissFailure()
    const conversationId = history.current.value?.id
    if (!conversationId || !editable.value) return
    const images = files.filter(isAttachableImageFile)
    if (images.length < files.length) fail(conversationId, 'unsupported')
    const accepted = images.slice(0, remaining.value)
    if (accepted.length < images.length) fail(conversationId, 'too-many')
    await Promise.all(accepted.map((file) => pinOne(conversationId, file)))
  }

  async function change(update: (pins: ConversationPins) => ConversationPins): Promise<void> {
    dismissFailure()
    const conversationId = history.current.value?.id
    if (!conversationId || !editable.value) return
    await history.updatePins(conversationId, update).catch((error: unknown) => {
      fail(conversationId, failureOf(error))
    })
  }

  function removeReference(id: string): Promise<void> {
    return change((pins) => ({
      ...pins,
      references: pins.references.filter((reference) => reference.id !== id)
    }))
  }

  /** Pins the kit, replacing the one before, or unpins it with null. */
  function setStyleKit(kit: StyleKit | null): Promise<void> {
    // The editor's draft is reactive; what the history stores must be plain.
    const plain = kit ? structuredClone(toRaw(kit)) : null
    return change((pins) => ({ ...pins, styleKit: plain }))
  }

  return {
    pins: history.pins,
    pending: pendingHere,
    remaining,
    editable,
    failure,
    addReferences,
    removeReference,
    setStyleKit,
    dismissFailure
  }
}
