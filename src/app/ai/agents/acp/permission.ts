import type { RequestPermissionRequest, RequestPermissionResponse } from '@agentclientprotocol/sdk'
import { useEventListener } from '@vueuse/core'
import { computed, shallowRef } from 'vue'

import { ACP_PERMISSION_TIMEOUT_MS, AGENT_INPUT_NOTIFY_DELAY_MS } from '@/constants'

export interface PendingPermission {
  request: RequestPermissionRequest
  resolve: (response: RequestPermissionResponse) => void
  timer: ReturnType<typeof setTimeout>
  /** Calls `onUnanswered` if the request is still waiting by then. */
  notice: ReturnType<typeof setTimeout> | null
  /**
   * What the dialog says is asked, in the person's language, for a request the app makes itself;
   * an agent's request shows the agent's own wording.
   */
  description?: string
}

export interface PermissionRequestOptions {
  /** Rejects the request and takes it from the dialog, as when the reply that asked stops. */
  signal?: AbortSignal
  description?: string
  /** How long the request waits before it is rejected; agents' requests wait a minute. */
  timeoutMs?: number
  /** Called when the request is rejected because nobody answered it in time. */
  onTimeout?: () => void
}

export const permissionQueue = shallowRef<PendingPermission[]>([])
export const currentPermission = computed(() => permissionQueue.value[0] ?? null)

function findRejectOption(request: RequestPermissionRequest): string {
  const reject = request.options.find((o) => o.kind.startsWith('reject'))
  return reject?.optionId ?? request.options.at(0)?.optionId ?? ''
}

function removeEntry(entry: PendingPermission) {
  clearTimeout(entry.timer)
  if (entry.notice) clearTimeout(entry.notice)
  permissionQueue.value = permissionQueue.value.filter((e) => e !== entry)
}

/**
 * Queues the request for the permission dialog. One left unanswered for a few seconds calls
 * `onUnanswered`, which notifies the person, as one answered at once needs no notification; it is
 * rejected once it times out.
 */
export function requestPermissionFromUser(
  params: RequestPermissionRequest,
  onUnanswered?: () => void,
  {
    signal,
    description,
    timeoutMs = ACP_PERMISSION_TIMEOUT_MS,
    onTimeout
  }: PermissionRequestOptions = {}
): Promise<RequestPermissionResponse> {
  const rejection = (): RequestPermissionResponse => ({
    outcome: { outcome: 'selected', optionId: findRejectOption(params) }
  })
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(rejection())
      return
    }
    // However the request ends, it stops listening to the signal, which may outlive it.
    let stopListening: (() => void) | null = null
    const settle = (response: RequestPermissionResponse) => {
      stopListening?.()
      stopListening = null
      resolve(response)
    }
    const timer = setTimeout(() => {
      removeEntry(entry)
      onTimeout?.()
      settle(rejection())
    }, timeoutMs)
    const notice = onUnanswered
      ? setTimeout(() => {
          entry.notice = null
          onUnanswered()
        }, AGENT_INPUT_NOTIFY_DELAY_MS)
      : null

    const entry: PendingPermission = {
      request: params,
      resolve: settle,
      timer,
      notice,
      description
    }
    permissionQueue.value = [...permissionQueue.value, entry]
    if (signal) {
      stopListening = useEventListener(signal, 'abort', () => {
        if (!permissionQueue.value.includes(entry)) return
        removeEntry(entry)
        settle(rejection())
      })
    }
  })
}

export function respondToPermission(optionId: string) {
  const entry = permissionQueue.value.at(0)
  if (!entry) return
  removeEntry(entry)
  entry.resolve({ outcome: { outcome: 'selected', optionId } })
}

export function rejectCurrentPermission() {
  const entry = permissionQueue.value.at(0)
  if (!entry) return
  removeEntry(entry)
  entry.resolve({
    outcome: { outcome: 'selected', optionId: findRejectOption(entry.request) }
  })
}
