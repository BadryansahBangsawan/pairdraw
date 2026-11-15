import type { CSSRuntime } from '../types'
import { createBrowserCSSRuntime } from './browser/runtime'
import { createHeadlessCSSRuntime } from './headless/runtime'

export { createBrowserCSSRuntime } from './browser/runtime'
export type { BrowserCSSRuntimeOptions } from './browser/runtime'
export { createHeadlessCSSRuntime } from './headless/runtime'

export function createCSSRuntime(): CSSRuntime {
  return typeof document !== 'undefined' ? createBrowserCSSRuntime() : createHeadlessCSSRuntime()
}
