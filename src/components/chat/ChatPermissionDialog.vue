<script setup lang="ts">
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogTitle
} from 'reka-ui'
import { computed } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'
import { acpPermissionOptionTestId, vTestId } from '@open-pencil/vue/testing'

import {
  currentPermission,
  rejectCurrentPermission,
  respondToPermission
} from '@/app/ai/agents/acp/permission'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppAlertDialogRoot } from '@/components/ui/dialog'
import { useHeldContent } from '@/components/ui/overlay/held'

const open = computed(() => currentPermission.value !== null)
// Answering clears the request; the dialog keeps showing it while it animates closed.
const permission = useHeldContent(currentPermission)
const { ai } = useI18n()
interface ToolCallInfo {
  title?: string
  rawInput?: unknown
}

const toolCall = computed(
  (): ToolCallInfo => (permission.value?.request.toolCall as ToolCallInfo) ?? {}
)

const toolName = computed(() => toolCall.value.title ?? ai.value.unknownTool)

const toolInput = computed(() => {
  const raw = toolCall.value.rawInput
  if (!raw) return null
  try {
    return JSON.stringify(raw, null, 2)
  } catch {
    return String(raw)
  }
})

const allowOptions = computed(
  () => permission.value?.request.options.filter((o) => o.kind.startsWith('allow')) ?? []
)

const rejectOptions = computed(
  () => permission.value?.request.options.filter((o) => o.kind.startsWith('reject')) ?? []
)

function handleDismiss() {
  rejectCurrentPermission()
}
</script>

<template>
  <AppAlertDialogRoot
    :open="open"
    :ui="{ overlay: 'z-50', content: 'w-80 p-4' }"
    data-test-id="acp-permission-dialog"
    @overlay-click="handleDismiss"
    @escape-key-down="handleDismiss"
  >
    <AlertDialogTitle class="text-sm font-semibold text-surface">
      {{ ai.permissionRequestTitle }}
    </AlertDialogTitle>

    <AlertDialogDescription class="mt-2 text-xs text-muted">
      {{ ai.permissionRequest({ tool: toolName }) }}
    </AlertDialogDescription>

    <pre
      v-if="toolInput"
      class="mt-2 max-h-32 overflow-auto rounded-md bg-panel-field p-2 text-[10px] text-muted"
      >{{ toolInput }}</pre>

    <div class="mt-4 flex flex-col gap-2">
      <AlertDialogAction
        v-for="opt in allowOptions"
        :key="opt.optionId"
        as-child
        @click="respondToPermission(opt.optionId)"
      >
        <AppButton
          v-test-id="acpPermissionOptionTestId(opt.kind)"
          color="primary"
          variant="solid"
          class="w-full"
        >
          {{ opt.name }}
        </AppButton>
      </AlertDialogAction>

      <AlertDialogCancel
        v-for="opt in rejectOptions"
        :key="opt.optionId"
        as-child
        @click="respondToPermission(opt.optionId)"
      >
        <AppButton v-test-id="acpPermissionOptionTestId(opt.kind)" variant="outline" class="w-full">
          {{ opt.name }}
        </AppButton>
      </AlertDialogCancel>
    </div>
  </AppAlertDialogRoot>
</template>
