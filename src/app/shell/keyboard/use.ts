import { useActiveElement } from '@vueuse/core'
import { computed } from 'vue'

import { useEditorCommands } from '@open-pencil/vue/editor/commands'
import { useViewportKind } from '@open-pencil/vue/editor/viewport-kind'

import { useAIChat } from '@/app/ai/chat/use'
import { useEditorStore } from '@/app/editor/active-store'
import { appRuntimeConfig } from '@/app/runtime/config'
import { createKeyboardActions } from '@/app/shell/keyboard/actions'
import { bindEditorClipboard } from '@/app/shell/keyboard/clipboard'
import { isInputElement } from '@/app/shell/keyboard/focus'
import { bindNodeEditKeys } from '@/app/shell/keyboard/node-edit'
import { bindNudgeKeys } from '@/app/shell/keyboard/nudging'
import { registerKeyboardShortcuts } from '@/app/shell/keyboard/registry'
import { openFileDialog } from '@/app/shell/menu/use'
import {
  closeTab,
  openNewFileTab,
  createTab,
  switchAdjacentTab,
  activeTab as activeTabRef
} from '@/app/tabs'

export function useKeyboard() {
  const { chatColumnOpen } = useAIChat()
  const store = useEditorStore()
  const { isMobile } = useViewportKind()
  const { runCommand, setOpacityTarget } = useEditorCommands()
  const activeElement = useActiveElement({ triggerOnRemoval: true })
  const inputFocused = computed(() => isInputElement(activeElement.value))

  const actions = createKeyboardActions({
    store,
    chatColumnOpen,
    isMobile,
    runCommand,
    setOpacityTarget
  })

  bindEditorClipboard(store)
  bindNudgeKeys(store)
  // Before the editor's shortcuts, so keys on a path being edited take precedence over them.
  bindNodeEditKeys(store, inputFocused)

  // An embed shows the one document its host page hands it, so its keys open and close no tabs.
  const opensTabs = !appRuntimeConfig.embed
  registerKeyboardShortcuts({
    inputFocused,
    store,
    runCommand,
    actions,
    openFileDialog: () => {
      if (opensTabs) void openFileDialog()
    },
    closeActiveTab: () => {
      if (opensTabs && activeTabRef.value) void closeTab(activeTabRef.value.id)
    },
    createTab: () => {
      if (opensTabs) createTab()
    },
    openNewFileTab: () => {
      if (opensTabs) openNewFileTab()
    },
    switchAdjacentTab: (step) => {
      if (opensTabs) switchAdjacentTab(step)
    }
  })
}
