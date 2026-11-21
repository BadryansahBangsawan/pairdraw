<script setup lang="ts">
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
import { computed, ref } from 'vue'

import { useI18n } from '@pairdraw/vue/i18n'

import {
  displayedToolOutput,
  toolDesignRefusals,
  toolDisplayName,
  toolErrorText,
  toolHasInput,
  toolImage,
  toolNodeIds,
  toolSource,
  toolSummary,
  type ToolCallPart
} from '@/app/ai/chat/tool-calls/display'
import { readToolChange } from '@/app/ai/tools/changes/store'
import ChatToolChangeView from '@/components/chat/tool/ChatToolChangeView.vue'
import ChatToolDesignRefusal from '@/components/chat/tool/ChatToolDesignRefusal.vue'
import ChatToolNodeChips from '@/components/chat/tool/ChatToolNodeChips.vue'
import { toolCallState } from '@/components/chat/tool/state'
import { loadCodeViewer } from '@/components/code-editor/lazy'
import CodeViewer from '@/components/code-editor/LazyCodeViewer.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'
import { collapsibleContentMotion } from '@/theme/collapsible/collapsible'

import { chatToolTheme } from './ui'

/** `undone`: the user undid the call's edit, by Undo or the chat's Revert. */
const { part, undone = false } = defineProps<{ part: ToolCallPart; undone?: boolean }>()
const { ai } = useI18n()
const ui = chatToolTheme()

const state = computed(() => toolCallState(part))
const name = computed(() => toolDisplayName(part))
const summary = computed(() => toolSummary(part))
const source = computed(() => toolSource(part))
const error = computed(() => toolErrorText(part))
// A failed command can print a whole file; the card shows its head and the line it failed on.
const ERROR_PREVIEW_LINES = 6
const ERROR_PREVIEW_CHARS = 400
const errorPreview = computed(() => {
  const text = error.value
  if (!text) return null
  const lines = text.split('\n')
  const preview =
    lines.length > ERROR_PREVIEW_LINES + 1
      ? [...lines.slice(0, ERROR_PREVIEW_LINES), '…', lines.at(-1) ?? ''].join('\n')
      : text
  return preview.length > ERROR_PREVIEW_CHARS
    ? `${preview.slice(0, ERROR_PREVIEW_CHARS)}…`
    : preview
})
const errorClipped = computed(() => errorPreview.value !== error.value)
const showAllError = ref(false)
// The last line of a failure, which for a shell command is what went wrong.
const errorLine = computed(() => {
  const lines = error.value?.split('\n').filter((line) => line.trim() !== '') ?? []
  return lines.at(-1) ?? null
})
const image = computed(() => toolImage(part))
const refusals = computed(() => toolDesignRefusals(part))
const nodeIds = computed(() => (state.value === 'pending' ? [] : toolNodeIds(part)))
const hasInput = computed(() => toolHasInput(part))
const output = computed(() => displayedToolOutput(part))
// Error results such as `diff_apply`'s mismatch report stay inspectable next to the alert.
const hasOutput = computed(() => output.value !== undefined)
// Streaming source is worth watching; other pending calls have nothing to show yet.
const expandable = computed(() => state.value !== 'pending' || source.value !== null)

const change = computed(() => readToolChange(part.toolCallId))

type DetailView = 'changes' | 'input' | 'output'
const views = computed(() => {
  const available: { value: DetailView; label: string }[] = []
  if (change.value) available.push({ value: 'changes', label: ai.value.toolChanges })
  if (hasInput.value) available.push({ value: 'input', label: ai.value.toolInput })
  if (hasOutput.value) available.push({ value: 'output', label: ai.value.toolOutput })
  return available
})
const chosenView = ref<DetailView | null>(null)
// What a call changed is the most useful view; until it exists, its output, then its input.
const shownView = computed<DetailView | null>(() => {
  const available = views.value.map((option) => option.value)
  if (chosenView.value && available.includes(chosenView.value)) return chosenView.value
  if (available.includes('changes')) return 'changes'
  return available.includes('output') ? 'output' : (available[0] ?? null)
})
const viewModel = computed({
  get: () => shownView.value ?? '',
  set: (value: string) => {
    chosenView.value = views.value.find((option) => option.value === value)?.value ?? null
  }
})
const stateLabel = computed(() => {
  if (state.value === 'pending') return ai.value.toolRunning
  return state.value === 'done' ? ai.value.toolFinished : ai.value.toolError
})

function json(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? ''
}
</script>

<template>
  <CollapsibleRoot
    :class="ui.root()"
    :data-tool-state="state"
    :data-undone="undone"
    data-slot="chat-tool-call"
  >
    <!-- Start loading CodeMirror on hover, so it is ready by the time the call opens. -->
    <CollapsibleTrigger
      :class="ui.trigger()"
      :disabled="!expandable"
      @pointerenter="loadCodeViewer"
      @focus="loadCodeViewer"
    >
      <span :class="ui.status()" :data-state="state" :aria-label="stateLabel" role="img">
        <icon-lucide-loader-circle
          v-if="state === 'pending'"
          :class="[ui.statusIcon(), 'animate-spin motion-reduce:animate-none']"
        />
        <icon-lucide-check v-else-if="state === 'done'" :class="ui.statusIcon()" />
        <icon-lucide-triangle-alert v-else :class="ui.statusIcon()" />
      </span>
      <span :class="ui.name()">{{ name }}</span>
      <span :class="ui.summary()">{{ summary }}</span>
      <span
        v-if="errorLine && state === 'error'"
        :class="ui.errorLine()"
        data-slot="chat-tool-error-line"
      >
        {{ errorLine }}
      </span>
      <span v-if="undone" :class="ui.undone()" data-slot="chat-tool-undone">
        <icon-lucide-undo-2 :class="ui.undoneIcon()" aria-hidden="true" />
        {{ ai.toolUndone }}
      </span>
      <icon-lucide-chevron-down v-if="expandable" :class="ui.chevron()" aria-hidden="true" />
    </CollapsibleTrigger>
    <CollapsibleContent :class="collapsibleContentMotion">
      <div :class="ui.body()">
        <AppAlert v-if="error" tone="error" :heading="ai.toolError">
          <span class="block whitespace-pre-wrap break-words" data-slot="chat-tool-error-text">
            {{ showAllError ? error : errorPreview }}
          </span>
          <template v-if="errorClipped" #actions>
            <AppButton size="xs" variant="ghost" @click="showAllError = !showAllError">
              {{ showAllError ? ai.toolErrorShowLess : ai.toolErrorShowAll }}
            </AppButton>
          </template>
        </AppAlert>
        <ChatToolDesignRefusal v-if="refusals.length > 0" :refusals="refusals" />
        <ChatToolNodeChips :ids="nodeIds" />
        <SegmentedControl
          v-if="views.length > 1"
          v-model="viewModel"
          :options="views"
          :label="ai.toolDetails"
          size="sm"
        />
        <ChatToolChangeView v-if="shownView === 'changes' && change" :change="change" />
        <template v-else-if="shownView === 'input'">
          <CodeViewer
            v-if="source"
            :code="source.code"
            :language="source.language"
            :label="ai.toolInput"
          />
          <CodeViewer
            v-else-if="hasInput"
            :code="json(part.input)"
            language="json"
            :label="ai.toolInput"
          />
        </template>
        <img
          v-else-if="shownView === 'output' && image"
          :src="image"
          :alt="summary || name"
          :class="ui.image()"
        />
        <CodeViewer
          v-else-if="shownView === 'output'"
          :code="json(output)"
          language="json"
          :label="ai.toolOutput"
        />
      </div>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
