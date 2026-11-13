import { afterEach, describe, expect, test } from 'bun:test'

import {
  PLUGIN_POINTER_BUSY_MESSAGE,
  PLUGIN_POINTER_CANCELLED_MESSAGE
} from '@/app/plugins/messages'
import {
  addPluginPointerPoint,
  beginPluginPointer,
  cancelPluginPointer,
  endPluginPointer,
  pluginPointerHolder
} from '@/app/plugins/pointer'

afterEach(() => cancelPluginPointer())

describe('the plugin pointer', () => {
  test('delivers the points in order and frees the pointer on release', async () => {
    const run = beginPluginPointer('marks')
    const sequence = run.request()
    expect(pluginPointerHolder.value).toBe('marks')
    addPluginPointerPoint({ x: 10, y: 20 })
    addPluginPointerPoint({ x: 30, y: 40 })
    endPluginPointer()
    expect(await sequence).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 }
    ])
    expect(pluginPointerHolder.value).toBeNull()

    const next = run.request()
    expect(pluginPointerHolder.value).toBe('marks')
    cancelPluginPointer()
    expect(await next).toBeNull()
  })

  test('a second plugin is refused while the first holds it', async () => {
    const first = beginPluginPointer('marks')
    const sequence = first.request()
    await expect(beginPluginPointer('grid').request()).rejects.toThrow(PLUGIN_POINTER_BUSY_MESSAGE)
    endPluginPointer()
    expect(await sequence).toEqual([])
  })

  test('a cancelled sequence refuses that run every later request', async () => {
    const run = beginPluginPointer('marks')
    const sequence = run.request()
    cancelPluginPointer()
    expect(await sequence).toBeNull()
    await expect(run.request()).rejects.toThrow(PLUGIN_POINTER_CANCELLED_MESSAGE)
    expect(pluginPointerHolder.value).toBeNull()
  })

  test('a completed sequence keeps the run able to ask again', async () => {
    const run = beginPluginPointer('marks')
    const first = run.request()
    addPluginPointerPoint({ x: 1, y: 2 })
    endPluginPointer()
    expect(await first).toEqual([{ x: 1, y: 2 }])

    const second = run.request()
    expect(pluginPointerHolder.value).toBe('marks')
    endPluginPointer()
    expect(await second).toEqual([])
  })

  test('a new run gets the pointer after the previous one was cancelled', async () => {
    const cancelled = beginPluginPointer('marks')
    const sequence = cancelled.request()
    cancelPluginPointer()
    expect(await sequence).toBeNull()

    const next = beginPluginPointer('marks')
    const again = next.request()
    expect(pluginPointerHolder.value).toBe('marks')
    endPluginPointer()
    expect(await again).toEqual([])
  })

  test('a run frees the pointer only when it is the holder', async () => {
    const held = beginPluginPointer('marks')
    const sequence = held.request()
    beginPluginPointer('grid').release()
    expect(pluginPointerHolder.value).toBe('marks')
    held.release()
    expect(await sequence).toBeNull()
    expect(pluginPointerHolder.value).toBeNull()
  })

  test('a point with no holder is ignored', () => {
    addPluginPointerPoint({ x: 1, y: 2 })
    expect(pluginPointerHolder.value).toBeNull()
  })
})
