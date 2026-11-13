<script setup lang="ts">
import { useFileDialog } from '@vueuse/core'
import { AlertDialogAction, AlertDialogCancel } from 'reka-ui'
import { computed, ref } from 'vue'
import IconPuzzle from '~icons/lucide/puzzle'

import { useCommonMessages, useSettingsMessages } from '@open-pencil/vue/i18n'

import { PLUGIN_AVAILABLE_CAPABILITIES, pluginCapabilityKeys } from '@/app/plugins/capability-text'
import type { PluginInstallResult } from '@/app/plugins/catalog'
import { MAX_PLUGINS } from '@/app/plugins/limits'
import type { InstalledPlugin, PluginCapability } from '@/app/plugins/schema'
import {
  grantInstalledPlugin,
  installChosenPluginFile,
  installPastedPlugin,
  installedPlugins,
  removeInstalledPlugin,
  setInstalledPluginEnabled
} from '@/app/plugins/store'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsPage from '@/components/settings/layout/SettingsPage.vue'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import SettingsSection from '@/components/settings/layout/SettingsSection.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppAlertDialogRoot, AppDialogFooter, AppDialogHeader } from '@/components/ui/dialog'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import AppTextarea from '@/components/ui/input/AppTextarea.vue'
import { useHeldContent } from '@/components/ui/overlay/held'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'

const settings = useSettingsMessages()
const common = useCommonMessages()
const draft = ref('')
const failure = ref<string | null>(null)
const removingId = ref<string | null>(null)
const removing = useHeldContent(
  () => installedPlugins.value.find((plugin) => plugin.id === removingId.value) ?? null
)
const removeOpen = computed({
  get: () => removingId.value !== null,
  set: (open: boolean) => {
    if (!open) removingId.value = null
  }
})

function capabilityText(capability: PluginCapability): string {
  return settings.value[pluginCapabilityKeys[capability]]
}

function isAvailable(capability: PluginCapability): boolean {
  return PLUGIN_AVAILABLE_CAPABILITIES.some((available) => available === capability)
}

/** Adds or drops one grant; the rest of the plugin's grants stay as they were. */
function setGrant(plugin: InstalledPlugin, capability: PluginCapability, on: boolean): void {
  const next = on
    ? [...plugin.grants, capability]
    : plugin.grants.filter((grant) => grant !== capability)
  grantInstalledPlugin(plugin.id, next)
}

const fileDialog = useFileDialog({ accept: 'application/json,.json', multiple: false, reset: true })
fileDialog.onChange((files) => {
  const file = files?.[0]
  if (file) void installFile(file)
})

function describePlugin(plugin: InstalledPlugin): string {
  const asked =
    plugin.capabilities.length === 0
      ? settings.value.pluginsNoCapabilities
      : settings.value.pluginsPermissions
  return `${settings.value.pluginsCommand({ command: plugin.command })} ${asked}`
}

function failureText(result: Extract<PluginInstallResult, { ok: false }>): string {
  switch (result.reason) {
    case 'invalid':
      return settings.value.pluginsInvalid
    case 'duplicate':
      return settings.value.pluginsDuplicate({ id: result.id ?? '' })
    case 'unknown-capability':
      return settings.value.pluginsUnknownCapability({ capability: result.capability ?? '' })
    case 'network':
      return settings.value.pluginsNetwork
    case 'too-large':
      return settings.value.pluginsTooLarge
    case 'too-many':
      return settings.value.pluginsTooMany({ count: MAX_PLUGINS })
  }
}

function applyInstall(result: PluginInstallResult): void {
  if (result.ok) {
    draft.value = ''
    failure.value = null
    return
  }
  failure.value = failureText(result)
}

function installDraft(): void {
  applyInstall(installPastedPlugin(draft.value))
}

async function installFile(file: Blob): Promise<void> {
  applyInstall(await installChosenPluginFile(file))
}

function confirmRemove(): void {
  // The dialog clears `removingId` as it closes, including from this same click.
  // The held plugin is the one the dialog was showing.
  const id = removing.value?.id
  if (id) removeInstalledPlugin(id)
  removingId.value = null
}
</script>

<template>
  <SettingsPage data-test-id="settings-plugins-panel">
    <SettingsSection>
      <template #title>{{ settings.plugins }}</template>
      <template #description>{{ settings.pluginsDescription }}</template>
      <AppAlert
        tone="info"
        :heading="settings.pluginsRunFromPalette"
        :description="settings.pluginsRunFromPaletteDescription"
      />
      <div class="flex flex-col gap-2">
        <label for="plugins-manifest" class="text-sm">{{ settings.pluginsManifest }}</label>
        <AppTextarea id="plugins-manifest" v-model="draft" :rows="5" />
        <div class="flex flex-wrap gap-2">
          <AppButton color="primary" variant="solid" @click="installDraft">
            {{ settings.pluginsInstall }}
          </AppButton>
          <AppButton @click="fileDialog.open()">{{ settings.pluginsChooseFile }}</AppButton>
        </div>
        <AppAlert v-if="failure" tone="error" :heading="failure" />
      </div>
      <SettingsGroup v-if="installedPlugins.length > 0">
        <template v-for="plugin in installedPlugins" :key="plugin.id">
          <SettingsRow :label="plugin.name" :description="describePlugin(plugin)">
            <span class="flex items-center gap-2">
              <AppButton
                color="error"
                variant="ghost"
                :aria-label="settings.pluginsRemove({ name: plugin.name })"
                @click="removingId = plugin.id"
              >
                {{ settings.pluginsRemoveAction }}
              </AppButton>
              <AppSwitch
                :model-value="plugin.enabled"
                :label="settings.pluginsEnable({ name: plugin.name })"
                @update:model-value="setInstalledPluginEnabled(plugin.id, $event)"
              />
            </span>
          </SettingsRow>
          <SettingsRow
            v-for="capability in plugin.capabilities"
            :key="`${plugin.id}-${capability}`"
            as="label"
            :label="capabilityText(capability)"
            :description="isAvailable(capability) ? undefined : settings.pluginsUnavailable"
          >
            <AppSwitch
              :model-value="plugin.grants.includes(capability)"
              :label="
                settings.pluginsGrant({ name: plugin.name, capability: capabilityText(capability) })
              "
              :disabled="!plugin.enabled || !isAvailable(capability)"
              @update:model-value="setGrant(plugin, capability, $event)"
            />
          </SettingsRow>
        </template>
      </SettingsGroup>
      <AppPlaceholder
        v-else
        size="compact"
        :fill="false"
        :label="settings.pluginsEmpty"
        :description="settings.pluginsEmptyDescription"
      >
        <template #icon>
          <IconPuzzle class="size-4" />
        </template>
      </AppPlaceholder>
    </SettingsSection>
  </SettingsPage>
  <AppAlertDialogRoot v-model:open="removeOpen">
    <AppDialogHeader
      :heading="settings.pluginsRemoveTitle"
      :description="removing ? settings.pluginsRemoveDescription({ name: removing.name }) : ''"
      :show-close="false"
    />
    <AppDialogFooter>
      <AlertDialogCancel as-child>
        <AppButton>{{ common.cancel }}</AppButton>
      </AlertDialogCancel>
      <AlertDialogAction as-child>
        <AppButton color="error" variant="solid" @click="confirmRemove">
          {{ settings.pluginsRemoveAction }}
        </AppButton>
      </AlertDialogAction>
    </AppDialogFooter>
  </AppAlertDialogRoot>
</template>
