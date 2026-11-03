<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger
} from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, ref } from 'vue'

import { useAgentMessages } from '@open-pencil/vue/i18n'

import { projectFolderStartMode } from '@/app/ai/agents/acp/session/store'
import {
  chatProjectFolder,
  pickProjectFolder,
  projectFolderName,
  setChatProjectFolder
} from '@/app/ai/chat/project-folder'
import { useAIChat } from '@/app/ai/chat/use'
import { modelProviderName } from '@/app/ai/models/provider-name'
import { isTauri } from '@/app/tauri/env'
import { AppConfirmationDialog } from '@/components/ui/dialog'
import { menuItem, useMenuUI } from '@/components/ui/menu/menu'
import Tip from '@/components/ui/overlay/Tip.vue'
import sessionTheme from '@/theme/chat/session'

/**
 * The project folder a coding agent works in for this chat, on desktop. A folder is used only
 * after the person confirms it, and the agent's next session starts there; until then agents
 * work in the app's own folder, outside the person's projects.
 */
const emit = defineEmits<{ error: [message: string] }>()

const { providerID, history } = useAIChat()
const messages = useAgentMessages()
const styles = tv(sessionTheme)()
const menu = useMenuUI({ content: 'min-w-48' })
const item = menuItem({ justify: 'start' })

const conversationId = computed(() => history.current.value?.id ?? null)
const visible = computed(
  () => isTauri() && providerID.value.startsWith('acp:') && !!conversationId.value
)
const agent = computed(() => modelProviderName(providerID.value))
const folder = computed(() => chatProjectFolder(conversationId.value))
const tip = computed(() =>
  folder.value
    ? messages.value.projectFolderIn({ agent: agent.value, folder: folder.value })
    : messages.value.projectFolderOutside({ agent: agent.value })
)

/** The folder picked in the system dialog, waiting for the person to confirm it. */
const proposed = ref<string | null>(null)
const confirming = computed({
  get: () => proposed.value !== null,
  set: (open: boolean) => {
    if (!open) proposed.value = null
  }
})

/**
 * What the confirmation says the agent may do there, with the mode its session starts in: the
 * agent's default, since a mode chosen in another chat does not carry over to a project folder.
 */
const confirmDescription = computed(() => {
  const description = messages.value.projectFolderConfirmDescription({
    agent: agent.value,
    path: proposed.value ?? ''
  })
  const mode = projectFolderStartMode(providerID.value.replace('acp:', ''))
  return mode ? `${description} ${messages.value.projectFolderConfirmMode({ mode })}` : description
})

async function choose() {
  try {
    proposed.value = await pickProjectFolder()
  } catch {
    emit('error', messages.value.projectFolderFailed)
  }
}

function confirm() {
  const id = conversationId.value
  if (id && proposed.value) setChatProjectFolder(id, proposed.value)
}

function clear() {
  const id = conversationId.value
  if (id) setChatProjectFolder(id, null)
}
</script>

<template>
  <template v-if="visible">
    <DropdownMenuRoot>
      <Tip :label="tip">
        <DropdownMenuTrigger
          :class="styles.folder()"
          :data-set="folder !== null"
          :aria-label="`${messages.projectFolder}: ${folder ?? messages.projectFolderNone}`"
          data-test-id="chat-project-folder"
        >
          <icon-lucide-folder-open v-if="folder" :class="styles.folderIcon()" aria-hidden="true" />
          <icon-lucide-folder v-else :class="styles.folderIcon()" aria-hidden="true" />
          <span v-if="folder" :class="styles.folderName()">{{ projectFolderName(folder) }}</span>
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end" :side-offset="6" :class="menu.content">
          <DropdownMenuItem
            :class="item"
            data-test-id="chat-project-folder-choose"
            @select="choose"
          >
            <icon-lucide-folder-search :class="styles.menuIcon()" aria-hidden="true" />
            {{ messages.projectFolderChoose }}
          </DropdownMenuItem>
          <DropdownMenuItem
            v-if="folder"
            :class="item"
            data-test-id="chat-project-folder-clear"
            @select="clear"
          >
            <icon-lucide-folder-x :class="styles.menuIcon()" aria-hidden="true" />
            {{ messages.projectFolderClear }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
    <AppConfirmationDialog
      v-model:open="confirming"
      :heading="
        messages.projectFolderConfirmTitle({
          agent,
          folder: proposed ? projectFolderName(proposed) : ''
        })
      "
      :description="confirmDescription"
      :cancel-label="messages.projectFolderCancel"
      :confirm-label="messages.projectFolderConfirm"
      tone="warning"
      @confirm="confirm"
    />
  </template>
</template>
