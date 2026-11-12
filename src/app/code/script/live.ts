/**
 * Live reload: a script node runs again after it is resized or its inputs change, so the canvas
 * follows the code without a Run click. Every run goes through one scheduler, so the panel and the
 * resize watcher cannot start two runs for the same node.
 */
import type { SceneGraph } from '@open-pencil/scene-graph'

import type { EditorStore } from '@/app/editor/session'

import { runScriptNode, scriptChangeNeedsRun, type ScriptNodeRunResult } from '@/app/code/script/run-node'

/** How long a resize or input edit waits for the next one, so a drag runs once. */
export const SCRIPT_RUN_DEBOUNCE_MS = 300

type RunListener = (result: ScriptNodeRunResult) => void

/** What a live run needs: the document, its current page, and its event bus. */
export interface ScriptRunHost {
  graph: SceneGraph
  currentPageId(): string
  onEditorEvent: EditorStore['onEditorEvent']
}

interface PendingRun {
  timer: ReturnType<typeof setTimeout>
  listeners: RunListener[]
}

const pendingRuns = new WeakMap<ScriptRunHost, Map<string, PendingRun>>()

function runsOf(store: ScriptRunHost): Map<string, PendingRun> {
  let runs = pendingRuns.get(store)
  if (!runs) {
    runs = new Map()
    pendingRuns.set(store, runs)
  }
  return runs
}

/**
 * Runs `nodeId` after `delayMs`, replacing a run already waiting for that node and carrying its
 * listeners over to the one that happens. A listener hears the result of the run it waited on.
 */
export function scheduleScriptRun(
  store: ScriptRunHost,
  nodeId: string,
  options: { delayMs?: number; listener?: RunListener } = {}
): void {
  const runs = runsOf(store)
  const waiting = runs.get(nodeId)
  const listeners = waiting?.listeners ?? []
  if (options.listener) listeners.push(options.listener)
  clearTimeout(waiting?.timer)
  const timer = setTimeout(() => {
    runs.delete(nodeId)
    void runScriptNode(store.graph, nodeId, store.currentPageId()).then((result) => {
      for (const listener of listeners) listener(result)
    })
  }, options.delayMs ?? SCRIPT_RUN_DEBOUNCE_MS)
  runs.set(nodeId, { timer, listeners })
}

/**
 * Watches `node:updated` for script nodes and runs them again when a resize or new inputs reach
 * them. Returns the function that stops it; a page change drops every run that is still waiting.
 */
export function installScriptLiveRuns(store: ScriptRunHost): () => void {
  const stopUpdates = store.onEditorEvent('node:updated', (nodeId, changes) => {
    if (!scriptChangeNeedsRun(changes)) return
    if (store.graph.getNode(nodeId)?.type !== 'SCRIPT') return
    scheduleScriptRun(store, nodeId)
  })
  const stopPage = store.onEditorEvent('page:changed', () => {
    for (const { timer } of runsOf(store).values()) clearTimeout(timer)
    runsOf(store).clear()
  })
  return () => {
    stopPage()
    stopUpdates()
  }
}