import { afterEach, describe, expect, test } from 'bun:test'

import { PLUGIN_POINTER_BUSY_MESSAGE } from '@/app/plugins/messages'
import {
  addPluginPointerPoint,
  cancelPluginPointer,
  endPluginPointer,
  pluginPointerHolder,
  releasePluginPointer,
  requestPluginPointer
} from '@/app/plugins/pointer'

afterEach(() => cancelPluginPointer())

describe('the plugin pointer', () => {
  test('delivers the points in order and frees the pointer on release', async () => {
    const sequence = requestPluginPointer('marks')
    expect(pluginPointerHolder.value).toBe('marks')
    addPluginPointerPoint({ x: 10, y: 20 })
    addPluginPointerPoint({ x: 30, y: 40 })
    endPluginPointer()
    expect(await sequence).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 }
    ])
    expect(pluginPointerHolder.value).toBeNull()

    const next = requestPluginPointer('grid')
    expect(pluginPointerHolder.value).toBe('grid')
    cancelPluginPointer()
    expect(await next).toBeNull()
  })

  test('a second plugin is refused while the first holds it', async () => {
    const first = requestPluginPointer('marks')
    await expect(requestPluginPointer('grid')).rejects.toThrow(PLUGIN_POINTER_BUSY_MESSAGE)
    endPluginPointer()
    expect(await first).toEqual([])
  })

  test('cancelling ends the sequence with null', async () => {
    const sequence = requestPluginPointer('marks')
    addPluginPointerPoint({ x: 1, y: 2 })
    cancelPluginPointer()
    expect(await sequence).toBeNull()
    expect(pluginPointerHolder.value).toBeNull()
  })

  test('a run gives the pointer back only when it is the holder', async () => {
    const held = requestPluginPointer('marks')
    releasePluginPointer('grid')
    expect(pluginPointerHolder.value).toBe('marks')
    releasePluginPointer('marks')
    expect(await held).toBeNull()
  })

  test('a point with no holder is ignored', () => {
    addPluginPointerPoint({ x: 1, y: 2 })
    expect(pluginPointerHolder.value).toBeNull()
  })
})
