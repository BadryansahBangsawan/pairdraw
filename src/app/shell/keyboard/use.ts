import { useActiveElement } from '@vueuse/core'
import { computed } from 'vue'

import { useEditorCommands } from '@open-pencil/vue/editor/commands'
import { useViewportKind } from '@open-pencil/vue/editor/viewport-kind'

import { useAIChat } from '@/app/ai/chat/use'
import { useEditorStore } from '@/app/editor/active-store'
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

  registerKeyboardShortcuts({
    inputFocused,
    store,
    runCommand,
    actions,
    openFileDialog: () => {
      void openFileDialog()
    },
    closeActiveTab: () => {
      if (activeTabRef.value) void closeTab(activeTabRef.value.id)
    },
    createTab: () => createTab(),
    openNewFileTab: () => openNewFileTab(),
    switchAdjacentTab
  })
}
