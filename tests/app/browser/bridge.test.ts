import { expect, test } from 'bun:test'

import { installNavigationHooks } from '@/app/browser/bridge'
import type { EditorStore } from '@/app/editor/session/create'
import type { NavigationBenchmarkHooks } from '@/app/performance/navigation/hooks'

// The hook is a page global that follows the newest activated store; its disposal must not remove a
// newer store's hook, which is what an older tab's close would otherwise do.
function testHooks(): { navigation?: NavigationBenchmarkHooks } {
  return {}
}

const store = () => ({}) as EditorStore

test('the navigation hook goes when its store is disposed', () => {
  const hooks = testHooks()
  const dispose = installNavigationHooks(hooks, store())

  expect(hooks.navigation).toBeDefined()
  dispose()

  expect(hooks.navigation).toBeUndefined()
})

test('an older store’s disposal keeps the newest store’s hook', () => {
  const hooks = testHooks()
  const disposeOlder = installNavigationHooks(hooks, store())
  const disposeNewest = installNavigationHooks(hooks, store())
  const newest = hooks.navigation

  expect(newest).toBeDefined()
  disposeOlder()
  expect(hooks.navigation).toBe(newest)

  disposeNewest()
  expect(hooks.navigation).toBeUndefined()
})
