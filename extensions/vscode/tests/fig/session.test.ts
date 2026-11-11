import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { fromUint8Array } from 'js-base64'

interface FakeUri {
  readonly scheme: string
  readonly path: string
}

const files = new Map<string, Uint8Array>()
const errors: string[] = []

mock.module('vscode', () => ({
  Uri: { joinPath: (base: FakeUri) => base },
  window: {
    showErrorMessage: (message: string) => {
      errors.push(message)
      return Promise.resolve(undefined)
    }
  },
  workspace: {
    fs: {
      readFile: (uri: FakeUri) => Promise.resolve(files.get(uri.path) ?? new Uint8Array()),
      writeFile: (uri: FakeUri, data: Uint8Array) => {
        files.set(uri.path, data)
        return Promise.resolve()
      },
      delete: (uri: FakeUri) => {
        files.delete(uri.path)
        return Promise.resolve()
      },
      copy: () => Promise.resolve()
    }
  }
}))

// The mock must be registered before the module reads `vscode` at import time.
const { EditorSession, fileName } = await import('../../src/fig/session')

const uri: FakeUri = { scheme: 'file', path: '/workspace/drawing.fig' }
const document = { uri, dispose: () => undefined }

type MessageHandler = (message: unknown) => void

function createPanel() {
  let handler: MessageHandler = () => undefined
  const posted: unknown[] = []
  const panel = {
    webview: {
      postMessage: (message: unknown) => {
        posted.push(message)
        return Promise.resolve(true)
      },
      onDidReceiveMessage: (listener: MessageHandler) => {
        handler = listener
        return { dispose: () => undefined }
      }
    },
    reveal: () => undefined
  }
  return {
    panel,
    posted,
    send: (message: unknown) => handler(message)
  }
}

/** The panel and document shapes the session reads; the editor types are not loadable here. */
function openSession(onEdited: (document: unknown) => void = () => undefined) {
  const fake = createPanel()
  const session = new EditorSession(document as never, fake.panel as never, onEdited)
  return { ...fake, session }
}

function messageOfType(posted: unknown[], type: string): unknown {
  return posted.find((message) => (message as { type: string }).type === type)
}

beforeEach(() => {
  files.clear()
  errors.length = 0
})

describe('editor session', () => {
  test('loads the file on disk when the webview reports the editor connected', async () => {
    files.set(uri.path, new Uint8Array([1, 2, 3]))
    const { send, posted } = openSession()
    send({ type: 'connected' })
    await Promise.resolve()
    await Promise.resolve()
    expect(messageOfType(posted, 'load')).toEqual({
      type: 'load',
      name: 'drawing.fig',
      data: fromUint8Array(new Uint8Array([1, 2, 3]))
    })
  })

  test('asks the editor for its bytes and writes them to the requested destination', async () => {
    const destination: FakeUri = { scheme: 'file', path: '/workspace/copy.fig' }
    const { session, send, posted } = openSession()
    const saving = session.save(destination as never)
    expect(messageOfType(posted, 'save')).toEqual({ type: 'save', id: 1, format: 'fig' })
    send({ type: 'saved', id: 1, name: 'drawing.fig', data: fromUint8Array(new Uint8Array([7])) })
    await saving
    expect(files.get(destination.path)).toEqual(new Uint8Array([7]))
  })

  test('asks for pen text when the destination is a .pen file', async () => {
    const destination: FakeUri = { scheme: 'file', path: '/workspace/Card.PEN' }
    const { session, send, posted } = openSession()
    const saving = session.save(destination as never)
    expect(messageOfType(posted, 'save')).toEqual({ type: 'save', id: 1, format: 'pen' })
    send({
      type: 'saved',
      id: 1,
      name: 'card',
      data: fromUint8Array(new TextEncoder().encode('{"version":"1"}'))
    })
    await saving
    expect(new TextDecoder().decode(files.get(destination.path))).toBe('{"version":"1"}')
  })

  test('reports one edit per save cycle, not one per change', async () => {
    const edited: unknown[] = []
    const { session, send } = openSession((editedDocument) => edited.push(editedDocument))
    send({ type: 'documentchange' })
    send({ type: 'documentchange' })
    expect(edited).toHaveLength(1)
    const saving = session.save()
    send({ type: 'saved', id: 1, name: 'drawing.fig', data: '' })
    await saving
    send({ type: 'documentchange' })
    expect(edited).toHaveLength(2)
  })

  test('rejects a save with the editor message and shows it once', async () => {
    const { session, send } = openSession()
    const saving = session.save()
    send({ type: 'error', message: 'the document is too large' })
    await expect(saving).rejects.toThrow('the document is too large')
    expect(errors).toEqual(['Pairdraw: the document is too large'])
  })

  test('ignores a saved answer that does not match the pending save', async () => {
    const { session, send } = openSession()
    const saving = session.save()
    send({ type: 'saved', id: 99, name: 'other.fig', data: '' })
    let settled = false
    void saving.finally(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)
    send({ type: 'saved', id: 1, name: 'drawing.fig', data: '' })
    await saving
  })

  test('rejects a pending save when the editor closes', async () => {
    const { session } = openSession()
    const saving = session.save()
    session.dispose()
    await expect(saving).rejects.toThrow('closed before the save finished')
  })

  test('keeps the file name in the embed, not the path', () => {
    expect(fileName(uri as never)).toBe('drawing.fig')
    expect(fileName({ scheme: 'file', path: '/a/b/c.pen' } as never)).toBe('c.pen')
  })
})