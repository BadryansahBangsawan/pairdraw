import { isEqual } from 'es-toolkit/predicate'
import { basename, dirname, isAbsolute, relative, resolve } from 'pathe'
import { shallowRef, triggerRef, type ShallowRef } from 'vue'

import type {
  DesignTokenBundle,
  TokenDrift,
  TokenSourceLink,
  TokenSyncChoice
} from '@pairdraw/core/io/formats/design-tokens'
import { TOKEN_UNIT_PROPERTY, type TokenStylesheetIssue } from '@pairdraw/dom-css/export'
import type { TokenUnit } from '@pairdraw/scene-graph'
import { randomHex } from '@pairdraw/scene-graph/random'
import { readTokenSources, type TokenSource } from '@pairdraw/scene-graph/token-sources'

import { downloadBlob } from '@/app/document/io/browser'
import { isFileWriteRefused } from '@/app/document/io/capability'
import { createFileWatcher } from '@/app/document/io/watch/watcher'
import type { EditorStore } from '@/app/editor/active-store'
import { markTokenCSSLinked } from '@/app/editor/tokens/follow'
import {
  forgetTokenSourceLocation,
  readTokenSourceLocation,
  tokenSourceLocationKey,
  writeTokenSourceLocation
} from '@/app/editor/tokens/locations'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'
import { IS_TAURI } from '@/constants'

/** Files a CSS variables import reads. */
export const TOKEN_CSS_FILE_ACCEPT = '.css'

/**
 * The stylesheet a document's variables sync with: a path on desktop, a file handle where the
 * browser grants one, or only the text that was picked, which a push saves as a download.
 */
export interface TokenCSSLink {
  /** The id the document records the link under. */
  id: string
  name: string
  path?: string
  handle?: FileSystemFileHandle
  /** The text last read or written, which a push without a file to write patches. */
  text: string
  /** Whether a change to the file pulls it into the document. */
  watching: boolean
}

/** Whether a link can be read again and written back, which pulling and watching need. */
export function isWritableLink(link: TokenCSSLink): boolean {
  return Boolean(link.path ?? link.handle)
}

interface LinkState {
  link: ShallowRef<TokenCSSLink | null>
  stopWatching: (() => void) | null
  /** Counts watch starts, so one that finishes after a newer start or a stop is undone. */
  watchGeneration: number
  lastWrite: number
  /** The stylesheet as last read for the drift view, compared again on each ask. */
  tracking: { key: string; drift: () => TokenDrift[] } | null
}

const states = new WeakMap<EditorStore, LinkState>()

function stateOf(store: EditorStore): LinkState {
  let state = states.get(store)
  if (!state) {
    state = {
      link: shallowRef<TokenCSSLink | null>(null),
      stopWatching: null,
      watchGeneration: 0,
      lastWrite: 0,
      tracking: null
    }
    states.set(store, state)
  }
  return state
}

/** The stylesheet this document syncs with, for as long as it is open. */
export function tokenCSSLink(store: EditorStore): ShallowRef<TokenCSSLink | null> {
  return stateOf(store).link
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

function newLinkId(): string {
  return randomHex(12)
}

/** Picks a stylesheet through the desktop or browser file picker; null when neither has one. */
export async function pickTokenCSSFile(): Promise<TokenCSSLink | null | 'cancelled'> {
  if (IS_TAURI) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const path = await open({ filters: [{ name: 'CSS', extensions: ['css'] }], multiple: false })
    if (typeof path !== 'string') return 'cancelled'
    const { readFile } = await import('@tauri-apps/plugin-fs')
    return {
      id: newLinkId(),
      name: basename(path),
      path,
      text: decode(await readFile(path)),
      watching: false
    }
  }
  if (!window.showOpenFilePicker) return null
  try {
    const handles = await window.showOpenFilePicker({
      multiple: false,
      types: [{ description: 'CSS', accept: { 'text/css': ['.css'] } }]
    })
    const handle = handles.at(0)
    if (!handle) return 'cancelled'
    const file = await handle.getFile()
    return { id: newLinkId(), name: file.name, handle, text: await file.text(), watching: false }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled'
    throw error
  }
}

/** A stylesheet picked through a file input, which the browser lets the app read but not write. */
export async function linkFromFile(file: File): Promise<TokenCSSLink> {
  return { id: newLinkId(), name: file.name, text: await file.text(), watching: false }
}

/**
 * Follows a stylesheet while the document is open, replacing and unwatching any earlier one. The
 * document records the link once it is synced, through `recordTokenCSSLink`.
 */
export function setTokenCSSLink(store: EditorStore, link: TokenCSSLink | null): void {
  const state = stateOf(store)
  stopWatching(state)
  state.link.value = link
  if (link) markTokenCSSLinked(store)
}

function locationKey(store: EditorStore, linkId: string): string {
  return tokenSourceLocationKey(store.graph.rootId, linkId)
}

/** Where the file is on this computer, kept by the app so the document never holds it. */
async function rememberLocation(store: EditorStore, link: TokenCSSLink): Promise<void> {
  if (!link.path && !link.handle) return
  await writeTokenSourceLocation({
    key: locationKey(store, link.id),
    path: link.path,
    handle: link.handle,
    watching: link.watching
  })
}

/** The link as the document records it: its path from the document's folder, or none. */
function documentLink(store: EditorStore, link: TokenCSSLink): TokenSourceLink {
  const documentPath = store.getDocumentFilePath()
  const path = link.path && documentPath ? relative(dirname(documentPath), link.path) : undefined
  return {
    id: link.id,
    kind: 'css',
    name: link.name,
    ...(path && !isAbsolute(path) ? { path } : {})
  }
}

function stopWatching(state: LinkState) {
  state.watchGeneration++
  state.stopWatching?.()
  state.stopWatching = null
}

/** The linked stylesheet as it is on disk now. */
async function readLink(link: TokenCSSLink): Promise<string> {
  if (link.path && IS_TAURI) {
    const { readFile } = await import('@tauri-apps/plugin-fs')
    return decode(await readFile(link.path))
  }
  if (link.handle) return (await link.handle.getFile()).text()
  return link.text
}

/**
 * What a CSS expression comes to, computed by the browser on a hidden probe that holds every
 * custom property in scope, so a chain of `var()`s resolves as it does on a page.
 */
function resolveExpression(
  css: string,
  unit: TokenUnit,
  tokens: ReadonlyMap<string, string>
): number | undefined {
  if (unit === '%' || typeof document === 'undefined') return undefined
  const probe = document.createElement('div')
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  for (const [name, value] of tokens) probe.style.setProperty(name, value)
  const property = TOKEN_UNIT_PROPERTY[unit]
  probe.style.setProperty(property, css)
  document.body.append(probe)
  try {
    const number = Number.parseFloat(getComputedStyle(probe).getPropertyValue(property))
    if (!Number.isFinite(number)) return undefined
    // Durations compute in seconds; the token holds milliseconds unless its unit is seconds.
    return property === 'transition-duration' && unit === 'ms' ? number * 1000 : number
  } finally {
    probe.remove()
  }
}

/** The stylesheet's custom properties as a token import the document can preview. */
export async function readTokenCSS(
  store: EditorStore,
  link: TokenCSSLink
): Promise<DesignTokenBundle> {
  const { readCSSDesignTokens } = await import('@pairdraw/core/io/formats/design-tokens')
  return readCSSDesignTokens(store.graph, link.text, { file: link.name, resolveExpression })
}

/** Reads the linked stylesheet again, as a pull does before it shows what changed. */
async function refreshTokenCSSLink(store: EditorStore): Promise<TokenCSSLink | null> {
  const state = stateOf(store)
  const link = state.link.value
  if (!link) return null
  link.text = await readLink(link)
  triggerRef(state.link)
  return link
}

/** What a sync with the stylesheet did, and what it left for a person to decide. */
export interface TokenCSSResync {
  /** Tokens changed only in code, or new in code, that were brought in. */
  applied: number
  /** Tokens changed on the canvas, on both sides, or gone from code. */
  review: TokenDrift[]
}

/**
 * Brings in what changed only in the stylesheet since the last sync, and tokens new in it, as
 * one undo step, and records the link with what the code holds now. Values changed on the canvas
 * are never overwritten: they and conflicts are returned for review.
 */
async function syncLink(
  store: EditorStore,
  link: TokenCSSLink,
  choose?: (drift: TokenDrift) => TokenSyncChoice | undefined
): Promise<TokenCSSResync> {
  const { planTokenSync, syncedTokenSources } =
    await import('@pairdraw/core/io/formats/design-tokens')
  const bundles = [await readTokenCSS(store, link)]
  const recorded = readTokenSources(store.graph).find((source) => source.id === link.id)
  const sync = planTokenSync(store.graph, bundles, recorded)
  const resolution = sync.resolve(choose)
  const linked = documentLink(store, link)
  const record = (graph: typeof store.graph) =>
    syncedTokenSources(graph, linked, bundles, resolution)
  // Nothing to bring in can still move the snapshot on: a value changed alike in both places, a
  // push, or a side picked in review. Without that, the next change in code would look like a
  // conflict.
  if (resolution.applied > 0 || !recorded || movesSnapshot(record(store.graph), recorded))
    store.syncDesignTokens(resolution.plans, record)
  return { applied: resolution.applied, review: resolution.undecided }
}

/** Whether recording the link now would change what it says the code held. */
function movesSnapshot(sources: readonly TokenSource[], recorded: TokenSource): boolean {
  const next = sources.find((source) => source.id === recorded.id)
  return (
    !next ||
    !isEqual(next.snapshot, recorded.snapshot) ||
    !isEqual(next.names ?? {}, recorded.names ?? {})
  )
}

/** Names a token's drift across syncs: by variable and mode, or by name where it is new. */
export function tokenDriftKey(drift: TokenDrift): string {
  const variable = drift.variableId ?? `${drift.collection}/${drift.variable}`
  return `${variable}:${drift.modeId ?? drift.mode ?? ''}`
}

/** How the linked stylesheet differs from the variables now, or null without a link. */
/**
 * What the drift view depends on besides values: the link and its text, what the document
 * recorded at the last sync, and which variables, collections, and modes exist.
 */
function trackingKey(store: EditorStore, link: TokenCSSLink, recorded: TokenSource | undefined) {
  const { graph } = store
  let modes = 0
  for (const collection of graph.getLiveCollections()) modes += collection.modes.length
  return [
    graph.rootId,
    link.id,
    link.text,
    recorded?.syncedAt ?? '',
    graph.variables.size,
    graph.variableCollections.size,
    modes
  ].join('\n')
}

/**
 * How the linked stylesheet differs from the variables now, or null without a link. The file is
 * read and planned again only when it or the variables' structure changed, or when `reread`
 * asks; an edit to a value only compares the values that changed since the last ask.
 */
export async function tokenCSSDrift(
  store: EditorStore,
  options: { reread?: boolean } = {}
): Promise<TokenDrift[] | null> {
  const state = stateOf(store)
  const link = state.link.value
  if (!link) return null
  const recorded = readTokenSources(store.graph).find((source) => source.id === link.id)
  const key = trackingKey(store, link, recorded)
  if (options.reread || state.tracking?.key !== key) {
    const { trackTokenDrift } = await import('@pairdraw/core/io/formats/design-tokens')
    const bundle = await readTokenCSS(store, link)
    state.tracking = { key, drift: trackTokenDrift(store.graph, [bundle], recorded) }
  }
  return state.tracking.drift()
}

/**
 * Syncs with the linked stylesheet as last read, taking the side a person picked for each token
 * by `tokenDriftKey`. It plans again first, so a change made while they chose is not lost.
 */
export async function applyTokenCSSReview(
  store: EditorStore,
  choices: ReadonlyMap<string, TokenSyncChoice>
): Promise<TokenCSSResync | null> {
  const link = stateOf(store).link.value
  if (!link) return null
  return syncLink(store, link, (drift) => choices.get(tokenDriftKey(drift)))
}

/** Records the linked stylesheet on the document, as synced now, and remembers where it is. */
export async function recordTokenCSSLink(store: EditorStore): Promise<void> {
  const link = stateOf(store).link.value
  if (!link) return
  await rememberLocation(store, link)
  await syncLink(store, link)
}

/** Reads the linked stylesheet again and syncs with it; null without a link. */
export async function resyncTokenCSS(store: EditorStore): Promise<TokenCSSResync | null> {
  const link = await refreshTokenCSSLink(store)
  return link ? syncLink(store, link) : null
}

/** Forgets the linked stylesheet, on the document and on this computer; variables stay. */
export function unlinkTokenCSS(store: EditorStore): void {
  const link = stateOf(store).link.value
  setTokenCSSLink(store, null)
  if (!link) return
  store.unlinkTokenSource(link.id)
  void forgetTokenSourceLocation(locationKey(store, link.id))
}

/** Whether the browser still lets the app read a handle it granted before, without asking. */
async function canRead(handle: FileSystemFileHandle): Promise<boolean> {
  try {
    return (await handle.queryPermission?.({ mode: 'read' })) !== 'prompt'
  } catch {
    return false
  }
}

/** The recorded stylesheet read from where this computer keeps it, or found next to the document. */
async function locate(store: EditorStore, id: string, name: string): Promise<TokenCSSLink | null> {
  const recorded = readTokenSources(store.graph).find((source) => source.id === id)
  const location = await readTokenSourceLocation(locationKey(store, id))
  const documentPath = store.getDocumentFilePath()
  const near =
    recorded?.path && documentPath ? resolve(dirname(documentPath), recorded.path) : undefined
  const path = location?.path ?? near
  const watching = location?.watching ?? false
  if (path && IS_TAURI) {
    const { readFile } = await import('@tauri-apps/plugin-fs')
    return { id, name, path, text: decode(await readFile(path)), watching }
  }
  const handle = location?.handle
  if (handle && (await canRead(handle))) {
    return { id, name, handle, text: await (await handle.getFile()).text(), watching }
  }
  return null
}

/**
 * Follows the stylesheet the document recorded again, once it is opened: from where this computer
 * keeps it, or from its path next to the document, and watched if it was. A browser that would
 * have to ask for the file again leaves it unlinked until it is picked.
 */
export async function restoreTokenCSSLink(store: EditorStore): Promise<void> {
  const state = stateOf(store)
  const source = readTokenSources(store.graph).find((entry) => entry.kind === 'css')
  if (state.link.value || !source) return
  const link = await locate(store, source.id, source.name).catch(() => null)
  // Something was linked while the file was being read; that link stays.
  if (!link || stateOf(store).link.value) return
  setTokenCSSLink(store, link)
  if (link.watching) await watchTokenCSS(store, true)
}

export interface TokenCSSPush {
  updated: number
  added: number
  /** Whether the file was written in place; otherwise the browser saved a copy. */
  inPlace: boolean
  /** Variables the stylesheet could not hold. */
  issues: TokenStylesheetIssue[]
}

async function writeLink(state: LinkState, link: TokenCSSLink, css: string): Promise<boolean> {
  state.lastWrite = Date.now()
  if (link.path && IS_TAURI) {
    const { writeFile } = await import('@tauri-apps/plugin-fs')
    await writeFile(link.path, new TextEncoder().encode(css))
    return true
  }
  if (link.handle) {
    try {
      const writable = await link.handle.createWritable()
      await writable.write(css)
      await writable.close()
      return true
    } catch (error) {
      if (!isFileWriteRefused(error)) throw error
    }
  }
  downloadBlob(new TextEncoder().encode(css), link.name, 'text/css')
  return false
}

/**
 * Writes the document's variables into the linked stylesheet in place, keeping everything else in
 * it, from the file as it is on disk now. Nothing is written when it already matches.
 */
export async function pushTokenCSS(store: EditorStore): Promise<TokenCSSPush | null> {
  const state = stateOf(store)
  const link = state.link.value
  if (!link) return null
  const { syncTokenStylesheet } = await import('@pairdraw/core/io/formats/design-tokens')
  const source = await readLink(link)
  const result = await syncTokenStylesheet(store.graph, source)
  const { issues } = result
  if (result.updated === 0 && result.added === 0) {
    await syncLink(store, link)
    return { updated: 0, added: 0, inPlace: true, issues }
  }
  const inPlace = await writeLink(state, link, result.css)
  link.text = result.css
  triggerRef(state.link)
  // The file now holds the canvas's values, so the link records them as what the code holds.
  if (inPlace) await syncLink(store, link)
  return { updated: result.updated, added: result.added, inPlace, issues }
}

function reportFailure(error: unknown) {
  toast.error(
    notificationMessages
      .get()
      .operationFailed({ error: error instanceof Error ? error.message : String(error) })
  )
}

/**
 * Pulls the linked stylesheet whenever it changes on disk, apart from the document's own pushes,
 * until the link changes or the document closes. Desktop watches the path; Chromium polls the
 * file handle it granted.
 */
export async function watchTokenCSS(store: EditorStore, watching: boolean): Promise<void> {
  const state = stateOf(store)
  const link = state.link.value
  stopWatching(state)
  if (!link) return
  link.watching = watching && isWritableLink(link)
  triggerRef(state.link)
  await rememberLocation(store, link)
  if (!link.watching) return
  const generation = state.watchGeneration
  const watcher = createFileWatcher({
    getFilePath: () => link.path ?? null,
    getFileHandle: () => link.handle ?? null,
    getLastWriteTime: () => state.lastWrite,
    onDiskChange: () => void pullChanged(store, link)
  })
  state.stopWatching = watcher.stopWatchingFile
  await watcher.startWatchingFile()
  // Watching was switched off, or restarted, while the watch was starting.
  if (state.watchGeneration !== generation) watcher.stopWatchingFile()
}

async function pullChanged(store: EditorStore, link: TokenCSSLink): Promise<void> {
  const state = stateOf(store)
  if (state.link.value !== link || !link.watching) return
  // A closed document keeps no link: its watcher stops at the first change after it closes.
  const { getTabForStore } = await import('@/app/tabs')
  if (!getTabForStore(store)) {
    setTokenCSSLink(store, null)
    return
  }
  try {
    link.text = await readLink(link)
    triggerRef(state.link)
    const { applied, review } = await syncLink(store, link)
    const messages = notificationMessages.get()
    if (applied > 0) toast.info(messages.designTokensImported({ count: applied }))
    if (review.length > 0) toast.warning(messages.designTokensNeedReview({ count: review.length }))
  } catch (error) {
    reportFailure(error)
  }
}
