import { readonly, shallowRef } from 'vue'

import { IS_TAURI } from '@pairdraw/core/constants'

/** Whether this browser lets the page show notifications; `unsupported` where it has none. */
export type BrowserNotificationPermission = NotificationPermission | 'unsupported'

function current(): BrowserNotificationPermission {
  // The desktop shell needs no permission; whether the system shows notifications is up to its
  // own settings, which the app cannot read.
  if (IS_TAURI) return 'granted'
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

const permission = shallowRef(current())

// The person can change the site setting while the page is open. Follow it through the
// status's `onchange`: Chromium's notifications PermissionStatus throws on addEventListener
// (VueUse's usePermission registers one), which once failed the whole app boot.
async function followPermissionChanges(): Promise<void> {
  if (IS_TAURI || typeof navigator === 'undefined' || !('permissions' in navigator)) return
  try {
    const status = await navigator.permissions.query({ name: 'notifications' })
    status.onchange = () => {
      permission.value = current()
    }
  } catch (error) {
    // A browser that refuses the query keeps the permission it reported at load.
    console.warn('[Notifications] Permission query failed:', error)
  }
}

void followPermissionChanges()

/** The page's notification permission, kept current as the site setting changes. */
export const browserNotificationPermission = readonly(permission)

/**
 * Asks the browser for permission. It must run from a click: Firefox and Safari refuse requests
 * that are not, and a refused request is not asked again.
 */
export async function requestBrowserNotificationPermission(): Promise<void> {
  if (typeof Notification === 'undefined') return
  permission.value = await Notification.requestPermission()
}
