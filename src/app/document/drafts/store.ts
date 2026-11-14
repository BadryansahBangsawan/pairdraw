import { createEventHook } from '@vueuse/core'
import * as v from 'valibot'

import type { DocumentWorkspaceSource } from '@pairdraw/vue/document/workspace'

import { appRuntimeConfig } from '@/app/runtime/config'
import {
  getLocalCanvasStore,
  isLocalCanvasStoreMemoryFallback,
  type LocalCanvasMeta
} from '@/app/storage/local-store'
import { figThumbnail } from '@/app/storage/sync/persist'
import { IS_BROWSER } from '@/constants'

/**
 * The provider drafts are kept under in the local canvas store. No storage provider has this ID,
 * so no storage location lists a draft and the sync engine never uploads one.
 */
export const DRAFT_PROVIDER_ID = 'draft'

/** A draft as Home lists it. */
export type DraftMeta = Pick<LocalCanvasMeta, 'id' | 'name' | 'updatedAt' | 'hasThumb'> & {
  byteLength: number
}

export type DraftWriteInput = { id: string; name: string; figBytes: Uint8Array }

/** Other windows of the app on this device, which hear of each draft written or deleted. */
const DRAFTS_CHANNEL = 'pairdraw:drafts'

const draftChangeSchema = v.object({ id: v.string() })

/** The draft that was written or deleted. */
export type DraftChange = v.InferOutput<typeof draftChangeSchema>

const changed = createEventHook<DraftChange>()
let channel: BroadcastChannel | null = null

function draftsChannel(): BroadcastChannel | null {
  if (channel || typeof BroadcastChannel === 'undefined') return channel
  channel = new BroadcastChannel(DRAFTS_CHANNEL)
  channel.addEventListener('message', (event: MessageEvent<unknown>) => {
    const change = v.safeParse(draftChangeSchema, event.data)
    if (change.success) void changed.trigger(change.output)
  })
  return channel
}

function announce(change: DraftChange): void {
  void changed.trigger(change)
  draftsChannel()?.postMessage(change)
}

/**
 * Calls back whenever a draft is written or deleted, here or in another window, as Home's Drafts
 * list follows them.
 */
export function onDraftsChanged(listener: (change: DraftChange) => void) {
  draftsChannel()
  return changed.on(listener)
}

/**
 * Whether new documents keep their changes as drafts here: only where the local store lasts
 * beyond this session, since a draft that a reload loses would lose the work it stood for.
 */
export function draftsAvailable(): boolean {
  if (!IS_BROWSER || !appRuntimeConfig.drafts || typeof indexedDB === 'undefined') return false
  getLocalCanvasStore()
  return !isLocalCanvasStoreMemoryFallback()
}

function toDraftMeta(meta: LocalCanvasMeta): DraftMeta {
  return {
    id: meta.id,
    name: meta.name,
    updatedAt: meta.updatedAt,
    hasThumb: meta.hasThumb,
    byteLength: meta.figSize ?? 0
  }
}

function isDraft(meta: LocalCanvasMeta | null): meta is LocalCanvasMeta {
  return meta?.providerId === DRAFT_PROVIDER_ID && !meta.tombstoned && meta.hasFig
}

/** This device's drafts, most recently changed first. */
export async function listDrafts(): Promise<DraftMeta[]> {
  const metas = await getLocalCanvasStore().listMetas()
  return metas.filter(isDraft).map(toDraftMeta)
}

/** A draft's `.fig` bytes and name, or null when it is gone. */
export async function readDraft(
  id: string
): Promise<(DraftMeta & { figBytes: Uint8Array }) | null> {
  const store = getLocalCanvasStore()
  const meta = await store.getMeta(id)
  if (!isDraft(meta)) return null
  const figBytes = await store.readFig(id)
  return figBytes ? { ...toDraftMeta(meta), figBytes } : null
}

async function readDraftThumbnail(id: string): Promise<Uint8Array | null> {
  const store = getLocalCanvasStore()
  return isDraft(await store.getMeta(id)) ? store.readThumb(id) : null
}

/**
 * Keeps a document's bytes as its draft, with the preview the `.fig` carries. Drafts stay
 * `pending`: cache eviction only drops copies a provider also holds, and a draft has no other copy.
 */
export async function writeDraft(input: DraftWriteInput): Promise<DraftMeta> {
  const meta = await getLocalCanvasStore().writeCanvas({
    id: input.id,
    providerId: DRAFT_PROVIDER_ID,
    name: input.name || 'Untitled',
    figBytes: input.figBytes,
    thumbBytes: await figThumbnail(input.figBytes),
    syncStatus: 'pending'
  })
  announce({ id: input.id })
  return toDraftMeta(meta)
}

/** Whether the draft is still kept; another window may have deleted it. */
export async function draftExists(id: string): Promise<boolean> {
  return isDraft(await getLocalCanvasStore().getMeta(id))
}

/** Notes that the draft was opened, as Home's Recent notes a file. */
export async function touchDraft(id: string): Promise<void> {
  const store = getLocalCanvasStore()
  if (!isDraft(await store.getMeta(id))) return
  await store.updateMeta(id, { lastOpenedAt: new Date().toISOString() })
}

/** Deletes a draft for good; a draft lives only on this device. */
export async function deleteDraft(id: string): Promise<void> {
  const store = getLocalCanvasStore()
  if ((await store.getMeta(id))?.providerId !== DRAFT_PROVIDER_ID) return
  await store.remove(id)
  announce({ id })
}

/** This device's drafts as Home's Drafts list loads and follows them. */
export const draftsWorkspaceSource: DocumentWorkspaceSource<DraftMeta> = {
  refresh: listDrafts,
  loadPreview: readDraftThumbnail,
  subscribe: (listener) => onDraftsChanged(() => listener()).off
}
