import { basename } from 'pathe'
import { shallowRef, triggerRef, type ShallowRef } from 'vue'

import type { DesignTokenBundle } from '@pairdraw/core/io/formats/design-tokens'
import { TOKEN_UNIT_PROPERTY, type TokenStylesheetIssue } from '@pairdraw/dom-css/export'
import type { TokenUnit } from '@pairdraw/scene-graph'

import { downloadBlob } from '@/app/document/io/browser'
import { isFileWriteRefused } from '@/app/document/io/capability'
import { createFileWatcher } from '@/app/document/io/watch/watcher'
import type { EditorStore } from '@/app/editor/active-store'
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
}

const states = new WeakMap<EditorStore, LinkState>()

function stateOf(store: EditorStore): LinkState {
  let state = states.get(store)
  if (!state) {
    state = {
      link: shallowRef<TokenCSSLink | null>(null),
      stopWatching: null,
      watchGeneration: 0,
      lastWrite: 0
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

/** Picks a stylesheet through the desktop or browser file picker; null when neither has one. */
export async function pickTokenCSSFile(): Promise<TokenCSSLink | null | 'cancelled'> {
  if (IS_TAURI) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const path = await open({ filters: [{ name: 'CSS', extensions: ['css'] }], multiple: false })
    if (typeof path !== 'string') return 'cancelled'
    const { readFile } = await import('@tauri-apps/plugin-fs')
    return { name: basename(path), path, text: decode(await readFile(path)), watching: false }
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
    return { name: file.name, handle, text: await file.text(), watching: false }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled'
    throw error
  }
}

/** A stylesheet picked through a file input, which the browser lets the app read but not write. */
export async function linkFromFile(file: File): Promise<TokenCSSLink> {
  return { name: file.name, text: await file.text(), watching: false }
}

/** Links the document to a stylesheet, replacing and unwatching any earlier one. */
export function setTokenCSSLink(store: EditorStore, link: TokenCSSLink | null): void {
  const state = stateOf(store)
  stopWatching(state)
  state.link.value = link
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
export async function refreshTokenCSSLink(store: EditorStore): Promise<TokenCSSLink | null> {
  const state = stateOf(store)
  const link = state.link.value
  if (!link) return null
  link.text = await readLink(link)
  triggerRef(state.link)
  return link
}

/**
 * Imports the stylesheet with the choices an import starts with, as one undo step, unless it
 * would change nothing. Returns how many collections, modes, and variables it changed.
 */
async function pullTokenCSS(store: EditorStore, link: TokenCSSLink): Promise<number> {
  const { countTokenImportChanges, defaultTokenImportOptions, planTokenImport } =
    await import('@pairdraw/core/io/formats/design-tokens')
  const bundle = await readTokenCSS(store, link)
  const plan = planTokenImport(store.graph, bundle, defaultTokenImportOptions(store.graph, bundle))
  const changes = countTokenImportChanges(store.graph, plan)
  if (changes > 0) store.importDesignTokens(plan)
  return changes
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
  if (result.updated === 0 && result.added === 0)
    return { updated: 0, added: 0, inPlace: true, issues }
  const inPlace = await writeLink(state, link, result.css)
  link.text = result.css
  triggerRef(state.link)
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
    const changes = await pullTokenCSS(store, link)
    if (changes > 0) toast.info(notificationMessages.get().designTokensImported({ count: changes }))
  } catch (error) {
    reportFailure(error)
  }
}
