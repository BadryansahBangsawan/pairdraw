import { computed, ref } from 'vue'

import type { EditorStore } from '@/app/editor/active-store'
import { appPreferences } from '@/app/settings/preferences/store'

export type PropertiesTab = 'design' | 'code' | 'lint'

/** The properties panel's tab. */
export const propertiesTab = ref<PropertiesTab>('design')

/** The shortcut that opens and closes the chat column, as a portable token. */
export const CHAT_COLUMN_SHORTCUT = 'MOD+J'

/**
 * Whether the AI chat has its own column beside the properties panel on desktop, so the design
 * and the conversation show at once. It stays as the person left it across sessions.
 */
export const chatColumnOpen = computed({
  get: () => appPreferences.value.chat.columnOpen,
  set: (columnOpen: boolean) => {
    if (appPreferences.value.chat.columnOpen === columnOpen) return
    appPreferences.value = {
      ...appPreferences.value,
      chat: { ...appPreferences.value.chat, columnOpen }
    }
  }
})

export function showChatPanel(): void {
  chatColumnOpen.value = true
}

/**
 * Shows the chat of `store`'s document wherever this window shows it: the column on desktop, the
 * drawer's AI tab on a phone, whose chat mounts only while that tab is open.
 */
export function showDocumentChat(store: EditorStore): void {
  showChatPanel()
  store.state.activeRibbonTab = 'ai'
  if (store.state.mobileDrawerSnap === 'closed') store.state.mobileDrawerSnap = 'half'
}

export function toggleChatColumn(): void {
  chatColumnOpen.value = !chatColumnOpen.value
}
