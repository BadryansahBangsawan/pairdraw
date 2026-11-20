import { beforeEach, describe, expect, test } from 'bun:test'

import { fromUint8Array } from 'js-base64'

import type { FigDocument } from '#vscode/fig/provider'
import { FigEditorProvider } from '#vscode/fig/provider'
import type { EditorProviderHost } from '#vscode/host'

const files = new Map<string, Uint8Array>()

interface FakeURI {
  scheme: string
  path: string
  toString(): string
}

function uriOf(path: string): FakeURI {
  return { scheme: 'file', path, toString: () => `file://${path}` }
}

/**
 * The VS Code surface the provider reaches for, over the in-memory `files` map. It is the same
 * shape the extension host binds to the real editor (`vscode-host.ts`), so the provider runs here
 * unchanged.
 */
const host: EditorProviderHost = {
  readFile: (uri) => Promise.resolve(files.get(uri.path) ?? new Uint8Array()),
  writeFile: (uri, data) => {
    files.set(uri.path, data)
    return Promise.resolve()
  },
  showError: () => undefined,
  saveDialog: () => Promise.resolve(undefined),
  joinPath: (base, ...parts) => uriOf([base.path, ...parts].join('/')) as never,
  parseURI: (value) => uriOf(value.replace(/^file:\/\//, '')) as never,
  configuredEditorURL: () => 'http://localhost:1420',
  copyFile: (from, to) => {
    files.set(to.path, files.get(from.path) ?? new Uint8Array())
    return Promise.resolve()
  },
  deleteFile: (uri) => {
    files.delete(uri.path)
    return Promise.resolve()
  },
  createEventEmitter: () => {
    const listeners = new Set<(event: never) => void>()
    return {
      event: (listener: (event: never) => void) => {
        listeners.add(listener)
        return { dispose: () => listeners.delete(listener) }
      },
      fire: (event: never) => {
        for (const listener of listeners) listener(event)
      },
      dispose: () => listeners.clear()
    } as never
  }
}

const documentPath = '/workspace/drawing.fig'
const backupPath = '/workspace/.backup/drawing.fig'

function openDocument(backupId?: string): FigDocument {
  return { uri: uriOf(documentPath), backupId, dispose: () => undefined } as never
}

function createPanel() {
  let handler: (message: unknown) => void = () => undefined
  const posted: unknown[] = []
  const uri = uriOf('/workspace/extension/dist/webview.js')
  const panel = {
    webview: {
      cspSource: 'vscode-webview:',
      options: {},
      html: '',
      asWebviewUri: () => uri,
      postMessage: (message: unknown) => {
        posted.push(message)
        return Promise.resolve(true)
      },
      onDidReceiveMessage: (listener: (message: unknown) => void) => {
        handler = listener
        return { dispose: () => undefined }
      }
    },
    onDidDispose: () => ({ dispose: () => undefined }),
    reveal: () => undefined
  }
  return {
    panel,
    posted,
    send: (message: unknown) => handler(message)
  }
}

/** Resolves an editor for the document, as VS Code does again after the webview is torn down. */
function resolve(provider: FigEditorProvider, document: FigDocument) {
  const fake = createPanel()
  provider.resolveCustomEditor(document, fake.panel as never, {
    isCancellationRequested: false
  } as never)
  return fake
}

function messageOfType(posted: unknown[], type: string): unknown {
  return posted.find(
    (message) =>
      typeof message === 'object' && message !== null && 'type' in message && message.type === type
  )
}

/** Lets a load the session started settle; it awaits the file read, then posts. */
async function settled() {
  for (let tick = 0; tick < 10; tick++) await Promise.resolve()
}

function createProvider() {
  return new FigEditorProvider(uriOf('/workspace/extension') as never, host)
}

beforeEach(() => {
  files.clear()
})

describe('fig document backup lifetime', () => {
  test('a session resolved after a save reads the saved file, not the restored backup', async () => {
    files.set(documentPath, new Uint8Array([1]))
    files.set(backupPath, new Uint8Array([9, 9]))
    const provider = createProvider()
    const document = openDocument(`file://${backupPath}`)

    const first = resolve(provider, document)
    first.send({ type: 'connected' })
    await settled()
    expect(messageOfType(first.posted, 'load')).toMatchObject({
      data: fromUint8Array(new Uint8Array([9, 9]))
    })

    // VS Code deletes the backup once the save lands.
    const saving = provider.saveCustomDocument(document)
    first.send({
      type: 'saved',
      id: 1,
      name: 'drawing.fig',
      data: fromUint8Array(new Uint8Array([7]))
    })
    await saving
    files.delete(backupPath)

    const second = resolve(provider, document)
    second.send({ type: 'connected' })
    await settled()
    expect(messageOfType(second.posted, 'load')).toMatchObject({
      data: fromUint8Array(new Uint8Array([7]))
    })
  })

  test('a session resolved after a revert reads the file on disk', async () => {
    files.set(documentPath, new Uint8Array([1]))
    files.set(backupPath, new Uint8Array([9, 9]))
    const provider = createProvider()
    const document = openDocument(`file://${backupPath}`)

    resolve(provider, document)
    await provider.revertCustomDocument(document)
    files.delete(backupPath)

    const next = resolve(provider, document)
    next.send({ type: 'connected' })
    await settled()
    expect(messageOfType(next.posted, 'load')).toMatchObject({
      data: fromUint8Array(new Uint8Array([1]))
    })
  })

  test('a new backup becomes the one a later session restores', async () => {
    files.set(documentPath, new Uint8Array([1]))
    const provider = createProvider()
    const document = openDocument()

    const first = resolve(provider, document)
    first.send({ type: 'connected' })
    await settled()

    // A hot exit writes the editor's current bytes to a new backup, then the webview is torn down.
    const destination = uriOf('/workspace/.backup/newer.fig')
    const backing = provider.backupCustomDocument(
      document,
      { destination, reason: 'save' } as never,
      { isCancellationRequested: false } as never
    )
    first.send({
      type: 'saved',
      id: 1,
      name: 'drawing.fig',
      data: fromUint8Array(new Uint8Array([5]))
    })
    expect((await backing).id).toBe(`file://${destination.path}`)
    expect(files.get(destination.path)).toEqual(new Uint8Array([5]))

    // The file on disk still holds the older bytes, so only the backup holds what the editor showed.
    const next = resolve(provider, document)
    next.send({ type: 'connected' })
    await settled()
    expect(messageOfType(next.posted, 'load')).toMatchObject({
      data: fromUint8Array(new Uint8Array([5]))
    })
  })
})
