import { ref } from 'vue'

import type { SyncUIState } from '@/app/storage/sync/types'

/** Global subtle sync status for UI chips. */
export const syncUIState = ref<SyncUIState>('idle')
const syncUIDetail = ref<string | null>(null)
export const pendingSyncCount = ref(0)

export function setSyncUI(state: SyncUIState, detail: string | null = null) {
  syncUIState.value = state
  syncUIDetail.value = detail
}

export function setPendingSyncCount(count: number) {
  pendingSyncCount.value = count
}
