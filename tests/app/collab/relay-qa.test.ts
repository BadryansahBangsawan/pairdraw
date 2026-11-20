import 'fake-indexeddb/auto'
import { afterEach, describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

import { openCloudDocumentRoom } from '@/app/cloud/rooms/live'
import { createEditorStore, type EditorStore } from '@/app/editor/session'

import { startTestRelay } from '#tests/helpers/collab/relay-server'

type Relay = Awaited<ReturnType<typeof startTestRelay>>
const cleanups: (() => void | Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

async function until(condition: () => boolean, attempts = 500): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (condition()) return
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 2)
    })
  }
  throw new Error('Condition was not met')
}

type Peer = {
  store: EditorStore
  room: ReturnType<typeof openCloudDocumentRoom>
  stop: () => void
}
function openPeer(
  relay: Relay,
  documentId: string,
  name: string,
  options: {
    createSocket?: (url: string) => WebSocket
    reconnectDelayMs?: (attempt: number) => number
  } = {}
): Peer {
  const store = createEditorStore(new SceneGraph())
  const room = openCloudDocumentRoom(store, {
    roomId: `cloud:${documentId}:0`,
    transport: relay.join(documentId, name, 'edit', 'user', options),
    permission: 'edit'
  })
  cleanups.push(() => store.preparationController.dispose())
  return {
    store,
    room,
    stop: () => {
      room.stop()
      room.session.dispose()
    }
  }
}

function nodeFacts(store: EditorStore) {
  return [...store.graph.nodes.values()]
    .map((node) => ({
      ...node,
      source: { ...node.source, editedFields: [...node.source.editedFields].sort() },
      textPicture: null,
      derivedTextGlyphs: null
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
}
function pageFacts(store: EditorStore) {
  return store.graph
    .getPages()
    .map((page) => ({ id: page.id, name: page.name, children: page.childIds }))
}
function variableFacts(store: EditorStore) {
  return {
    variables: [...store.graph.variables.values()].sort((a, b) => a.id.localeCompare(b.id)),
    collections: [...store.graph.variableCollections.values()].sort((a, b) =>
      a.id.localeCompare(b.id)
    )
  }
}
function expectSame(peers: Peer[]) {
  const [first, ...rest] = peers
  if (!first) throw new Error('no peers')
  for (const peer of rest) {
    expect(nodeFacts(peer.store)).toEqual(nodeFacts(first.store))
    expect(pageFacts(peer.store)).toEqual(pageFacts(first.store))
    expect(variableFacts(peer.store)).toEqual(variableFacts(first.store))
  }
}

function pageOne(store: EditorStore): string {
  const page = store.graph.getPages()[0]
  if (!page) throw new Error('no page')
  return page.id
}

describe('three editors through the Cloud relay', () => {
  test('concurrent layers, text, pages, and variables converge', async () => {
    const relay = await startTestRelay()
    cleanups.push(() => relay.close())
    const documentId = crypto.randomUUID()
    const peers = [
      openPeer(relay, documentId, 'Ann'),
      openPeer(relay, documentId, 'Ben'),
      openPeer(relay, documentId, 'Cat')
    ]
    cleanups.push(...peers.map((peer) => peer.stop))
    await until(() => peers.every((peer) => peer.room.session.roomHasDocument()))
    const first = peers[0]
    if (!first) throw new Error('peers')
    await until(() => peers.every((peer) => peer.store.graph.rootId === first.store.graph.rootId))
    const [ann, ben, cat] = peers
    if (!ann || !ben || !cat) throw new Error('peers')
    const page = pageOne(ann.store)

    const frame = ann.store.graph.createNode('FRAME', page, {
      id: 'qa:frame',
      name: 'Frame',
      width: 200,
      height: 120
    })
    await until(
      () =>
        ben.store.graph.getNode(frame.id) !== undefined &&
        cat.store.graph.getNode(frame.id) !== undefined
    )
    const rect = ben.store.graph.createNode('RECTANGLE', frame.id, { id: 'qa:rect', name: 'Rect' })
    const text = cat.store.graph.createNode('TEXT', frame.id, { id: 'qa:text', text: 'Hello' })
    ben.store.graph.updateNode(rect.id, { name: 'Ben rect' })
    cat.store.graph.updateNode(text.id, { text: 'Cat text' })
    ann.store.graph.createNode('TEXT', page, { id: 'qa:ann-text', text: 'Ann text' })
    await until(() => peers.every((peer) => peer.store.graph.getNode('qa:ann-text') !== undefined))
    await until(() =>
      peers.every((peer) => peer.store.graph.getNode('qa:text')?.text === 'Cat text')
    )
    expectSame(peers)
  })

  test('a late peer receives layers, text, pages, and variables', async () => {
    const relay = await startTestRelay()
    cleanups.push(() => relay.close())
    const documentId = crypto.randomUUID()
    const host = openPeer(relay, documentId, 'Host')
    cleanups.push(host.stop)
    await until(() => host.room.session.roomHasDocument())
    const page = pageOne(host.store)
    const text = host.store.graph.createNode('TEXT', page, { id: 'qa:text', text: 'Late read' })
    host.store.graph.updateNode(text.id, { textCase: 'UPPER', textAlignHorizontal: 'CENTER' })
    const page2 = host.store.graph.addPage('Second')
    host.store.graph.createNode('RECTANGLE', page2.id, { id: 'qa:page2-rect' })
    const collection = host.store.graph.createCollection('QA')
    const variable = host.store.graph.createVariable('QA color', 'COLOR', collection.id, {
      r: 0,
      g: 0,
      b: 0,
      a: 1
    })
    host.store.updateVariableValue(variable.id, collection.defaultModeId, {
      r: 1,
      g: 0,
      b: 0,
      a: 1
    })

    const late = openPeer(relay, documentId, 'Late')
    cleanups.push(late.stop)
    await until(() => late.store.graph.getNode('qa:page2-rect') !== undefined)
    await until(() =>
      [...late.store.graph.variables.values()].some((item) => item.name === 'QA color')
    )
    expectSame([host, late])
    expect(pageFacts(late.store).map((item) => item.name)).toContain('Second')
    expect(late.store.graph.getNode('qa:text')?.textCase).toBe('UPPER')
  })

  test('the relay keeps the room for a peer that rejoins', async () => {
    const relay = await startTestRelay()
    cleanups.push(() => relay.close())
    const documentId = crypto.randomUUID()
    const first = openPeer(relay, documentId, 'First')
    await until(() => nodeFacts(first.store).length > 0)
    const page = pageOne(first.store)
    first.store.graph.createNode('RECTANGLE', page, { id: 'qa:kept', name: 'Kept' })
    await until(() => [...relay.states.values()].length > 0)
    first.stop()
    await until(() => relay.states.size > 0)
    const again = openPeer(relay, documentId, 'Again')
    cleanups.push(again.stop)
    await until(() => again.store.graph.getNode('qa:kept') !== undefined)
    expect(again.store.graph.getNode('qa:kept')?.name).toBe('Kept')
  })

  test('layer operations, text, pages, variables, and components converge', async () => {
    const relay = await startTestRelay()
    cleanups.push(() => relay.close())
    const documentId = crypto.randomUUID()
    const peers = [
      openPeer(relay, documentId, 'Ann'),
      openPeer(relay, documentId, 'Ben'),
      openPeer(relay, documentId, 'Cat')
    ]
    cleanups.push(...peers.map((peer) => peer.stop))
    await until(() => peers.every((peer) => peer.room.session.roomHasDocument()))
    const [ann, ben, cat] = peers
    if (!ann || !ben || !cat) throw new Error('peers')
    await until(() => peers.every((peer) => peer.store.graph.rootId === ann.store.graph.rootId))
    const page = pageOne(ann.store)
    await until(() => peers.every((peer) => peer.store.graph.getNode(page) !== undefined))

    const frame = ann.store.graph.createNode('FRAME', page, {
      id: 'op:frame',
      name: 'Frame',
      width: 300,
      height: 200
    })
    const nested = ann.store.graph.createNode('FRAME', page, {
      id: 'op:nested',
      name: 'Nested',
      width: 120,
      height: 80,
      x: 400
    })
    await until(() => peers.every((peer) => peer.store.graph.getNode(nested.id) !== undefined))
    const rect = cat.store.graph.createNode('RECTANGLE', nested.id, {
      id: 'op:rect',
      name: 'Rect',
      width: 80,
      height: 40
    })
    await until(() => peers.every((peer) => peer.store.graph.getNode('op:rect') !== undefined))

    ann.store.graph.updateNode(rect.id, { x: 12, y: 24, name: 'Ann name' })
    ben.store.graph.updateNode(rect.id, { width: 180, height: 90, name: 'Ben name' })
    cat.store.graph.insertChildAt(rect.id, frame.id, 0)
    await until(() =>
      peers.every(
        (peer) =>
          peer.store.graph.getNode(rect.id)?.width === 180 &&
          peer.store.graph.getNode(rect.id)?.parentId === frame.id
      )
    )

    const label = ann.store.graph.createNode('TEXT', page, { id: 'op:label', text: 'start' })
    await until(() => peers.every((peer) => peer.store.graph.getNode(label.id) !== undefined))
    ben.store.graph.updateNode(label.id, { text: 'Ben text' })
    cat.store.graph.updateNode(label.id, { text: 'Cat text' })
    await until(() =>
      peers.every(
        (peer) =>
          peer.store.graph.getNode(label.id)?.text === peers[0]?.store.graph.getNode(label.id)?.text
      )
    )

    const second = ann.store.graph.addPage('Second')
    const third = ben.store.graph.addPage('Third')
    await until(() =>
      peers.every(
        (peer) => peer.store.graph.getNode(second.id) && peer.store.graph.getNode(third.id)
      )
    )
    cat.store.graph.insertChildAt(third.id, ann.store.graph.rootId, 1)

    const collection = ann.store.graph.createCollection('Theme')
    const color = ann.store.graph.createVariable('Brand', 'COLOR', collection.id, {
      r: 0,
      g: 0,
      b: 0,
      a: 1
    })
    ann.store.updateVariableValue(color.id, collection.defaultModeId, { r: 0, g: 0, b: 0, a: 1 })
    await until(() => peers.every((peer) => peer.store.graph.variables.has(color.id)))
    ben.store.updateVariableValue(color.id, collection.defaultModeId, { r: 1, g: 0, b: 0, a: 1 })
    cat.store.updateVariableValue(color.id, collection.defaultModeId, { r: 0, g: 0, b: 1, a: 1 })

    const component = ann.store.graph.createNode('COMPONENT', page, {
      id: 'op:component',
      name: 'Button',
      width: 100,
      height: 50
    })
    const main = ann.store.graph.createNode('RECTANGLE', component.id, {
      id: 'op:main',
      name: 'Main',
      width: 100,
      height: 50
    })
    await until(() => peers.every((peer) => peer.store.graph.getNode(main.id) !== undefined))
    const instance = ben.store.graph.createInstance(component.id, page, { id: 'op:instance' })
    if (!instance) throw new Error('instance')
    await until(() => peers.every((peer) => peer.store.graph.getNode(instance.id) !== undefined))
    const copy = instance.childIds[0]
    if (!copy) throw new Error('copy')
    await until(() => peers.every((peer) => peer.store.graph.getNode(copy) !== undefined))
    ann.store.updateNode(main.id, { width: 140, fills: [] })
    ben.store.updateNode(copy, { name: 'Ben override' })
    await until(() =>
      peers.every((peer) => peer.store.graph.getNode(instance.id)?.childIds[0] === copy)
    )

    await until(() =>
      peers.every(
        (peer) =>
          JSON.stringify(nodeFacts(peer.store)) === JSON.stringify(nodeFacts(ann.store)) &&
          JSON.stringify(pageFacts(peer.store)) === JSON.stringify(pageFacts(ann.store)) &&
          JSON.stringify(variableFacts(peer.store)) === JSON.stringify(variableFacts(ann.store))
      )
    )
    expectSame(peers)
  })

  test('seeded concurrent edits converge (seed 20261120)', async () => {
    const seed = 20261120
    let state = seed >>> 0
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0
      return state / 4294967296
    }
    const relay = await startTestRelay()
    cleanups.push(() => relay.close())
    const documentId = crypto.randomUUID()
    const peers = [
      openPeer(relay, documentId, 'Ann'),
      openPeer(relay, documentId, 'Ben'),
      openPeer(relay, documentId, 'Cat')
    ]
    cleanups.push(...peers.map((peer) => peer.stop))
    await until(() => peers.every((peer) => peer.room.session.roomHasDocument()))
    const [ann, ben, cat] = peers
    if (!ann || !ben || !cat) throw new Error('peers')
    await until(() => peers.every((peer) => peer.store.graph.rootId === ann.store.graph.rootId))
    const page = pageOne(ann.store)
    await until(() => peers.every((peer) => peer.store.graph.getNode(page) !== undefined))
    const shared = ann.store.graph.createNode('FRAME', page, {
      id: 'rnd:shared',
      name: 'Shared',
      width: 600,
      height: 400
    })
    await until(() => peers.every((peer) => peer.store.graph.getNode(shared.id) !== undefined))

    const owned = peers.map((peer, index) => {
      const frame = peer.store.graph.createNode('FRAME', page, {
        id: `rnd:frame:${index}`,
        name: `Frame ${index}`,
        width: 200,
        height: 120
      })
      const text = peer.store.graph.createNode('TEXT', frame.id, {
        id: `rnd:text:${index}`,
        text: `Text ${index}`
      })
      return { peer, index, frame: frame.id, nodes: [frame.id, text.id], created: 0 }
    })
    await until(() =>
      peers.every((peer) =>
        owned.every(({ nodes }) => nodes.every((id) => peer.store.graph.getNode(id) !== undefined))
      )
    )

    const collection = ann.store.graph.createCollection('Random theme')
    const color = ann.store.graph.createVariable('Random color', 'COLOR', collection.id, {
      r: 0,
      g: 0,
      b: 0,
      a: 1
    })
    ann.store.updateVariableValue(color.id, collection.defaultModeId, {
      r: 0.5,
      g: 0.5,
      b: 0.5,
      a: 1
    })
    await until(() => peers.every((peer) => peer.store.graph.variables.has(color.id)))
    const pages = [ann.store.graph.addPage('Random A'), ben.store.graph.addPage('Random B')]
    await until(() =>
      peers.every((peer) => pages.every((item) => peer.store.graph.getNode(item.id)))
    )

    for (let step = 0; step < 24; step++) {
      for (const entry of owned) {
        const { peer, frame, nodes } = entry
        const id = nodes[Math.floor(random() * nodes.length)]
        if (!id) continue
        const node = peer.store.graph.getNode(id)
        if (!node) continue
        const choice = Math.floor(random() * 6)
        if (choice === 0) {
          peer.store.graph.updateNode(id, {
            x: Math.floor(random() * 100),
            y: Math.floor(random() * 80)
          })
        } else if (choice === 1) {
          peer.store.graph.updateNode(id, {
            width: 40 + Math.floor(random() * 120),
            height: 30 + Math.floor(random() * 90)
          })
        } else if (choice === 2) {
          peer.store.graph.updateNode(id, { name: `Step ${step}` })
        } else if (choice === 3 && node.type === 'TEXT') {
          peer.store.graph.updateNode(id, { text: `Seed ${seed} step ${step}` })
        } else if (choice === 4) {
          peer.store.graph.reparentNode(id, id === frame ? shared.id : frame)
        } else if (entry.created < 2) {
          const child = peer.store.graph.createNode('RECTANGLE', frame, {
            id: `rnd:${entry.index}:${entry.created}`,
            name: `Created ${entry.created}`
          })
          nodes.push(child.id)
          entry.created += 1
        } else {
          peer.store.updateVariableValue(color.id, collection.defaultModeId, {
            r: random(),
            g: random(),
            b: random(),
            a: 1
          })
        }
      }
    }
    const secondRandomPage = pages[1]
    if (!secondRandomPage) throw new Error('pages')
    cat.store.graph.insertChildAt(secondRandomPage.id, ann.store.graph.rootId, 1)

    await until(
      () =>
        peers.every(
          (peer) =>
            JSON.stringify(nodeFacts(peer.store)) === JSON.stringify(nodeFacts(ann.store)) &&
            JSON.stringify(pageFacts(peer.store)) === JSON.stringify(pageFacts(ann.store)) &&
            JSON.stringify(variableFacts(peer.store)) === JSON.stringify(variableFacts(ann.store))
        ),
      1000
    )
    expectSame(peers)
  })

  test('deleting a layer wins over a concurrent edit', async () => {
    const relay = await startTestRelay()
    cleanups.push(() => relay.close())
    const documentId = crypto.randomUUID()
    const author = openPeer(relay, documentId, 'Author')
    const remover = openPeer(relay, documentId, 'Remover')
    cleanups.push(author.stop, remover.stop)
    await until(
      () => author.room.session.roomHasDocument() && remover.room.session.roomHasDocument()
    )
    const page = pageOne(author.store)
    author.store.graph.createNode('RECTANGLE', page, { id: 'del:rect', name: 'Original' })
    await until(() => remover.store.graph.getNode('del:rect') !== undefined)
    remover.store.graph.deleteNode('del:rect')
    author.store.graph.updateNode('del:rect', { name: 'Edited' })
    await until(
      () =>
        author.store.graph.getNode('del:rect') === undefined &&
        remover.store.graph.getNode('del:rect') === undefined
    )
    expectSame([author, remover])
  })

  test('a peer edits offline and catches up after reconnecting', async () => {
    const relay = await startTestRelay()
    cleanups.push(() => relay.close())
    const documentId = crypto.randomUUID()
    let offline = false
    const sockets: WebSocket[] = []
    const createSocket = (url: string) => {
      const socket = new WebSocket(url)
      sockets.push(socket)
      // A blackholed network: the socket opens, but nothing sent or received crosses it.
      const send = socket.send.bind(socket)
      Object.defineProperty(socket, 'send', {
        value: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
          if (!offline) Reflect.apply(send, socket, [data])
        }
      })
      socket.addEventListener('message', (event) => {
        if (offline) event.stopImmediatePropagation()
      })
      return socket
    }
    const host = openPeer(relay, documentId, 'Host')
    const watcher = openPeer(relay, documentId, 'Watcher')
    const traveller = openPeer(relay, documentId, 'Traveller', {
      createSocket,
      reconnectDelayMs: () => 10
    })
    cleanups.push(host.stop, watcher.stop, traveller.stop)
    await until(
      () =>
        host.room.session.roomHasDocument() &&
        watcher.room.session.roomHasDocument() &&
        traveller.room.session.roomHasDocument()
    )
    await until(() =>
      [watcher, traveller].every((peer) => peer.store.graph.rootId === host.store.graph.rootId)
    )
    const page = pageOne(host.store)
    host.store.graph.createNode('RECTANGLE', page, { id: 'offline:shared', name: 'Shared' })
    await until(() => traveller.store.graph.getNode('offline:shared') !== undefined)

    offline = true
    sockets.at(-1)?.close(1001, 'offline')
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 60)
    })
    traveller.store.graph.updateNode('offline:shared', { name: 'Offline edit' })
    const online = host.store.graph.createNode('RECTANGLE', page, {
      id: 'offline:online',
      name: 'Online edit',
      x: 80
    })
    await until(() => watcher.store.graph.getNode(online.id)?.name === 'Online edit')
    offline = false
    sockets.at(-1)?.close(1000, 'back online')
    await until(() => traveller.store.graph.getNode(online.id)?.name === 'Online edit')
    await until(() => host.store.graph.getNode('offline:shared')?.name === 'Offline edit')
    const peers = [host, watcher, traveller]
    await until(() =>
      peers.every(
        (peer) => JSON.stringify(nodeFacts(peer.store)) === JSON.stringify(nodeFacts(host.store))
      )
    )
    expectSame(peers)
  })

  test('undo does not bring back a layer another peer deleted', async () => {
    const relay = await startTestRelay()
    cleanups.push(() => relay.close())
    const documentId = crypto.randomUUID()
    const author = openPeer(relay, documentId, 'Author')
    const remover = openPeer(relay, documentId, 'Remover')
    cleanups.push(author.stop, remover.stop)
    await until(() => nodeFacts(author.store).length > 0 && nodeFacts(remover.store).length > 0)
    const page = pageOne(author.store)
    author.store.graph.createNode('RECTANGLE', page, { id: 'qa:doomed', name: 'Original' })
    await until(() => remover.store.graph.getNode('qa:doomed')?.name === 'Original')
    author.store.graph.updateNode('qa:doomed', { name: 'Changed' })
    remover.store.graph.deleteNode('qa:doomed')
    await until(() => author.store.graph.getNode('qa:doomed') === undefined)
    author.store.undoAction()
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 30)
    })
    expect(author.store.graph.getNode('qa:doomed')).toBeUndefined()
    expect(remover.store.graph.getNode('qa:doomed')).toBeUndefined()
  })
})
