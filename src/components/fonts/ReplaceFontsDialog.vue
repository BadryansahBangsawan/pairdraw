<script setup lang="ts">
import { uniq } from 'es-toolkit/array'
import { computed, ref, watch } from 'vue'

import { DEFAULT_FONT_FAMILY } from '@pairdraw/core/constants'
import { fontManager, listDocumentFonts } from '@pairdraw/core/text'
import { useCommonMessages, useI18n } from '@pairdraw/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { replaceFontsDialogOpen } from '@/app/editor/fonts/replace-dialog'
import type { ReplaceFontRow } from '@/components/fonts/replace-fonts-rows'
import ReplaceFontsList from '@/components/fonts/ReplaceFontsList.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import {
  AppDialogBody,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogRoot
} from '@/components/ui/dialog'

const editor = useEditorStore()
const { fonts } = useI18n()
const common = useCommonMessages()
const rows = ref<ReplaceFontRow[]>([])
const needsChoice = ref(false)

const DEFAULT_STYLES = ['Regular', 'Medium', 'Semi Bold', 'Bold', 'Italic', 'Bold Italic']

function stylesFor(family: string): string[] {
  const known = fontManager.familyFacesSync(family)?.map((face) => face.style) ?? []
  const styles = uniq([...known, ...DEFAULT_STYLES]).sort((a, b) => a.localeCompare(b))
  for (const row of rows.value) {
    if (row.targetFamily === family && !styles.includes(row.targetStyle))
      styles.push(row.targetStyle)
  }
  return styles
}

function rowFor(font: ReturnType<typeof listDocumentFonts>[number]): ReplaceFontRow {
  return {
    font,
    selected: font.missing,
    targetFamily: font.missing ? DEFAULT_FONT_FAMILY : font.family,
    targetStyle: font.missing ? 'Regular' : font.style
  }
}

watch(replaceFontsDialogOpen, (open) => {
  if (!open) return
  rows.value = listDocumentFonts(editor.graph).map(rowFor)
  needsChoice.value = false
})

const open = computed({
  get: () => replaceFontsDialogOpen.value,
  set: (value) => {
    replaceFontsDialogOpen.value = value
  }
})

const selected = computed(() =>
  rows.value.filter(
    (row) =>
      row.selected && (row.targetFamily !== row.font.family || row.targetStyle !== row.font.style)
  )
)

function apply() {
  if (selected.value.length === 0) {
    needsChoice.value = true
    return
  }
  editor.replaceFonts(
    selected.value.map((row) => ({
      from: { family: row.font.family, style: row.font.style },
      to: { family: row.targetFamily, style: row.targetStyle }
    }))
  )
  open.value = false
}
</script>

<template>
  <AppDialogRoot v-model:open="open" size="lg" data-test-id="replace-fonts-dialog">
    <AppDialogHeader
      :heading="fonts.replaceFonts"
      :description="fonts.replaceFontsDescription"
      :close-label="common.cancel"
    />
    <AppDialogBody>
      <ReplaceFontsList
        v-if="rows.length > 0"
        v-model="rows"
        :styles-for="stylesFor"
        data-test-id="replace-fonts-list"
      />
      <p v-else class="px-2 py-6 text-center text-xs text-muted">
        {{ fonts.nothingToReplace }}
      </p>
      <p v-if="needsChoice" class="px-2 pt-2 text-xs text-warning">
        {{ fonts.chooseReplacement }}
      </p>
    </AppDialogBody>
    <AppDialogFooter>
      <AppButton variant="ghost" @click="open = false">{{ common.cancel }}</AppButton>
      <AppButton :disabled="rows.length === 0" @click="apply">
        {{ fonts.replaceSelected }}
      </AppButton>
    </AppDialogFooter>
  </AppDialogRoot>
</template>
