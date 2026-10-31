import { afterEach, describe, expect, jest, test } from 'bun:test'

import { nextTick, watch } from 'vue'

import { SceneGraph } from '@pairdraw/scene-graph'

import { createEditorStore } from '@/app/editor/session'

const stores: ReturnType<typeof createEditorStore>[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.dispose()
  jest.useRealTimers()
})

/** Two pages, each with text small enough for the design check to report. */
async function twoPagesWithIssues({ lintOpen = true } = {}) {
  const graph = new SceneGraph()
  const first = graph.getPages()[0]
  const second = graph.addPage('Second')
  const [firstText, secondText] = [first, second].map((page) =>
    graph.createNode('TEXT', page.id, { name: 'Caption', text: 'Caption', fontSize: 8 })
  )
  const store = createEditorStore(graph)
  stores.push(store)
  const checkedPages: string[] = []
  watch(
    store.designCheck.snapshot,
    (snapshot) => {
      if (snapshot) checkedPages.push(snapshot.pageId)
    },
    { flush: 'sync' }
  )
  store.designCheck.panelVisible.value = lintOpen
  await nextTick()
  /** Layers with small text in the current page's result, as the Lint panel lists them. */
  const listedNodes = () => {
    const snapshot = store.designCheck.snapshot.value
    if (!snapshot || snapshot.pageId !== store.state.currentPageId) return []
    return snapshot.issues
      .filter((issue) => issue.ruleId === 'min-text-size')
      .map((issue) => issue.nodeId)
  }
  return { store, first, second, firstText, secondText, checkedPages, listedNodes }
}

/** The editor's own switch; the app's adds a progress overlay with timers of its own. */
async function switchPage(store: ReturnType<typeof createEditorStore>, pageId: string) {
  const prepared = await store.preparePage(pageId)
  if (prepared) store.commitPageSwitch(prepared)
  await nextTick()
}

/** Lets the check scheduled after a change run. */
async function settleCheck() {
  jest.advanceTimersByTime(1000)
  await nextTick()
}

function smallTextIssue(store: ReturnType<typeof createEditorStore>, nodeId: string) {
  const issue = store.designCheck.snapshot.value?.issues.find(
    (candidate) => candidate.nodeId === nodeId && candidate.ruleId === 'min-text-size'
  )
  if (!issue) throw new Error('The check found no small text on the layer')
  return issue
}

describe('the design check across a page switch', () => {
  test('checks the new page once, after the switch', async () => {
    jest.useFakeTimers()
    const { store, first, second, firstText, secondText, checkedPages, listedNodes } =
      await twoPagesWithIssues()
    expect(store.designCheck.snapshot.value?.pageId).toBe(first.id)
    expect(listedNodes()).toEqual([firstText.id])
    checkedPages.length = 0

    await switchPage(store, second.id)
    // The previous page's issues point at layers that are no longer shown.
    expect(listedNodes()).toEqual([])
    expect(checkedPages).toEqual([])

    await settleCheck()
    expect(checkedPages).toEqual([second.id])
    expect(listedNodes()).toEqual([secondText.id])
  })

  test('opening an issue on another page checks that page right away', async () => {
    jest.useFakeTimers()
    const { store, second, secondText, checkedPages } = await twoPagesWithIssues()
    checkedPages.length = 0
    const issue = {
      id: `min-text-size:${secondText.id}:0`,
      ruleId: 'min-text-size',
      nodeId: secondText.id,
      pageId: second.id,
      severity: 'warning' as const,
      message: '',
      nodeName: 'Caption',
      nodePath: ['Caption']
    }

    await store.designCheck.openIssue(issue)

    // The Lint panel focuses the issue's row, which needs the new page's issues already.
    expect(checkedPages).toEqual([second.id])
    expect(store.designCheck.snapshot.value?.issues.map(({ id }) => id)).toContain(issue.id)
    expect(store.designCheck.focusedIssueId.value).toBe(issue.id)
  })
})

describe('a page visited before', () => {
  test('shows its last result at once when nothing on it changed', async () => {
    jest.useFakeTimers()
    const { store, first, second, secondText, listedNodes } = await twoPagesWithIssues()
    await switchPage(store, second.id)
    await settleCheck()
    await switchPage(store, first.id)
    await settleCheck()

    await switchPage(store, second.id)

    // Before the check that follows the switch runs.
    expect(listedNodes()).toEqual([secondText.id])
  })

  test('shows the first page checked at once too', async () => {
    jest.useFakeTimers()
    const { store, first, second, firstText, listedNodes } = await twoPagesWithIssues()
    await switchPage(store, second.id)
    // The second page's check replaces the first's result; the background checks wait longer.
    jest.advanceTimersByTime(300)
    await nextTick()

    await switchPage(store, first.id)

    expect(listedNodes()).toEqual([firstText.id])
  })

  test('waits for a new check when it changed while away', async () => {
    jest.useFakeTimers()
    const { store, first, second, secondText, listedNodes } = await twoPagesWithIssues()
    await switchPage(store, second.id)
    await settleCheck()
    await switchPage(store, first.id)
    await settleCheck()
    store.updateNode(secondText.id, { fontSize: 16 })

    await switchPage(store, second.id)
    expect(listedNodes()).toEqual([])

    await settleCheck()
    expect(listedNodes()).toEqual([])
  })
})

describe('the focused issue', () => {
  test('is dropped as soon as its layer is deleted', async () => {
    const { store, firstText } = await twoPagesWithIssues()
    await store.designCheck.openIssue(smallTextIssue(store, firstText.id))
    expect(store.designCheck.focusedIssueId.value).not.toBeNull()

    // Until the next check, the panel still lists the deleted layer's issue and would reveal it.
    store.deleteSelected()

    expect(store.designCheck.focusedIssueId.value).toBeNull()
  })

  test('is dropped once the check no longer finds it', async () => {
    jest.useFakeTimers()
    const { store, firstText } = await twoPagesWithIssues()
    await store.designCheck.openIssue(smallTextIssue(store, firstText.id))

    store.updateNode(firstText.id, { fontSize: 16 })
    await nextTick()
    jest.advanceTimersByTime(1000)
    await nextTick()

    expect(store.designCheck.focusedIssueId.value).toBeNull()
  })
})

describe('the design check with nothing showing issues', () => {
  test('checks nothing while neither the Lint panel nor another view is open', async () => {
    jest.useFakeTimers()
    const { store, firstText, checkedPages } = await twoPagesWithIssues({ lintOpen: false })
    store.updateNode(firstText.id, { fontSize: 6 })
    await settleCheck()

    expect(store.designCheck.enabled.value).toBe(false)
    expect(checkedPages).toEqual([])
    expect(store.designCheck.snapshot.value).toBeNull()
  })

  test('stops checking and clears the highlight once the Lint panel closes', async () => {
    jest.useFakeTimers()
    const { store, firstText, checkedPages } = await twoPagesWithIssues()
    store.designCheck.highlightIssue(smallTextIssue(store, firstText.id))
    expect(store.state.designIssueHighlight?.nodeId).toBe(firstText.id)

    store.designCheck.panelVisible.value = false
    await nextTick()
    checkedPages.length = 0
    store.updateNode(firstText.id, { fontSize: 6 })
    await settleCheck()

    expect(store.state.designIssueHighlight).toBeNull()
    expect(store.designCheck.snapshot.value).toBeNull()
    expect(checkedPages).toEqual([])
  })
})

describe('a view that shows issues', () => {
  test('keeps the page checked while it is open', async () => {
    jest.useFakeTimers()
    const { store, first, checkedPages } = await twoPagesWithIssues({ lintOpen: false })
    const release = store.designCheck.holdChecks()
    await settleCheck()
    expect(store.designCheck.enabled.value).toBe(true)
    expect(checkedPages).toContain(first.id)
    expect(store.designCheck.snapshot.value?.issues.length).toBeGreaterThan(0)

    release()
    release()
    await nextTick()
    expect(store.designCheck.enabled.value).toBe(false)
  })
})

describe("an agent's reply", () => {
  test('is checked once, after it ends, rather than edit by edit', async () => {
    jest.useFakeTimers()
    const { store, first, firstText, checkedPages } = await twoPagesWithIssues()
    checkedPages.length = 0

    store.designCheck.holdForAgent(true)
    store.updateNode(firstText.id, { fontSize: 16 })
    await settleCheck()
    store.updateNode(firstText.id, { fontSize: 6 })
    await settleCheck()
    expect(checkedPages).toEqual([])

    store.designCheck.holdForAgent(false)
    await settleCheck()
    expect(checkedPages).toEqual([first.id])
    expect(store.designCheck.snapshot.value?.issues.map((issue) => issue.nodeId)).toContain(
      firstText.id
    )
  })
})
