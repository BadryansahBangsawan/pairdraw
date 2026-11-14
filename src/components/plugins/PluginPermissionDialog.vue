<script setup lang="ts">
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogTitle
} from 'reka-ui'
import { computed, ref, watch } from 'vue'

import { useSettingsMessages } from '@pairdraw/vue/i18n'

import { pluginCapabilityKeys } from '@/app/plugins/capability-text'
import {
  answerPluginPermission,
  offerableCapabilities,
  pendingPluginPermission
} from '@/app/plugins/permission'
import type { PluginCapability } from '@/app/plugins/schema'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppAlertDialogRoot } from '@/components/ui/dialog'
import { useHeldContent } from '@/components/ui/overlay/held'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'

/**
 * Before a plugin's first run: the capabilities it asks for, each with a switch, and the answer
 * stored on the install record. Cancelling refuses the run and stores nothing.
 */
const settings = useSettingsMessages()

const open = computed(() => pendingPluginPermission.value !== null)
// Answering clears the request; the dialog keeps showing it while it animates closed.
const request = useHeldContent(pendingPluginPermission)
const plugin = computed(() => request.value?.plugin ?? null)

const offered = computed<PluginCapability[]>(() =>
  plugin.value ? offerableCapabilities(plugin.value) : []
)
const unavailable = computed<PluginCapability[]>(() =>
  plugin.value
    ? plugin.value.capabilities.filter((capability) => !offered.value.includes(capability))
    : []
)

const allowed = ref<PluginCapability[]>([])
watch(offered, (capabilities) => {
  allowed.value = [...capabilities]
})

function toggle(capability: PluginCapability, on: boolean): void {
  allowed.value = on
    ? [...allowed.value, capability]
    : allowed.value.filter((item) => item !== capability)
}

function capabilityText(capability: PluginCapability): string {
  return settings.value[pluginCapabilityKeys[capability]]
}

function allow(): void {
  answerPluginPermission(allowed.value)
}

function cancel(): void {
  answerPluginPermission(null)
}
</script>

<template>
  <AppAlertDialogRoot
    :open="open"
    :ui="{ overlay: 'z-50', content: 'w-96 p-4' }"
    data-test-id="plugin-permission-dialog"
    @overlay-click="cancel"
    @escape-key-down="cancel"
  >
    <AlertDialogTitle class="text-sm font-semibold text-surface">
      {{ settings.pluginsRunTitle({ name: plugin?.name ?? '' }) }}
    </AlertDialogTitle>
    <AlertDialogDescription class="mt-2 text-xs text-muted">
      {{ settings.pluginsRunDescription }}
    </AlertDialogDescription>

    <ul class="mt-3 flex flex-col gap-2">
      <li
        v-for="capability in offered"
        :key="capability"
        class="flex items-start gap-2 text-xs text-surface"
      >
        <AppSwitch
          :model-value="allowed.includes(capability)"
          :label="capabilityText(capability)"
          @update:model-value="toggle(capability, $event)"
        />
        <span>{{ capabilityText(capability) }}</span>
      </li>
      <li
        v-for="capability in unavailable"
        :key="capability"
        class="flex items-start gap-2 text-xs text-muted"
      >
        <span class="w-8 shrink-0 text-[10px] uppercase">{{ settings.pluginsUnavailable }}</span>
        <span>{{ capabilityText(capability) }}</span>
      </li>
    </ul>

    <div class="mt-4 flex justify-end gap-2">
      <AlertDialogCancel as-child>
        <AppButton data-test-id="plugin-permission-refuse" @click="cancel">
          {{ settings.pluginsRunRefuse }}
        </AppButton>
      </AlertDialogCancel>
      <AlertDialogAction as-child>
        <AppButton
          color="primary"
          variant="solid"
          data-test-id="plugin-permission-allow"
          @click="allow"
        >
          {{ settings.pluginsRunAllow }}
        </AppButton>
      </AlertDialogAction>
    </div>
  </AppAlertDialogRoot>
</template>
