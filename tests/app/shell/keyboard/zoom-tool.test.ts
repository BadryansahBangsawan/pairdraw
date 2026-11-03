import { describe, expect, test } from 'bun:test'

import {
  createZoomKeySpring,
  toolAfterZoomKey,
  ZOOM_TOOL_HOLD_MS,
  type ZoomKeyStore
} from '@/app/shell/keyboard/zoom-tool'

describe('the Z key', () => {
  test('a quick tap keeps the zoom tool', () => {
    expect(toolAfterZoomKey('PEN', 'ZOOM', 40, false)).toBeNull()
  })

  test('holding Z goes back to the tool before on release', () => {
    expect(toolAfterZoomKey('PEN', 'ZOOM', ZOOM_TOOL_HOLD_MS, false)).toBe('PEN')
  })

  test('zooming with Z held goes back to the tool before, however quick', () => {
    expect(toolAfterZoomKey('SELECT', 'ZOOM', 40, true)).toBe('SELECT')
  })

  test('leaves the tool alone when Z did not pick the zoom tool or it was already on', () => {
    expect(toolAfterZoomKey('SELECT', 'SELECT', 1000, true)).toBeNull()
    expect(toolAfterZoomKey('ZOOM', 'ZOOM', 1000, true)).toBeNull()
    expect(toolAfterZoomKey(null, 'ZOOM', 1000, true)).toBeNull()
  })
})

describe('the Z spring', () => {
  function setup() {
    let clock = 0
    const state: ZoomKeyStore['state'] = { activeTool: 'SELECT', panX: 0, panY: 0, zoom: 1 }
    const store: ZoomKeyStore = {
      state,
      setTool(tool) {
        state.activeTool = tool
      }
    }
    const spring = createZoomKeySpring(store, () => clock)
    /** Z goes down, and its shortcut picks the zoom tool. */
    const pressZ = () => {
      spring.press()
      store.setTool('ZOOM')
    }
    const wait = (ms: number) => {
      clock += ms
    }
    return { store, spring, pressZ, wait }
  }

  test('releasing Z mid-drag keeps the zoom tool until the button comes up', () => {
    const { store, spring, pressZ, wait } = setup()
    pressZ()
    spring.pointerDown()
    wait(400)
    spring.release()
    expect(store.state.activeTool).toBe('ZOOM')
    // The canvas finishes the zoom drag on the same release, before the tool comes back.
    spring.pointerUp()
    expect(store.state.activeTool).toBe('SELECT')
  })

  test('a quick Z with a click on the canvas counts as zooming with it', () => {
    const { store, spring, pressZ, wait } = setup()
    pressZ()
    spring.pointerDown()
    spring.pointerUp()
    wait(40)
    spring.release()
    expect(store.state.activeTool).toBe('SELECT')
  })

  test('a quick tap with no press keeps the zoom tool', () => {
    const { store, spring, pressZ, wait } = setup()
    pressZ()
    wait(40)
    spring.release()
    spring.pointerDown()
    spring.pointerUp()
    expect(store.state.activeTool).toBe('ZOOM')
  })

  test('a tool picked before the button comes up is left alone', () => {
    const { store, spring, pressZ, wait } = setup()
    pressZ()
    spring.pointerDown()
    wait(400)
    spring.release()
    store.setTool('PEN')
    spring.pointerUp()
    expect(store.state.activeTool).toBe('PEN')
  })

  test('losing focus mid-drag goes back to the tool before', () => {
    const { store, spring, pressZ, wait } = setup()
    pressZ()
    spring.pointerDown()
    wait(400)
    spring.reset()
    expect(store.state.activeTool).toBe('SELECT')
  })
})
