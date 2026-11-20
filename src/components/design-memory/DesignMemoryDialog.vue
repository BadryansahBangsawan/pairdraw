<script setup lang="ts">
import { computed, ref } from 'vue'

import { useCommonMessages, useDesignMemoryMessages } from '@pairdraw/vue/i18n'

import { useDesignMemory } from '@/app/editor/design-memory/use'
import { useDocumentShortcuts } from '@/app/shell/keyboard/document'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppDialog from '@/components/ui/dialog/AppDialog.vue'
import { AppTabsContent, AppTabsList, AppTabsRoot, AppTabsTrigger } from '@/components/ui/tabs'

import DesignMemoryDialogDecisions from './DesignMemoryDialogDecisions.vue'
import DesignMemoryDialogExamples from './DesignMemoryDialogExamples.vue'
import DesignMemoryDialogLearn from './DesignMemoryDialogLearn.vue'
import DesignMemoryDialogRules from './DesignMemoryDialogRules.vue'

/**
 * The document's design memory: the values agents may use, the decisions they follow, and the
 * frames pinned as examples. Every change is one undo step at once, and undo works from inside
 * the dialog. Learn opens it on the values a selection uses instead, to add as rules.
 */
const messages = useDesignMemoryMessages()
const common = useCommonMessages()
const onKeydown = useDocumentShortcuts()
const { store, memory } = useDesignMemory()
const tab = ref('rules')

const learning = computed(() => store.state.designMemoryLearnFrom)
// Learn opens on a document without a memory too: it makes one only when the person confirms.
const open = computed({
  get: () => store.state.designMemoryOpen && (memory.value !== null || learning.value !== null),
  set: (value: boolean) => {
    store.state.designMemoryOpen = value
    if (!value) store.state.designMemoryLearnFrom = null
  }
})
function finishLearning() {
  store.state.designMemoryLearnFrom = null
  tab.value = 'rules'
  if (!memory.value) open.value = false
}

function deleteMemory() {
  store.setDesignMemory(null, 'Delete design memory')
  open.value = false
}
</script>

<template>
  <AppDialog
    v-model:open="open"
    :heading="messages.designMemory"
    :close-label="common.close"
    size="md"
    data-test-id="design-memory-dialog"
    @keydown="onKeydown"
  >
    <DesignMemoryDialogLearn v-if="learning" :node-ids="learning" @done="finishLearning" />
    <AppTabsRoot v-else v-model="tab" class="flex flex-col gap-3">
      <AppTabsList :label="messages.designMemory">
        <AppTabsTrigger value="rules">{{ messages.rules }}</AppTabsTrigger>
        <AppTabsTrigger value="decisions">{{ messages.decisions }}</AppTabsTrigger>
        <AppTabsTrigger value="examples">{{ messages.examples }}</AppTabsTrigger>
      </AppTabsList>
      <AppTabsContent value="rules"><DesignMemoryDialogRules /></AppTabsContent>
      <AppTabsContent value="decisions"><DesignMemoryDialogDecisions /></AppTabsContent>
      <AppTabsContent value="examples"><DesignMemoryDialogExamples /></AppTabsContent>
    </AppTabsRoot>

    <template v-if="!learning" #footer>
      <AppButton variant="ghost" color="error" class="mr-auto" @click="deleteMemory">
        {{ messages.deleteMemory }}
      </AppButton>
      <AppButton variant="solid" color="primary" @click="open = false">
        {{ common.close }}
      </AppButton>
    </template>
  </AppDialog>
</template>
