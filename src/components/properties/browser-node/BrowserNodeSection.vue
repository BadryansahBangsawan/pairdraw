<script setup lang="ts">
import { onDeactivated, onUnmounted, ref, watch } from 'vue'

import { readBrowserNode } from '@open-pencil/scene-graph/browser-node'
import { useBrowserMessages } from '@open-pencil/vue/i18n'
import { useSceneComputed } from '@open-pencil/vue/internal/scene-computed'
import { useRetainedActivity } from '@open-pencil/vue/lifecycle/retention'

import { refreshBrowserNode } from '@/app/browser/node/command'
import {
  openBrowserNodePage,
  saveBrowserNodeAddress,
  saveBrowserNodePreset
} from '@/app/browser/node/panel'
import { useEditorStore } from '@/app/editor/active-store'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import { IS_TAURI } from '@/constants'

import BrowserNodeFields from './BrowserNodeFields.vue'

/**
 * The selected layer's page snapshot. Refresh uses the open desktop window and does not open a
 * closed one. A result that comes back after the panel is put away is dropped.
 */
const store = useEditorStore()
const messages = useBrowserMessages()
const retained = useRetainedActivity()
const node = useSceneComputed(() => {
  if (store.state.selectedIds.size !== 1) return null
  const [id] = store.state.selectedIds
  const selected = id ? store.graph.getNode(id) : undefined
  return selected && readBrowserNode(selected) ? selected : null
})
const record = useSceneComputed(() => (node.value ? readBrowserNode(node.value) : null))
const canRefresh = IS_TAURI
const refreshing = ref(false)
const error = ref('')
let request = 0

function leave() {
  request += 1
  refreshing.value = false
}

onUnmounted(leave)
onDeactivated(leave)

watch(
  () => node.value?.id,
  () => {
    error.value = ''
    refreshing.value = false
  }
)

function saveAddress(url: string) {
  const id = node.value?.id
  if (!id) return
  const outcome = saveBrowserNodeAddress(store, id, url)
  error.value = outcome.ok ? '' : outcome.error
}

function savePreset(preset: string) {
  const id = node.value?.id
  if (!id) return
  const outcome = saveBrowserNodePreset(store, id, preset)
  if (!outcome.ok) error.value = outcome.error
}

async function refresh() {
  const id = node.value?.id
  if (!id || refreshing.value || (retained && !retained.value)) return
  const ticket = ++request
  refreshing.value = true
  error.value = ''
  const outcome = await refreshBrowserNode(store, id)
  if (ticket !== request) return
  refreshing.value = false
  if (node.value?.id !== id) return
  if (!outcome.ok) error.value = outcome.error
}

async function openPage() {
  const url = record.value?.url
  if (!url || (retained && !retained.value)) return
  const ticket = ++request
  const outcome = await openBrowserNodePage(url)
  if (ticket !== request) return
  if (!outcome.ok) error.value = outcome.error
}
</script>

<template>
  <PanelSection v-if="record" :label="messages.snapshot" data-test-id="browser-node-section">
    <BrowserNodeFields
      :url="record.url"
      :preset="record.preset"
      :refreshed-at="record.refreshedAt"
      :can-refresh="canRefresh"
      :refreshing="refreshing"
      :error="error"
      @commit-address="saveAddress"
      @commit-preset="savePreset"
      @refresh="refresh"
      @open="openPage"
    />
  </PanelSection>
</template>
