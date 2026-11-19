import { afterEach, describe, expect, test } from 'bun:test'

import { readReloadSource } from '@/app/document/io/reload-source'
import { chooseTauriFigSavePath } from '@/app/document/io/save/targets'
import { createDocumentWriter } from '@/app/document/io/write'

import { clearTauriMocks, mockTauriIPC } from '#tests/helpers/tauri/mocks'

afterEach(async () => {
  await clearTauriMocks()
  Reflect.deleteProperty(globalThis, 'window')
})

describe('Tauri document IO helpers', () => {
  test('reads reload source bytes through plugin-fs', async () => {
    const fixture = await Bun.file('tests/fixtures/circle-text.fig').arrayBuffer()
    await mockTauriIPC((cmd, args) => {
      expect(cmd).toBe('plugin:fs|read_file')
      expect(args).toEqual({ path: '/tmp/document.fig', options: undefined })
      return [...new Uint8Array(fixture)]
    })

    const document = await readReloadSource({
      filePath: '/tmp/document.fig',
      fileHandle: null
    })

    expect(document?.getPages().length).toBeGreaterThan(0)
  })

  test('an interrupted desktop write leaves the previous file and does not record a save', async () => {
    const files = new Map<string, Uint8Array>([['/tmp/document.fig', new Uint8Array([9, 9, 9])]])
    await mockTauriIPC((cmd, args, options) => {
      const headers = (options as { headers?: { path?: string } } | undefined)?.headers
      const path = decodeURIComponent(headers?.path ?? '')
      // The fs plugin truncates the target before the write. A command that renames publishes
      // nothing when it throws first.
      if (cmd === 'plugin:fs|write_file') {
        files.set(path, new Uint8Array())
        throw new Error('disk full')
      }
      if (cmd === 'write_document_file') throw new Error('disk full')
      return args
    })
    const savedVersions: number[] = []
    let cleanedUp = false
    const write = createDocumentWriter({
      state: { documentName: 'Document' },
      getFilePath: () => '/tmp/document.fig',
      getFileHandle: () => null,
      getStorageBinding: () => null,
      setSavedVersion: (version) => savedVersions.push(version),
      setLastWriteTime: () => undefined,
      onWriteSuccess: () => {
        cleanedUp = true
      }
    })

    await expect(write(new Uint8Array([1, 2, 3]), 7)).rejects.toThrow('disk full')
    expect([...(files.get('/tmp/document.fig') ?? [])]).toEqual([9, 9, 9])
    expect(savedVersions).toEqual([])
    expect(cleanedUp).toBe(false)
  })

  test('writes document bytes by replacing the file after it is fully written', async () => {
    const calls: Array<{ cmd: string; args: unknown; options: unknown }> = []
    await mockTauriIPC((cmd, args, options) => {
      calls.push({ cmd, args, options })
      return null
    })
    const savedVersions: number[] = []
    const write = createDocumentWriter({
      state: { documentName: 'Document' },
      getFilePath: () => '/tmp/document.fig',
      getFileHandle: () => null,
      getStorageBinding: () => null,
      setSavedVersion: (version) => savedVersions.push(version),
      setLastWriteTime: () => undefined
    })

    await write(new Uint8Array([1, 2, 3]), 42)

    expect(calls).toHaveLength(1)
    expect(calls[0]?.cmd).toBe('write_document_file')
    expect([...new Uint8Array(calls[0]?.args as ArrayBuffer)]).toEqual([1, 2, 3])
    expect(calls[0]?.options).toEqual({
      headers: { path: '%2Ftmp%2Fdocument.fig' }
    })
    expect(savedVersions).toEqual([42])
  })

  test('keeps a completed write successful when recovery cleanup fails', async () => {
    await mockTauriIPC(() => null)
    const savedVersions: number[] = []
    const write = createDocumentWriter({
      state: { documentName: 'Document' },
      getFilePath: () => '/tmp/document.fig',
      getFileHandle: () => null,
      getStorageBinding: () => null,
      setSavedVersion: (version) => savedVersions.push(version),
      setLastWriteTime: () => undefined,
      onWriteSuccess: () => Promise.reject(new Error('IndexedDB blocked'))
    })

    await expect(write(new Uint8Array([1]), 17)).resolves.toBe(true)
    expect(savedVersions).toEqual([17])
  })

  test('chooses a Tauri save path through plugin-dialog', async () => {
    await mockTauriIPC((cmd, args) => {
      expect(cmd).toBe('plugin:dialog|save')
      expect(args).toEqual({
        options: {
          defaultPath: 'Untitled.fig',
          filters: [{ name: 'Figma file', extensions: ['fig'] }]
        }
      })
      return '/tmp/Untitled.fig'
    })

    await expect(chooseTauriFigSavePath('design')).resolves.toBe('/tmp/Untitled.fig')
  })

  test('saves a board as a FigJam .jam', async () => {
    await mockTauriIPC((cmd, args) => {
      expect(cmd).toBe('plugin:dialog|save')
      expect(args).toEqual({
        options: {
          defaultPath: 'Untitled.jam',
          filters: [{ name: 'FigJam board', extensions: ['jam'] }]
        }
      })
      return '/tmp/Untitled.jam'
    })

    await expect(chooseTauriFigSavePath('board')).resolves.toBe('/tmp/Untitled.jam')
  })
})
