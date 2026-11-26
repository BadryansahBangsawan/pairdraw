import { shallowReactive } from 'vue'

/** A frame the turn changed, named for the card before its images exist. */
export interface TurnFrameSummary {
  frameId: string
  pageId: string
  name: string
}

/** One narrower render of a responsive frame's after state. */
export interface TurnFrameWidth {
  width: number
  blob: Blob
}

/** A frame with the images the card shows, or the state that replaced one. */
export interface TurnFrameRenders extends TurnFrameSummary {
  /** Null when the turn created the frame. */
  before: Blob | null
  /** Null when the turn deleted the frame, or its render failed. */
  after: Blob | null
  /** Narrower renders of the after state; a width the frame clamped is left out. */
  widths: TurnFrameWidth[]
  created: boolean
  deleted: boolean
}

export type TurnRenders =
  | { status: 'rendering'; frames: TurnFrameSummary[]; changed: number }
  | { status: 'ready'; frames: TurnFrameRenders[]; changed: number }
  | { status: 'cleared' | 'unavailable'; frames: TurnFrameSummary[]; changed: number }

/** A document that owns turn cards and can say when it closes; the editor store satisfies it. */
export interface TurnOwner {
  onDispose(listener: () => void): () => void
}

interface TurnRecord {
  /** The document that owns the card, compared by identity when it closes. */
  owner: TurnOwner
  renders: TurnRenders
}

/** Cards kept in memory at once; older ones are freed for the newest, oldest first. */
const MAX_LIVE_RECORDS = 8

const records = shallowReactive(new Map<string, TurnRecord>())
const freeListeners = new Set<(messageId: string) => void>()

/** Owners already subscribed to their own dispose, so a closed document frees its cards. */
const disposeSubscribed = new WeakSet<TurnOwner>()

/** A card can be set for a document no render queue ever subscribed for, so subscribe here too. */
function freeCardsOnDispose(owner: TurnOwner): void {
  if (disposeSubscribed.has(owner)) return
  disposeSubscribed.add(owner)
  owner.onDispose(() => freeTurnRendersOf(owner))
}

/** Reactive in a computed or template: the map tracks reads by key. */
export function readTurnRenders(messageId: string): TurnRenders | null {
  return records.get(messageId)?.renders ?? null
}

/** Calls `listener` whenever a record is freed, so its queued renders can be dropped. */
export function onTurnRendersFreed(listener: (messageId: string) => void): () => void {
  freeListeners.add(listener)
  return () => freeListeners.delete(listener)
}

/** Frees a record's images; its card hides. */
export function freeTurnRenders(messageId: string): void {
  if (!records.delete(messageId)) return
  for (const listener of freeListeners) listener(messageId)
}

export function setTurnRenders(owner: TurnOwner, messageId: string, renders: TurnRenders): void {
  freeCardsOnDispose(owner)
  records.set(messageId, { owner, renders })
  while (records.size > MAX_LIVE_RECORDS) {
    const oldest = records.keys().next().value
    if (oldest === undefined) break
    freeTurnRenders(oldest)
  }
}

/** Frees every record the document owns, as it closes; another document's cards stay. */
export function freeTurnRendersOf(owner: TurnOwner): void {
  for (const [messageId, record] of records) {
    if (record.owner === owner) freeTurnRenders(messageId)
  }
}

/** Replaces a card's images with its cleared state once it has been off screen long enough. */
export function clearTurnRenders(messageId: string): void {
  const record = records.get(messageId)
  if (record?.renders.status !== 'ready') return
  const { frames, changed } = record.renders
  const summaries = frames.map(({ frameId, pageId, name }) => ({ frameId, pageId, name }))
  freeTurnRenders(messageId)
  setTurnRenders(record.owner, messageId, { status: 'cleared', frames: summaries, changed })
}
