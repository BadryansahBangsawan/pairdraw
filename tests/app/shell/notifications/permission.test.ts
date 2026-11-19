import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { asDouble } from '#tests/helpers/doubles'

/**
 * A PermissionStatus as Chromium 150 hands it out for `notifications`: `addEventListener`
 * throws `Illegal invocation`, while the `onchange` property works. The module must load and
 * keep the permission current anyway; a throw here once failed the whole app boot.
 */
class HostilePermissionStatus {
  state = 'prompt'
  onchange: (() => void) | null = null
  addEventListener(): void {
    throw new TypeError('Illegal invocation')
  }
  removeEventListener(): void {
    throw new TypeError('Illegal invocation')
  }
}

const status = new HostilePermissionStatus()
const hadNavigator = Object.hasOwn(globalThis, 'navigator')
const previousNavigator = globalThis.navigator
const notificationDouble = { permission: 'default' }
const hadNotification = 'Notification' in globalThis
const previousNotification = 'Notification' in globalThis ? globalThis.Notification : undefined

beforeAll(() => {
  globalThis.navigator = asDouble<Navigator>({
    permissions: { query: async () => status }
  })
  globalThis.Notification = asDouble<typeof Notification>(notificationDouble)
})
afterAll(() => {
  if (hadNavigator) globalThis.navigator = previousNavigator
  else Reflect.deleteProperty(globalThis, 'navigator')
  if (hadNotification && previousNotification) globalThis.Notification = previousNotification
  else Reflect.deleteProperty(globalThis, 'Notification')
})

describe('browser notification permission', () => {
  test('loads even where PermissionStatus.addEventListener throws', async () => {
    const { browserNotificationPermission } = await import('@/app/shell/notifications/permission')
    expect(browserNotificationPermission.value).toBe('default')
  })

  test('follows the site setting through onchange', async () => {
    const { browserNotificationPermission } = await import('@/app/shell/notifications/permission')
    // The first read starts the query; the handler is set once that resolves.
    for (let turn = 0; turn < 50 && status.onchange === null; turn++) await Promise.resolve()
    expect(status.onchange).toBeFunction()
    notificationDouble.permission = 'granted'
    status.state = 'granted'
    status.onchange?.()
    expect(browserNotificationPermission.value).toBe('granted')
  })
})
