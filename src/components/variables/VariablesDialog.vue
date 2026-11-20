<script setup lang="ts">
import { useFileDialog } from '@vueuse/core'
import { DialogTitle } from 'reka-ui'
import { computed, defineAsyncComponent, provide, ref, shallowRef, watch } from 'vue'

import type { DesignTokenBundle } from '@pairdraw/core/io/formats/design-tokens'
import { useI18n } from '@pairdraw/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { createTokenCopy } from '@/app/editor/tokens/copy'
import { recordTokenCSSLink, tokenCSSLink } from '@/app/editor/tokens/css-sync'
import {
  DESIGN_TOKEN_FILE_ACCEPT,
  exportDesignTokenArchive,
  readDesignTokenFiles
} from '@/app/editor/tokens/design-tokens'
import { pendingTokenImport } from '@/app/editor/tokens/dialog'
import { notificationMessages } from '@/app/i18n/notifications'
import { useDocumentShortcuts } from '@/app/shell/keyboard/document'
import { toast } from '@/app/shell/ui'
import IconButton from '@/components/ui/button/IconButton.vue'
import { AppDialogClose, AppDialogRoot } from '@/components/ui/dialog'
import { TOKEN_DRIFT } from '@/components/variables/drift'
import TokenCSSSyncMenu from '@/components/variables/TokenCSSSyncMenu.vue'
import TokensPanel from '@/components/variables/TokensPanel.vue'
import TokenSyncStatus from '@/components/variables/TokenSyncStatus.vue'
import { useTokenCSSDrift } from '@/components/variables/useTokenCSSDrift'

const store = useEditorStore()
const open = computed({
  get: () => store.state.variablesOpen,
  set: (value: boolean) => {
    store.state.variablesOpen = value
  }
})

/** Undo and redo reach the document from inside the dialog, as they do on the canvas. */
const onKeydown = useDocumentShortcuts()

const { variables, common } = useI18n()
/** Expanding gives a large design system most of the window; it is kept for this session. */
const expanded = ref(false)
const copyTokens = createTokenCopy(store)

const TokenImportDialog = defineAsyncComponent(
  () => import('@/components/variables/TokenImportDialog.vue')
)
const TokenSyncReviewDialog = defineAsyncComponent(
  () => import('@/components/variables/TokenSyncReviewDialog.vue')
)
const importBundle = shallowRef<DesignTokenBundle | null>(null)
const importOpen = ref(false)
/** Whether the preview is of the linked stylesheet, which the document records once imported. */
const importFromLink = ref(false)

function reportFailure(error: unknown) {
  toast.error(
    notificationMessages
      .get()
      .operationFailed({ error: error instanceof Error ? error.message : String(error) })
  )
}

/** The latest import asked for; an earlier one still reading does not replace its preview. */
let importRequest = 0

/** Token files, a folder's worth, or a zip of them; the import dialog shows what they would do. */
function importFiles(files: readonly File[]) {
  const request = ++importRequest
  void (async () => {
    const sources = await readDesignTokenFiles(files)
    const { readDesignTokens } = await import('@pairdraw/core/io/formats/design-tokens')
    if (request !== importRequest) return
    importFromLink.value = false
    importBundle.value = readDesignTokens(sources)
    importOpen.value = true
  })().catch((error: unknown) => {
    if (request === importRequest) reportFailure(error)
  })
}

const tokenFiles = useFileDialog({ accept: DESIGN_TOKEN_FILE_ACCEPT, multiple: true, reset: true })
tokenFiles.onChange((files) => {
  if (files?.length) importFiles([...files])
})

/** The same files picked as a folder, so a resolver's references arrive with their paths. */
const tokenFolder = useFileDialog({
  accept: DESIGN_TOKEN_FILE_ACCEPT,
  multiple: true,
  directory: true,
  reset: true
})
tokenFolder.onChange((files) => {
  if (files?.length) importFiles([...files])
})

// Token files dropped on the window come here through the document's pending import.
const pendingImport = pendingTokenImport(store)
watch(
  pendingImport,
  (files) => {
    if (!files) return
    pendingImport.value = null
    importFiles(files)
  },
  { immediate: true }
)

/** A linked stylesheet's custom properties, previewed in the same import dialog. */
function previewCSS(bundle: DesignTokenBundle) {
  importRequest++
  importFromLink.value = true
  importBundle.value = bundle
  importOpen.value = true
}

// The rows and the status follow the linked stylesheet while the dialog is open.
const { drift: tokenDrift, byVariable } = useTokenCSSDrift(store, open)
provide(TOKEN_DRIFT, byVariable)
const linkedFile = computed(() => tokenCSSLink(store).value?.name ?? '')
const reviewOpen = ref(false)

function onImported() {
  if (importFromLink.value) recordTokenCSSLink(store).catch(reportFailure)
}

function exportTokens() {
  exportDesignTokenArchive(store).catch(reportFailure)
}
</script>

<template>
  <AppDialogRoot
    v-model:open="open"
    :size="expanded ? 'screen' : 'xl'"
    :height="expanded ? 'screen' : 'full'"
    data-test-id="variables-dialog"
    @keydown="onKeydown"
    :aria-describedby="undefined"
  >
    <DialogTitle class="sr-only">{{ variables.localVariables }}</DialogTitle>
    <TokensPanel @copy="copyTokens" @export="exportTokens">
      <template #actions>
        <IconButton
          :label="variables.importDesignTokens"
          data-test-id="variables-import-tokens"
          @click="tokenFiles.open()"
        >
          <icon-lucide-file-input class="size-3.5" />
        </IconButton>
        <TokenSyncStatus :drift="tokenDrift" :file="linkedFile" @review="reviewOpen = true" />
        <TokenCSSSyncMenu @preview="previewCSS" @review="reviewOpen = true" />
        <IconButton
          :label="expanded ? variables.collapse : variables.expand"
          data-test-id="variables-expand"
          @click="expanded = !expanded"
        >
          <icon-lucide-minimize-2 v-if="expanded" class="size-3.5" />
          <icon-lucide-maximize-2 v-else class="size-3.5" />
        </IconButton>
        <AppDialogClose :ariaLabel="common.close" />
      </template>
    </TokensPanel>
    <TokenImportDialog
      v-if="importBundle"
      v-model:open="importOpen"
      :bundle="importBundle"
      @choose-folder="tokenFolder.open()"
      @imported="onImported"
    />
    <TokenSyncReviewDialog v-model:open="reviewOpen" :drift="tokenDrift ?? []" :file="linkedFile" />
  </AppDialogRoot>
</template>
