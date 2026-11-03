import type { Page } from '@playwright/test'

export interface InstanceLayerScene {
  /** An instance of Button at (200, 200), whose first layer copies the Icon at (8, 8) in it. */
  instanceId: string
  /** A star on the page, to copy and paste in place of the icon. */
  starId: string
  /** A Card instance whose only layer is a nested instance of Icon A. */
  cardInstanceId: string
  otherIconId: string
}

/** Builds the scene the instance override specs edit, nothing selected. */
export function createInstanceLayerScene(page: Page): Promise<InstanceLayerScene> {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const pageId = store.state.currentPageId
    const { graph } = store
    const button = graph.createNode('COMPONENT', pageId, { name: 'Button', width: 120, height: 40 })
    graph.createNode('RECTANGLE', button.id, { name: 'Icon', x: 8, y: 8, width: 24, height: 24 })
    graph.createNode('RECTANGLE', button.id, { name: 'Label', x: 40, y: 8, width: 60, height: 24 })
    const instance = graph.createInstance(button.id, pageId, { x: 200, y: 200 })
    const star = graph.createNode('STAR', pageId, { name: 'Star', x: 600, width: 20, height: 20 })
    const iconA = graph.createNode('COMPONENT', pageId, { name: 'Icon A', y: 300, width: 24 })
    graph.createNode('RECTANGLE', iconA.id, { name: 'Square', width: 24, height: 24 })
    const iconB = graph.createNode('COMPONENT', pageId, { name: 'Icon B', y: 360, width: 24 })
    graph.createNode('ELLIPSE', iconB.id, { name: 'Dot', width: 24, height: 24 })
    const card = graph.createNode('COMPONENT', pageId, { name: 'Card', y: 420, width: 80 })
    graph.createInstance(iconA.id, card.id)
    const cardInstance = graph.createInstance(card.id, pageId, { x: 200, y: 420 })
    if (!instance || !cardInstance) throw new Error('Expected instances')
    store.requestRender()
    return {
      instanceId: instance.id,
      starId: star.id,
      cardInstanceId: cardInstance.id,
      otherIconId: iconB.id
    }
  })
}

/** Each layer of a node as `TYPE:name`, in order. */
export function layerSummary(page: Page, nodeId: string): Promise<string[]> {
  return page.evaluate((id) => {
    const graph = window.openPencil?.getStore?.().graph
    return (graph?.getChildren(id) ?? []).map((node) => `${node.type}:${node.name}`)
  }, nodeId)
}

/** The ID of a node's first layer. */
export function firstLayerId(page: Page, nodeId: string): Promise<string> {
  return page.evaluate((id) => {
    const first = window.openPencil?.getStore?.().graph.getChildren(id)[0]
    if (!first) throw new Error(`No layers in ${id}`)
    return first.id
  }, nodeId)
}

export function componentOf(page: Page, nodeId: string): Promise<string | null | undefined> {
  return page.evaluate(
    (id) => window.openPencil?.getStore?.().graph.getNode(id)?.componentId,
    nodeId
  )
}

export async function selectNodes(page: Page, ids: string[]): Promise<void> {
  await page.evaluate((nodeIds) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    store.select(nodeIds)
  }, ids)
}

export function selectedIds(page: Page): Promise<string[]> {
  return page.evaluate(() => [...(window.openPencil?.getStore?.().state.selectedIds ?? [])])
}
