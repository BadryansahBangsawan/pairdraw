import { promiseTimeout } from '@vueuse/core'
import type { Ref } from 'vue'

import { toast } from '@/app/shell/ui'
import { isTauri } from '@/app/tauri/env'

import { checkUpdateFeed, isMissingUpdateFeed } from './feed'
import { updateFailureText, type UpdaterMessages } from './messages'
import { openUpdaterWindow } from './window'

const STARTUP_UPDATE_CHECK_DELAY_MS = 2500

interface UpdateCheckOptions {
  silent?: boolean
  messages: Ref<UpdaterMessages>
}

let startupCheckStarted = false
let updateCheckInFlight: Promise<void> | null = null
/** Whether the check in flight shows its outcome: one the person asked for joined it. */
let reportInFlight = false

export async function checkForAppUpdate(options: UpdateCheckOptions) {
  if (!isTauri()) return
  const { silent = false, messages } = options
  // A Check for Updates while the launch check runs shares its answer and still shows it.
  if (!silent) reportInFlight = true
  if (updateCheckInFlight) return updateCheckInFlight

  updateCheckInFlight = runUpdateCheck(messages).finally(() => {
    updateCheckInFlight = null
    reportInFlight = false
  })
  return updateCheckInFlight
}

export function scheduleStartupUpdateCheck(messages: Ref<UpdaterMessages>) {
  if (startupCheckStarted || !isTauri()) return
  startupCheckStarted = true
  void promiseTimeout(STARTUP_UPDATE_CHECK_DELAY_MS).then(() =>
    checkForAppUpdate({ silent: true, messages })
  )
}

// The main window only learns whether an update exists; the Software Update
// window checks again for its own handle, then shows the notes and installs.
async function runUpdateCheck(messages: Ref<UpdaterMessages>) {
  try {
    const update = await checkUpdateFeed()
    if (!update) {
      if (reportInFlight) toast.info(messages.value.upToDate)
      return
    }
    await update.close()
    await openUpdaterWindow(messages.value.windowTitle)
  } catch (error) {
    if (!reportInFlight) return
    const message = error instanceof Error ? error.message : String(error)
    // A build without an update feed makes no request, so asking is not a failed check.
    if (isMissingUpdateFeed(message)) toast.info(messages.value.notConfigured)
    else toast.warning(updateFailureText(messages.value, 'check', message))
  }
}
