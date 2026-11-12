<script setup lang="ts">
import { ref, watch } from 'vue'

import { useEditor } from '@open-pencil/vue'
import { useI18n } from '@open-pencil/vue/i18n'
import { useSceneComputed } from '@open-pencil/vue/internal/scene-computed'

import { setScriptSource } from '@/app/code/script/create'
import { readScriptNodeData, runScriptNode } from '@/app/code/script/run-node'
import PanelSection from '@/components/ui/panel/PanelSection.vue'

/**
 * A script layer's program: the source it holds, a Run button, and the error of the last run.
 * The source lives in the document, so committing it is an undo step and runs the script again.
 */
const { nodeId } = defineProps<{ nodeId: string }>()

const store = useEditor()
const { code } = useI18n()

const stored = useSceneComputed(() => readScriptNodeData(store.graph, nodeId)?.source ?? '')
const draft = ref(stored.value)
const error = ref<string | null>(null)
const running = ref(false)

watch(stored, (source) => {
  if (source !== draft.value) draft.value = source
})
watch(
  () => nodeId,
  () => {
    draft.value = stored.value
    error.value = null
  }
)

async function run() {
  running.value = true
  error.value = null
  const result = await runScriptNode(store.graph, nodeId, store.state.currentPageId)
  if (!result.ok) error.value = result.error
  running.value = false
}

function commit() {
  if (draft.value === stored.value) return
  setScriptSource(store, nodeId, draft.value)
  void run()
}
</script>

<template>
  <PanelSection :label="code.scriptLayer">
    <template #actions>
      <button
        type="button"
        data-test-id="script-run"
        class="rounded px-1.5 py-0.5 text-[11px] font-medium hover:bg-hover disabled:opacity-50"
        :disabled="running || draft.trim() === ''"
        @click="run"
      >
        {{ running ? code.scriptRunning : code.scriptRun }}
      </button>
    </template>
    <label class="block px-3.5 pb-2.5">
      <span class="sr-only">{{ code.scriptCode }}</span>
      <textarea
        v-model="draft"
        :aria-label="code.scriptCode"
        data-test-id="script-source"
        rows="8"
        spellcheck="false"
        class="scrollbar-thin w-full resize-y rounded border border-border bg-surface p-2 font-mono text-[11px]"
        @change="commit"
      />
    </label>
    <p v-if="error" data-test-id="script-error" class="px-3.5 pb-2.5 text-[11px] text-error">
      {{ error }}
    </p>
  </PanelSection>
</template>
