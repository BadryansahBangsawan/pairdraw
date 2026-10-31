import { useTimeoutFn } from '@vueuse/core'
import { computed, effectScope, ref, shallowRef, watch } from 'vue'

import type { Editor } from '@pairdraw/core'
import { isFigPagePending } from '@pairdraw/core/io/formats/fig'
import { createLinter, type LintConfig, type LintFixRequest } from '@pairdraw/core/lint'

import type { AppEditorState } from '@/app/editor/session/types'
import { appPreferences, type DesignCheckPreset } from '@/app/settings/preferences/store'

import { highlightForIssue, toDesignIssues, type DesignIssue } from './issues'
import { createPageChecks, pageOf } from './pages'

/** Quiet period after an edit before the page is checked again. */
const CHECK_DELAY_MS = 180

export interface DesignCheckSnapshot {
  pageId: string
  issues: DesignIssue[]
}

function linterConfig(preset: DesignCheckPreset, disabledRules: readonly string[]): LintConfig {
  return {
    extends: preset,
    rules: Object.fromEntries(disabledRules.map((rule) => [rule, 'off' as const]))
  }
}

/**
 * Keeps the current page checked while the Lint panel or another view that shows issues, such
 * as the Code tab, is open.
 *
 * Checks run once edits settle and wait out interactive property edits, so a burst of changes
 * costs one check. Nothing runs while no such view is open.
 */
export function createDesignCheck(editor: Editor, state: AppEditorState) {
  const scope = effectScope(true)
  const snapshot = shallowRef<DesignCheckSnapshot | null>(null)
  const panelVisible = ref(false)
  const focusedIssueId = ref<string | null>(null)
  /** The layer of the focused issue, which takes the focus with it when it is deleted. */
  const focusedNodeId = computed(() => {
    const id = focusedIssueId.value
    return id ? (snapshot.value?.issues.find((issue) => issue.id === id)?.nodeId ?? null) : null
  })

  const preferences = computed(() => appPreferences.value.designCheck)
  /** Other views showing the page's issues while open, such as the Code tab's underlines. */
  const holders = ref(0)
  const enabled = computed(() => panelVisible.value || holders.value > 0)

  /** Keeps the current page checked until the returned release is called, once. */
  function holdChecks(): () => void {
    holders.value++
    let held = true
    return () => {
      if (!held) return
      held = false
      holders.value--
    }
  }
  // Primitive keys keep preference changes that leave the rules alone from rebuilding them.
  const preset = computed(() => preferences.value.preset)
  const disabledRules = computed(() => preferences.value.disabledRules.join('\n'))
  const linter = computed(() =>
    createLinter({
      config: linterConfig(preset.value, disabledRules.value ? disabledRules.value.split('\n') : [])
    })
  )

  function checkPage(pageId: string): DesignIssue[] {
    return toDesignIssues(linter.value.lintGraph(editor.graph, [pageId]).messages, pageId)
  }

  /** Set while the Lint panel lists the whole document, which needs every page checked. */
  const documentScope = ref(false)
  // Pages beyond the current one are checked only for the Document scope.
  const pagesNeeded = computed(() => enabled.value && documentScope.value)
  /** Set while an agent's reply edits the document; its burst of edits is checked once, after. */
  let agentEditing = false
  // Stopped in dispose, so it needs no effect scope of its own.
  const pages = createPageChecks({
    graph: () => editor.graph,
    currentPageId: () => state.currentPageId,
    isPending: (pageId) => isFigPagePending(editor.graph, pageId),
    isBusy: () => editor.isInteractiveEditing() || agentEditing,
    check: checkPage
  })

  /** Marks the pages a graph change touches as out of date. */
  function watchGraph() {
    const graph = editor.graph
    const touch = (nodeId: string | null | undefined) => pages.invalidate(pageOf(graph, nodeId))
    return graph.onNodeEvents({
      created: (node) => touch(node.id),
      updated: (id) => touch(id),
      deleted: (id, parentId) => {
        touch(parentId)
        if (id === focusedNodeId.value) focusedIssueId.value = null
      },
      reparented: (_id, oldParentId, newParentId) => {
        touch(oldParentId)
        touch(newParentId)
      },
      reordered: (_id, parentId, _index, previousParentId) => {
        touch(parentId)
        touch(previousParentId)
      }
    })
  }
  let unwatchGraph = watchGraph()

  const delay = ref(CHECK_DELAY_MS)
  const timer = scope.run(() => useTimeoutFn(() => run(), delay, { immediate: false }))

  function cancel() {
    timer?.stop()
  }

  function run() {
    cancel()
    if (!enabled.value) return
    if (editor.isInteractiveEditing()) {
      schedule()
      return
    }
    const pageId = state.currentPageId
    snapshot.value = { pageId, issues: checkPage(pageId) }
  }

  function schedule(wait = CHECK_DELAY_MS) {
    delay.value = wait
    timer?.start()
  }

  scope.run(() => {
    watch(
      enabled,
      (on) => {
        if (on) {
          run()
          return
        }
        cancel()
        snapshot.value = null
        editor.setDesignIssueHighlight(null)
      },
      { immediate: true }
    )
    watch(linter, () => {
      if (enabled.value) run()
      if (pagesNeeded.value) pages.invalidateAll()
    })
    watch(pagesNeeded, (on) => (on ? pages.start() : pages.stop()), { immediate: true })
    // Immediate: the first check runs while `enabled` starts up, before this watcher exists.
    watch(
      snapshot,
      (current) => {
        if (!current) return
        pages.report(current.pageId, current.issues)
        // A focused issue the check no longer finds, such as one fixed, has no row left to show.
        const focused = focusedIssueId.value
        if (focused && !current.issues.some(({ id }) => id === focused)) focusedIssueId.value = null
      },
      { immediate: true }
    )
    // A page nothing changed on shows its last result at once. The check still runs once the
    // switch settles, rather than inside it, since variables can change what a page reports.
    watch(
      () => state.currentPageId,
      (pageId) => {
        focusedIssueId.value = null
        editor.setDesignIssueHighlight(null)
        const cached = enabled.value ? pages.fresh(pageId) : null
        if (cached) snapshot.value = { pageId, issues: [...cached] }
        if (enabled.value) schedule()
      }
    )
    // An agent's edits are checked once its reply ends.
    watch(
      () => state.sceneVersion,
      () => enabled.value && !agentEditing && schedule()
    )
  })

  const unsubscribeGraph = editor.onEditorEvent('graph:replaced', () => {
    snapshot.value = null
    unwatchGraph()
    unwatchGraph = watchGraph()
    if (pagesNeeded.value) pages.invalidateAll()
    if (enabled.value) schedule(0)
  })

  function highlightIssue(issue: DesignIssue | null) {
    editor.setDesignIssueHighlight(issue ? highlightForIssue(issue) : null)
  }

  /** Selects the issue's layer, on its page, keeps it in view and marks the row as focused. */
  async function openIssue(issue: DesignIssue) {
    // A page switch clears the focused issue, so focus follows the switch.
    if (issue.pageId !== state.currentPageId && editor.graph.getNode(issue.pageId)) {
      await editor.switchPage(issue.pageId)
      // The row to focus belongs to the new page's check, which would otherwise come later.
      run()
    }
    focusedIssueId.value = issue.id
    if (!editor.graph.getNode(issue.nodeId)) return
    editor.select([issue.nodeId])
    editor.revealNodes([issue.nodeId])
  }

  /** Applies fixes as one undo step and re-checks right away, so fixed rows leave at once. */
  function applyFixes(requests: readonly LintFixRequest[]) {
    if (editor.applyLintFixes(requests) > 0) run()
  }

  /**
   * Holds checks while an agent's reply runs, so its edits are not checked one by one while it
   * works; the page is checked once the reply ends.
   */
  function holdForAgent(editing: boolean) {
    if (agentEditing === editing) return
    agentEditing = editing
    if (!editing && enabled.value) schedule(0)
  }

  function dispose() {
    cancel()
    unsubscribeGraph()
    unwatchGraph()
    pages.stop()
    scope.stop()
  }

  return {
    snapshot,
    pages,
    documentScope,
    enabled,
    panelVisible,
    holdChecks,
    focusedIssueId,
    checkNow: run,
    highlightIssue,
    openIssue,
    applyFixes,
    holdForAgent,
    dispose
  }
}

export type DesignCheck = ReturnType<typeof createDesignCheck>
