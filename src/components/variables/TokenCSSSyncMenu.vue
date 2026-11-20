<script setup lang="ts">
import { useFileDialog } from '@vueuse/core'
import { uniq } from 'es-toolkit/array'
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIndicator,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from 'reka-ui'
import { computed, onMounted } from 'vue'

import type { DesignTokenBundle } from '@pairdraw/core/io/formats/design-tokens'
import { useI18n } from '@pairdraw/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { issueSubject } from '@/app/editor/tokens/copy'
import {
  TOKEN_CSS_FILE_ACCEPT,
  isWritableLink,
  linkFromFile,
  pickTokenCSSFile,
  pushTokenCSS,
  readTokenCSS,
  restoreTokenCSSLink,
  resyncTokenCSS,
  setTokenCSSLink,
  tokenCSSLink,
  unlinkTokenCSS,
  watchTokenCSS,
  type TokenCSSLink
} from '@/app/editor/tokens/css-sync'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'
import IconButton from '@/components/ui/button/IconButton.vue'
import { menuItem, useMenuUI } from '@/components/ui/menu/menu'
import MenuScrollArea from '@/components/ui/menu/MenuScrollArea.vue'

/** A stylesheet read for the import dialog, which shows what it would change. */
const emit = defineEmits<{ preview: [bundle: DesignTokenBundle]; review: [] }>()

const store = useEditorStore()
const { variables } = useI18n()
const menu = useMenuUI({ content: 'w-60' })
const itemCls = menuItem({ justify: 'start', class: 'relative pl-7' })
const link = tokenCSSLink(store)
const file = computed(() => link.value?.name ?? '')
const writable = computed(() => (link.value ? isWritableLink(link.value) : false))

function reportFailure(error: unknown) {
  toast.error(
    notificationMessages
      .get()
      .operationFailed({ error: error instanceof Error ? error.message : String(error) })
  )
}

async function preview(next: TokenCSSLink) {
  emit('preview', await readTokenCSS(store, next))
}

async function linkAndPreview(next: TokenCSSLink) {
  setTokenCSSLink(store, next)
  await preview(next)
}

// Browsers without a file picker that hands out handles read the file through an input.
const fileInput = useFileDialog({ accept: TOKEN_CSS_FILE_ACCEPT, multiple: false, reset: true })
fileInput.onChange((files) => {
  const [picked] = files ?? []
  if (picked) linkFromFile(picked).then(linkAndPreview).catch(reportFailure)
})

function chooseFile() {
  void (async () => {
    const picked = await pickTokenCSSFile()
    if (picked === 'cancelled') return
    if (picked) await linkAndPreview(picked)
    else fileInput.open()
  })().catch(reportFailure)
}

function pull() {
  void (async () => {
    const result = await resyncTokenCSS(store)
    if (!result) return
    const messages = notificationMessages.get()
    if (result.applied > 0) toast.info(messages.designTokensImported({ count: result.applied }))
    else if (result.review.length === 0)
      toast.info(variables.value.cssPushNothing({ file: file.value }))
    // What only a person can decide opens for review.
    if (result.review.length > 0) emit('review')
  })().catch(reportFailure)
}

function push() {
  void (async () => {
    const result = await pushTokenCSS(store)
    if (!result) return
    const counts = { file: file.value, updated: result.updated, added: result.added }
    if (result.updated === 0 && result.added === 0)
      toast.info(variables.value.cssPushNothing({ file: file.value }))
    else if (result.inPlace) toast.info(variables.value.cssPushed(counts))
    else toast.info(variables.value.cssPushedCopy(counts))
    const names = uniq(result.issues.map((issue) => issueSubject(store, issue)))
    if (names.length > 0)
      toast.warning(notificationMessages.get().tokensLeftOut({ names: names.join(', ') }))
  })().catch(reportFailure)
}

function setWatching(watching: boolean) {
  watchTokenCSS(store, watching).catch(reportFailure)
}

function unlink() {
  unlinkTokenCSS(store)
}

// A document that recorded a stylesheet follows it again, from where this computer keeps it.
onMounted(() => {
  restoreTokenCSSLink(store).catch(reportFailure)
})
</script>

<template>
  <DropdownMenuRoot :modal="false">
    <DropdownMenuTrigger as-child>
      <IconButton :label="variables.cssSync" data-test-id="variables-css-sync">
        <icon-lucide-file-code class="size-3.5" />
      </IconButton>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent side="bottom" align="end" :side-offset="4" :class="menu.content">
        <MenuScrollArea>
          <template v-if="link">
            <DropdownMenuLabel :class="menu.label" data-test-id="variables-css-linked">
              <span class="block truncate">{{ variables.cssLinked({ file }) }}</span>
            </DropdownMenuLabel>
            <DropdownMenuItem
              v-if="writable"
              :class="itemCls"
              data-test-id="variables-css-pull"
              @select="pull"
            >
              <icon-lucide-arrow-down-to-line :class="[menu.icon, 'absolute left-2']" />
              <span class="truncate">{{ variables.cssPull({ file }) }}</span>
            </DropdownMenuItem>
            <DropdownMenuItem :class="itemCls" data-test-id="variables-css-push" @select="push">
              <icon-lucide-arrow-up-from-line :class="[menu.icon, 'absolute left-2']" />
              <span class="truncate">{{ variables.cssPush({ file }) }}</span>
            </DropdownMenuItem>
            <DropdownMenuCheckboxItem
              v-if="writable"
              :model-value="link.watching"
              :class="itemCls"
              data-test-id="variables-css-watch"
              @update:model-value="setWatching"
            >
              <DropdownMenuItemIndicator class="absolute left-2">
                <icon-lucide-check class="size-3.5" />
              </DropdownMenuItemIndicator>
              {{ variables.cssWatch }}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator :class="menu.separator" />
          </template>
          <DropdownMenuItem
            :class="itemCls"
            data-test-id="variables-css-import"
            @select="chooseFile"
          >
            <icon-lucide-file-input :class="[menu.icon, 'absolute left-2']" />
            {{ variables.cssImport }}
          </DropdownMenuItem>
          <DropdownMenuItem
            v-if="link"
            :class="itemCls"
            data-test-id="variables-css-unlink"
            @select="unlink"
          >
            <icon-lucide-unlink :class="[menu.icon, 'absolute left-2']" />
            {{ variables.cssUnlink }}
          </DropdownMenuItem>
        </MenuScrollArea>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
