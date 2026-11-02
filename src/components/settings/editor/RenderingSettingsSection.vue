<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import { appRuntimeConfig } from '@/app/runtime/config'
import {
  appPreferences,
  DEFAULT_APP_PREFERENCES,
  updateCanvasRenderingMode,
  updateRenderingPreferences
} from '@/app/settings/preferences/store'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import SettingsSection from '@/components/settings/layout/SettingsSection.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppBadge from '@/components/ui/feedback/AppBadge.vue'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'

const { rendering } = useI18n()
const hasURLOverride = appRuntimeConfig.sceneRendererOverride
const defaults = DEFAULT_APP_PREFERENCES.rendering
const tiledRendering = computed(() => appPreferences.value.rendering.canvasMode === 'tiled')
const defaultTiledRendering = defaults.canvasMode === 'tiled'
/** Ultralight mode renders in tiles whatever the Progressive rendering choice. */
const ultralight = computed({
  get: () => appPreferences.value.rendering.ultralight,
  set: (enabled: boolean) => updateRenderingPreferences({ ultralight: enabled })
})
/** The renderer this session would start with now, against the one it started with. */
const changed = computed(
  () =>
    (ultralight.value ? 'tiled' : appPreferences.value.rendering.canvasMode) !==
      appRuntimeConfig.sceneRenderer || ultralight.value !== appRuntimeConfig.ultralight
)

function setTiledRendering(enabled: boolean): void {
  updateCanvasRenderingMode(enabled ? 'tiled' : 'retained')
}
</script>

<template>
  <SettingsSection>
    <template #title>{{ rendering.settingsTitle }}</template>
    <template #description>{{ rendering.settingsDescription }}</template>

    <SettingsGroup>
      <!-- Ultralight renders in tiles whatever this choice, so the switch shows that and waits. -->
      <SettingsRow
        as="label"
        :description="
          ultralight
            ? rendering.progressiveTiledByUltralight
            : rendering.progressiveTiledDescription
        "
        :modified="!ultralight && tiledRendering !== defaultTiledRendering"
        @reset="setTiledRendering(defaultTiledRendering)"
      >
        <template #label>
          <span class="flex flex-wrap items-center gap-2">
            {{ rendering.progressiveTiled }}
            <AppBadge :ui="{ base: 'bg-hover text-surface' }">{{
              rendering.experimental
            }}</AppBadge>
          </span>
        </template>
        <AppSwitch
          :model-value="ultralight || tiledRendering"
          :label="rendering.progressiveTiled"
          :disabled="ultralight"
          data-test-id="settings-progressive-tiled-rendering"
          @update:model-value="setTiledRendering"
        />
      </SettingsRow>
      <SettingsRow
        as="label"
        :label="rendering.ultralight"
        :description="rendering.ultralightDescription"
        :modified="ultralight !== defaults.ultralight"
        @reset="ultralight = defaults.ultralight"
      >
        <AppSwitch
          v-model="ultralight"
          :label="rendering.ultralight"
          data-test-id="settings-ultralight"
        />
      </SettingsRow>
    </SettingsGroup>

    <AppAlert v-if="hasURLOverride" :heading="rendering.urlOverride" />
    <AppAlert v-else-if="changed" :heading="rendering.reloadRequired" />
  </SettingsSection>
</template>
