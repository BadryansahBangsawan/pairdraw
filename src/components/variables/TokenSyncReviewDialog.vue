<script setup lang="ts">
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/vue-table'
import { computed, h, ref, watch } from 'vue'

import {
  driftNeedsChoice,
  type TokenDrift,
  type TokenSyncChoice
} from '@pairdraw/core/io/formats/design-tokens'
import { useI18n } from '@pairdraw/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { applyTokenCSSReview, tokenDriftKey } from '@/app/editor/tokens/css-sync'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppCollapsible from '@/components/ui/collapsible/AppCollapsible.vue'
import { AppDialog } from '@/components/ui/dialog'
import { useHeldContent } from '@/components/ui/overlay/held'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'
import AppDataTable from '@/components/ui/table/AppDataTable.vue'
import { useDriftLabels } from '@/components/variables/drift'

const { drift, file } = defineProps<{ drift: readonly TokenDrift[]; file: string }>()
const open = defineModel<boolean>('open', { default: false })

const store = useEditorStore()
const { variables, common } = useI18n()
const driftLabel = useDriftLabels()

/** What the dialog showed, kept while it animates closed. */
const shown = useHeldContent(() => drift, open)
/** Tokens a person picks a side for: changed or deleted on the canvas, or changed on both sides. */
const choosing = computed(() => shown.value.filter(driftNeedsChoice))
/** Changed only in code, or new there: they come in with the rest. */
const incoming = computed(() =>
  shown.value.filter((entry) => entry.kind === 'code' || entry.kind === 'added')
)
const missing = computed(() => shown.value.filter((entry) => entry.kind === 'missing'))

type RowChoice = TokenSyncChoice | 'skip'

/** Code is the source of truth for a conflict; an edit or a deletion made on the canvas is kept. */
function defaultChoice(entry: TokenDrift): RowChoice {
  return entry.kind === 'conflict' ? 'code' : 'canvas'
}

const choices = ref(new Map<string, RowChoice>())
// Choices start over as the dialog opens, never as it closes. The sides picked are kept as overrides
// only: a row's default follows the drift as it is now, which can arrive after the dialog opens.
watch(
  open,
  (isOpen) => {
    if (isOpen) choices.value = new Map()
  },
  { immediate: true }
)

function choiceOf(entry: TokenDrift): RowChoice {
  return choices.value.get(tokenDriftKey(entry)) ?? defaultChoice(entry)
}

function choose(entry: TokenDrift, value: string) {
  if (value !== 'code' && value !== 'canvas' && value !== 'skip') return
  choices.value = new Map(choices.value).set(tokenDriftKey(entry), value)
}

function chooseAll(value: TokenSyncChoice) {
  choices.value = new Map(choosing.value.map((entry) => [tokenDriftKey(entry), value]))
}

const options = computed(() => [
  { value: 'code', label: variables.value.syncKeepCode },
  { value: 'canvas', label: variables.value.syncKeepCanvas },
  { value: 'skip', label: variables.value.syncSkip }
])

/** A value that is a color shows it beside the text. */
function swatch(value: string | undefined): string | undefined {
  return value && /^#[\dA-F]{6}(?:[\dA-F]{2})?$/i.test(value) ? value : undefined
}

function valueCell(value: string | undefined) {
  const color = swatch(value)
  return h('span', { class: 'flex min-w-0 items-center gap-1.5' }, [
    color
      ? h('span', {
          class: 'size-3 shrink-0 rounded-sm border border-border',
          style: { backgroundColor: color },
          'aria-hidden': 'true'
        })
      : null,
    h('span', { class: 'truncate font-mono text-surface' }, value ?? '')
  ])
}

function tokenCell(entry: TokenDrift) {
  return h(
    'span',
    {
      class: 'flex min-w-0 flex-col',
      'data-test-id': 'variables-sync-row',
      'data-kind': entry.kind
    },
    [
      h('span', { class: 'truncate text-surface' }, [
        entry.variable,
        entry.mode ? h('span', { class: 'ml-1 text-muted' }, entry.mode) : null
      ]),
      h(
        'span',
        { class: 'text-muted data-[kind=conflict]:text-warning', 'data-kind': entry.kind },
        driftLabel(entry.kind)
      )
    ]
  )
}

const features = tableFeatures({ columnMeta: {} })
const column = createColumnHelper<typeof features, TokenDrift>()
const table = useTable({
  features,
  data: choosing,
  getRowId: tokenDriftKey,
  columns: column.columns([
    column.display({
      id: 'token',
      header: () => variables.value.name,
      cell: ({ row: { original } }) => tokenCell(original)
    }),
    column.display({
      id: 'code',
      header: () => variables.value.syncCodeValue,
      meta: { class: 'w-28' },
      cell: ({ row: { original } }) => valueCell(original.code)
    }),
    column.display({
      id: 'canvas',
      header: () => variables.value.syncCanvasValue,
      meta: { class: 'w-28' },
      cell: ({ row: { original } }) => valueCell(original.canvas)
    }),
    column.display({
      id: 'choice',
      header: () => variables.value.syncReview,
      meta: { class: 'w-px', actions: true },
      cell: ({ row: { original } }) =>
        h(SegmentedControl, {
          class: 'w-44',
          modelValue: choiceOf(original),
          options: options.value,
          label: original.mode ? `${original.variable} (${original.mode})` : original.variable,
          'onUpdate:modelValue': (value: string) => choose(original, value)
        })
    })
  ])
})

const applying = ref(false)

/** The sides picked; a skipped token is left for the next sync to report. */
function pickedSides(): Map<string, TokenSyncChoice> {
  const picked = new Map<string, TokenSyncChoice>()
  for (const entry of choosing.value) {
    const choice = choiceOf(entry)
    if (choice !== 'skip') picked.set(tokenDriftKey(entry), choice)
  }
  return picked
}

async function apply() {
  applying.value = true
  try {
    const result = await applyTokenCSSReview(store, pickedSides())
    if (result && result.applied > 0)
      toast.info(notificationMessages.get().designTokensImported({ count: result.applied }))
    open.value = false
  } catch (error) {
    toast.error(
      notificationMessages
        .get()
        .operationFailed({ error: error instanceof Error ? error.message : String(error) })
    )
  } finally {
    applying.value = false
  }
}
</script>

<template>
  <AppDialog
    v-model:open="open"
    size="lg"
    :heading="variables.syncReviewTitle({ file })"
    :description="variables.syncReviewDescription"
    :close-label="common.close"
    :ui="{ footer: 'justify-between' }"
    data-test-id="variables-sync-review"
  >
    <div class="flex flex-col gap-3 text-xs">
      <div v-if="choosing.length > 0" class="max-h-80 overflow-y-auto">
        <AppDataTable :table="table" :label="variables.syncReview" />
      </div>

      <AppCollapsible v-if="incoming.length > 0">
        <template #label>
          {{ variables.syncChangedInCode }}
          <span class="text-muted">{{ incoming.length }}</span>
        </template>
        <ul class="mt-2 max-h-32 overflow-y-auto rounded-lg border border-border">
          <li
            v-for="entry in incoming"
            :key="tokenDriftKey(entry)"
            class="flex items-baseline justify-between gap-3 border-b border-border px-3 py-1.5 last:border-b-0"
          >
            <span class="truncate text-surface">{{ entry.variable }}</span>
            <span class="shrink-0 font-mono text-muted">{{ entry.code }}</span>
          </li>
        </ul>
      </AppCollapsible>

      <AppCollapsible v-if="missing.length > 0">
        <template #label>
          {{ variables.syncNoLongerInCode }}
          <span class="text-muted">{{ missing.length }}</span>
        </template>
        <p class="mt-2 text-muted">{{ variables.syncNoLongerInCodeHint }}</p>
        <ul class="mt-2 max-h-32 overflow-y-auto rounded-lg border border-border">
          <li
            v-for="entry in missing"
            :key="tokenDriftKey(entry)"
            class="truncate border-b border-border px-3 py-1.5 text-surface last:border-b-0"
          >
            {{ entry.collection }} / {{ entry.variable }}
          </li>
        </ul>
      </AppCollapsible>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <AppButton
          v-if="choosing.length > 1"
          color="neutral"
          variant="ghost"
          data-test-id="variables-sync-all-code"
          @click="chooseAll('code')"
        >
          {{ variables.syncAllCode }}
        </AppButton>
        <AppButton
          v-if="choosing.length > 1"
          color="neutral"
          variant="ghost"
          @click="chooseAll('canvas')"
        >
          {{ variables.syncAllCanvas }}
        </AppButton>
      </div>
      <div class="flex gap-2">
        <AppButton color="neutral" variant="ghost" @click="open = false">
          {{ common.cancel }}
        </AppButton>
        <AppButton
          color="primary"
          variant="solid"
          :disabled="applying"
          data-test-id="variables-sync-apply"
          @click="apply"
        >
          {{ variables.syncApply }}
        </AppButton>
      </div>
    </template>
  </AppDialog>
</template>
