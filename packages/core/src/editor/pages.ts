import { limitAsync } from 'es-toolkit/promise'

import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'
import type { Color } from '@pairdraw/scene-graph/primitives'

import { restoreDeletedEntries } from '#core/editor/clipboard/history'
import { snapshotSubtree } from '#core/editor/history/subtree'
import {
  getPageColor,
  setDefaultPageBackground,
  setPageBackgrounds
} from '#core/figma-api/page-backgrounds'
import {
  canUseFigPopulationWorker,
  createFigPopulationWorker
} from '#core/kiwi/fig/population/client'
import {
  isReaderPagePending,
  pendingReaderPageOfNode,
  recoverReaderPage
} from '#core/kiwi/fig/session/document-state'
import { computeAllLayouts } from '#core/layout'
import { fontManager } from '#core/text/font/manager'
import { collectGraphFontRequirements } from '#core/text/requirements/collect'
import { missingGraphFontScripts } from '#core/text/requirements/resolved'

import { createPageViewportStore } from './page-viewports'
import { createPageLayouts } from './pages/layouts'
import type { EditorContext } from './types'

export interface PageSwitchProgress {
  phase:
    | 'populating-page'
    | 'resolving-fonts'
    | 'resolving-fallbacks'
    | 'layout'
    | 'drawing-shaders'
  detail?: string
  completed?: number
  total?: number
}

export interface PreparePageOptions {
  onProgress?: (progress: PageSwitchProgress) => void
  signal?: AbortSignal
}

export interface PreparedPage {
  pageId: string
  generation: number
}

export type SwitchPageOptions = PreparePageOptions

function throwIfAborted(signal?: AbortSignal): void {
  signal?.throwIfAborted()
}

const MAX_CONCURRENT_FONT_LOADS = 4
/** What preparing a page needs drawn once it is laid out, such as its shaders' frames. */
interface PageDrawing {
  drawPageShaderFrames(
    pageId: string,
    options: { signal?: AbortSignal; onProgress?: (progress: PageSwitchProgress) => void }
  ): Promise<void>
}

/**
 * The component sets on other pages that instances on `pageId` show a variant of, nested
 * instances included, and the sets those sets' variants use in turn. Reading a page brings in
 * each such set whole, so its variants can be switched to; they get fonts and layout here
 * rather than their pages, whose other layers the page does not use.
 */
export function componentSetsUsed(graph: SceneGraph, pageId: string): string[] {
  const sets = new Set<string>()
  const pending = [pageId]
  const visit = (id: string): void => {
    for (const node of graph.getChildren(id)) {
      if (node.type === 'INSTANCE') {
        const component = instanceMainComponent(graph, node)
        const set = component?.parentId ? graph.getNode(component.parentId) : undefined
        if (set?.type === 'COMPONENT_SET' && graph.pageOf(set.id) !== pageId && !sets.has(set.id)) {
          sets.add(set.id)
          pending.push(set.id)
        }
      }
      visit(node.id)
    }
  }
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) visit(id)
  return [...sets]
}

export function createPageActions(ctx: EditorContext, drawing?: PageDrawing) {
  const pageViewportStore = createPageViewportStore(ctx)
  const pageLayouts = createPageLayouts(ctx)
  function syncPageColor() {
    ctx.state.pageColor = getPageColor(ctx.graph.getNode(ctx.state.currentPageId))
  }
  syncPageColor()
  ctx.onEditorEvent('graph:replaced', syncPageColor)
  ctx.onEditorEvent('node:updated', (id, changes) => {
    if (id === ctx.state.currentPageId && changes.source) syncPageColor()
  })
  let populationWorkerInstance: ReturnType<typeof createFigPopulationWorker> | undefined
  let populationWorkerGeneration = 0
  let pageSwitchGeneration = 0
  // Off-screen preparations per document, shared by concurrent callers and kept once they
  // succeed. Later edits lay out their own scope, as they do on the page on screen.
  const offscreenPreparations = new WeakMap<SceneGraph, Map<string, Promise<boolean>>>()

  function populationWorker() {
    if (!canUseFigPopulationWorker(ctx.graph)) return null
    populationWorkerInstance ??= createFigPopulationWorker(ctx.graph)
    return populationWorkerInstance
  }

  /** `switchGeneration` is null for a lookup, which no page switch can supersede. */
  async function populatePage(
    pageId: string,
    switchGeneration: number | null,
    signal?: AbortSignal
  ): Promise<boolean | null> {
    throwIfAborted(signal)
    // A page the reader has loaded, or one made here, has nothing to load.
    if (!isReaderPagePending(ctx.graph, pageId)) return false
    const worker = populationWorker()
    const workerGeneration = populationWorkerGeneration
    const workerResult = worker ? await worker.populate(pageId, signal) : null
    throwIfAborted(signal)
    if (
      workerGeneration !== populationWorkerGeneration ||
      (switchGeneration !== null && switchGeneration !== pageSwitchGeneration)
    ) {
      return null
    }
    if (workerResult !== null) return workerResult
    worker?.terminate()
    populationWorkerInstance = undefined
    if (isReaderPagePending(ctx.graph, pageId)) {
      return recoverReaderPage(ctx.graph, pageId)
    }
    return false
  }

  /** Loads the fonts the layers under `rootIds` use, with fallbacks for their scripts. */
  async function resolveFonts(
    rootIds: readonly string[],
    pageName: string,
    options: PreparePageOptions
  ): Promise<void> {
    const childIds = rootIds.flatMap((id) => ctx.graph.getChildren(id).map((node) => node.id))
    const toLoad = fontManager.collectFontKeys(ctx.graph, childIds)
    const requirements = collectGraphFontRequirements(ctx.graph, childIds)
    options.onProgress?.({
      phase: 'resolving-fonts',
      detail: pageName,
      completed: 0,
      total: toLoad.length
    })
    fontManager.blockNodesUntilFontsResolve(childIds)
    try {
      let completedFaces = 0
      const loadFace = limitAsync(async ([family, style]: [string, string]) => {
        throwIfAborted(options.signal)
        const result = await ctx.loadFont(family, style, requirements.characters, options.signal)
        throwIfAborted(options.signal)
        completedFaces++
        options.onProgress?.({
          phase: 'resolving-fonts',
          detail: `${family} ${style}`,
          completed: completedFaces,
          total: toLoad.length
        })
        return result
      }, MAX_CONCURRENT_FONT_LOADS)
      const results = await Promise.all(toLoad.map(loadFace))
      throwIfAborted(options.signal)
      const requiredFallbacks = missingGraphFontScripts(requirements)
      options.onProgress?.({
        phase: 'resolving-fallbacks',
        detail: pageName,
        completed: 0,
        total: requiredFallbacks.length
      })
      const fallbacks = await fontManager.ensureFallbackPack(
        requiredFallbacks,
        requirements.characters,
        options.signal
      )
      throwIfAborted(options.signal)
      options.onProgress?.({
        phase: 'resolving-fallbacks',
        detail: pageName,
        completed: requiredFallbacks.length,
        total: requiredFallbacks.length
      })
      const facesReady = results.every((result) => result !== null)
      const fallbacksReady = requiredFallbacks.every(
        (script) => (fallbacks[script]?.length ?? 0) > 0
      )
      if (facesReady && fallbacksReady) {
        for (const node of requirements.nodes) if (node.type === 'TEXT') node.textPicture = null
      }
    } finally {
      fontManager.unblockNodes(childIds)
      ctx.getRenderer()?.invalidateAllPictures()
    }
  }

  async function preparePage(
    pageId: string,
    options: PreparePageOptions = {}
  ): Promise<PreparedPage | null> {
    const page = ctx.graph.getNode(pageId)
    if (page?.type !== 'CANVAS') return null
    const generation = ++pageSwitchGeneration
    throwIfAborted(options.signal)

    options.onProgress?.({ phase: 'populating-page', detail: page.name })
    const populated = await populatePage(pageId, generation, options.signal)
    if (populated === null || generation !== pageSwitchGeneration) return null
    // Switching a variant, in the panel or in preview, needs the rest of its set laid out with
    // its fonts. Reading the page brought each set it uses in whole; those on other pages are
    // laid out here, without the rest of their pages.
    const sets = componentSetsUsed(ctx.graph, pageId)
    await resolveFonts([pageId, ...sets], page.name, options)
    throwIfAborted(options.signal)
    if (generation !== pageSwitchGeneration) return null
    if (sets.length > 0)
      ctx.graph.applyDerivedLayoutDuring(() => {
        for (const setId of sets) computeAllLayouts(ctx.graph, setId)
      })
    // A page visited before keeps the layout it got then, unless something it depends on changed.
    if ((ctx.getRenderer() || populated) && !pageLayouts.isCurrent(pageId)) {
      options.onProgress?.({ phase: 'layout', detail: page.name })
      ctx.graph.applyDerivedLayoutDuring(() => computeAllLayouts(ctx.graph, pageId))
      pageLayouts.record(pageId)
    }
    throwIfAborted(options.signal)
    if (generation !== pageSwitchGeneration) return null
    // Frames are drawn at the size layout gives each layer.
    await drawing?.drawPageShaderFrames(pageId, options)
    throwIfAborted(options.signal)
    return generation === pageSwitchGeneration ? { pageId, generation } : null
  }

  /**
   * Lays out the page on screen again when what sized its text has changed since, as for a page
   * shown before any canvas could measure text, which preparing it leaves to the canvas.
   */
  function layOutStaleCurrentPage(): void {
    const pageId = ctx.state.currentPageId
    if (ctx.graph.getNode(pageId)?.type !== 'CANVAS' || pageLayouts.isCurrent(pageId)) return
    ctx.graph.applyDerivedLayoutDuring(() => computeAllLayouts(ctx.graph, pageId))
    pageLayouts.record(pageId)
    ctx.requestRender()
  }

  function commitPageSwitch(prepared: PreparedPage): boolean {
    if (prepared.generation !== pageSwitchGeneration) return false
    const page = ctx.graph.getNode(prepared.pageId)
    if (page?.type !== 'CANVAS') return false
    return showPage(prepared.pageId)
  }

  /** Puts a page on screen with nothing selected, saving the viewport of the one it leaves. */
  function showPage(pageId: string): boolean {
    if (ctx.graph.getNode(pageId)?.type !== 'CANVAS') return false
    if (ctx.state.currentPageId !== pageId) {
      ctx.emitEditorEvent('page:leaving', ctx.state.currentPageId, pageId)
    }
    pageViewportStore.saveCurrentPageViewport()
    const previousPageId = ctx.state.currentPageId
    ctx.state.currentPageId = pageId
    ctx.state.enteredContainerId = null
    ctx.setSelectedIds(new Set())
    pageViewportStore.restorePageViewport(pageId)
    if (previousPageId !== pageId) {
      ctx.emitEditorEvent('page:changed', pageId, previousPageId)
    }
    ctx.requestRender()
    return true
  }

  /**
   * Loads a page's layers so they can be searched, without fonts, layout, or switching to
   * it — and without superseding a page switch the user has in progress.
   */
  async function loadPageNodes(pageId: string): Promise<void> {
    if (ctx.graph.getNode(pageId)?.type === 'CANVAS') await populatePage(pageId, null)
  }

  /** The page holding a layer not in the document yet because its page has not loaded. */
  function pageHoldingNode(nodeId: string): Promise<string | null> {
    return ctx.graph.getNode(nodeId)
      ? Promise.resolve(null)
      : pendingReaderPageOfNode(ctx.graph, nodeId)
  }

  async function prepareOffscreenPage(graph: SceneGraph, page: SceneNode): Promise<boolean> {
    const populated = await populatePage(page.id, null)
    if (populated === null || graph !== ctx.graph) return false
    await resolveFonts([page.id], page.name, {})
    if (graph !== ctx.graph) return false
    graph.applyDerivedLayoutDuring(() => computeAllLayouts(graph, page.id))
    return true
  }

  /**
   * Loads a page's layers with their fonts and layout, ready to render, without switching to
   * it or superseding a page switch in progress. False when the document was closed or
   * replaced first. The page on screen already was prepared, when it was shown.
   */
  function preparePageNodes(pageId: string): Promise<boolean> {
    const graph = ctx.graph
    const page = graph.getNode(pageId)
    if (page?.type !== 'CANVAS') return Promise.resolve(false)
    if (pageId === ctx.state.currentPageId) return Promise.resolve(true)
    let preparations = offscreenPreparations.get(graph)
    if (!preparations) {
      preparations = new Map()
      offscreenPreparations.set(graph, preparations)
    }
    const pending = preparations.get(pageId)
    if (pending) return pending
    // A failed or superseded preparation is retried by the next caller.
    const forget = () => preparations.delete(pageId)
    const preparation = prepareOffscreenPage(graph, page).then(
      (ready) => {
        if (!ready) forget()
        return ready
      },
      (error: unknown) => {
        forget()
        throw error
      }
    )
    preparations.set(pageId, preparation)
    return preparation
  }

  async function switchPage(pageId: string, options: SwitchPageOptions = {}): Promise<void> {
    const prepared = await preparePage(pageId, options)
    if (prepared) commitPageSwitch(prepared)
  }

  /** Opens the page before or after the current one in the pages panel, stopping at the ends. */
  async function switchToAdjacentPage(step: 1 | -1): Promise<void> {
    const pages = ctx.graph.getPages()
    const index = pages.findIndex((page) => page.id === ctx.state.currentPageId)
    const next = index + step
    if (index === -1 || next < 0 || next >= pages.length) return
    await switchPage(pages[next].id)
  }

  function clearPageViewports() {
    populationWorkerGeneration++
    pageSwitchGeneration++
    populationWorkerInstance?.terminate()
    populationWorkerInstance = undefined
    pageViewportStore.clearPageViewports()
  }

  /** Adds a page after the last one and shows it; one undo step, as in Figma. */
  function addPage(name?: string) {
    const pages = ctx.graph.getPages()
    const pageName = name ?? `Page ${pages.length + 1}`
    const page = ctx.graph.addPage(pageName)
    setDefaultPageBackground(ctx.graph, page, ctx.state.theme)
    const previousPageId = ctx.state.currentPageId
    const index = ctx.graph.getPages().findIndex((entry) => entry.id === page.id)
    const entry = pageEntry(page.id, index)
    void switchPage(page.id)
    ctx.undo.push({
      label: 'Add page',
      forward: () => {
        restoreDeletedEntries(ctx, [entry])
        showPage(page.id)
      },
      inverse: () => {
        ctx.graph.deleteNode(page.id)
        pageViewportStore.deletePageViewport(page.id)
        showPage(previousPageId)
      }
    })
    return page.id
  }

  /** A page, its layers and its place in the list, as undo restores them. */
  function pageEntry(pageId: string, index: number) {
    return {
      id: pageId,
      parentId: ctx.graph.rootId,
      index,
      subtree: snapshotSubtree(ctx.graph, pageId)
    }
  }

  /**
   * Deletes a page with its layers, showing the page after it. Undo brings the page back whole
   * at its place in the list, and redo deletes it again. A page the reader has not loaded is
   * loaded first, so its layers come back too.
   */
  async function deletePage(pageId: string) {
    const pages = ctx.graph.getPages()
    if (pages.length <= 1) return
    const index = pages.findIndex((page) => page.id === pageId)
    if (index === -1) return
    if (isReaderPagePending(ctx.graph, pageId)) await loadPageNodes(pageId)
    if (ctx.graph.getNode(pageId)?.type !== 'CANVAS') return
    const entry = pageEntry(pageId, index)
    const previousPageId = ctx.state.currentPageId
    const remaining = pages.filter((page) => page.id !== pageId)
    const nextPageId = remaining[Math.min(index, remaining.length - 1)].id
    const remove = () => {
      ctx.graph.deleteNode(pageId)
      pageViewportStore.deletePageViewport(pageId)
      if (ctx.state.currentPageId === pageId) showPage(nextPageId)
    }
    const restore = () => {
      restoreDeletedEntries(ctx, [entry])
      showPage(pageId)
    }
    remove()
    ctx.undo.push({ label: 'Delete page', forward: remove, inverse: restore })
    if (previousPageId !== pageId) showPage(previousPageId)
  }

  /** Moves a page in the list; one undo step back to its place. */
  function movePage(pageId: string, index: number) {
    const pages = ctx.graph.getPages()
    const currentIndex = pages.findIndex((page) => page.id === pageId)
    if (currentIndex === -1) return

    const nextIndex = Math.max(0, Math.min(index, pages.length - 1))
    if (nextIndex === currentIndex) return

    const move = (to: number) => {
      ctx.graph.insertChildAt(pageId, ctx.graph.rootId, to)
      ctx.requestRender()
    }
    move(nextIndex)
    ctx.undo.push({
      label: 'Move page',
      forward: () => move(nextIndex),
      inverse: () => move(currentIndex)
    })
  }

  /** Renames a page; one undo step back to its name. */
  function renamePage(pageId: string, name: string) {
    const previous = ctx.graph.getNode(pageId)?.name
    if (previous === undefined || previous === name) return
    const rename = (next: string) => ctx.graph.updateNode(pageId, { name: next })
    rename(name)
    ctx.undo.push({
      label: 'Rename page',
      forward: () => rename(name),
      inverse: () => rename(previous)
    })
  }

  function setPageColor(color: Color) {
    const page = ctx.graph.getNode(ctx.state.currentPageId)
    if (!page) return
    setPageBackgrounds(ctx.graph, page, [
      { type: 'SOLID', color: { ...color }, opacity: 1, visible: true, blendMode: 'NORMAL' }
    ])
    syncPageColor()
    ctx.requestRender()
  }

  /** Advances whenever a page switch starts, so a caller can tell it was overtaken. */
  function pageSwitchCount(): number {
    return pageSwitchGeneration
  }

  return {
    loadPageNodes,
    pageHoldingNode,
    preparePageNodes,
    pageSwitchCount,
    preparePage,
    commitPageSwitch,
    switchPage,
    layOutStaleCurrentPage,
    switchToNextPage: () => switchToAdjacentPage(1),
    switchToPreviousPage: () => switchToAdjacentPage(-1),
    addPage,
    deletePage,
    movePage,
    renamePage,
    setPageColor,
    clearPageViewports
  }
}
