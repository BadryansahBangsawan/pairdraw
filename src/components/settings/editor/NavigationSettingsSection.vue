<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@pairdraw/vue/i18n'

import {
  appPreferences,
  DEFAULT_APP_PREFERENCES,
  updateNavigationPreferences,
  updateZoomSpeed,
  ZOOM_SPEEDS,
  type ZoomSpeed
} from '@/app/settings/preferences/store'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import SettingsSection from '@/components/settings/layout/SettingsSection.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'

const { locale, settings } = useI18n()
const selectUI = { trigger: 'w-full sm:w-52' }

const zoomSpeed = computed<ZoomSpeed>({
  get: () => appPreferences.value.navigation.zoomSpeed,
  set: updateZoomSpeed
})

const defaults = DEFAULT_APP_PREFERENCES.navigation
const defaultZoomSpeed = defaults.zoomSpeed

const wheelZoom = computed({
  get: () => appPreferences.value.navigation.wheelZoom,
  set: (enabled: boolean) => updateNavigationPreferences({ wheelZoom: enabled })
})

const invertZoom = computed({
  get: () => appPreferences.value.navigation.invertZoom,
  set: (enabled: boolean) => updateNavigationPreferences({ invertZoom: enabled })
})

const zoomSpeedOptions = computed(() => {
  const format = new Intl.NumberFormat(locale.value)
  return ZOOM_SPEEDS.map((value) => ({ value, label: `${format.format(value)}×` }))
})
</script>

<template>
  <SettingsSection>
    <template #title>{{ settings.navigation }}</template>
    <template #description>{{ settings.navigationDescription }}</template>

    <SettingsGroup>
      <SettingsRow
        :label="settings.zoomSpeed"
        :description="settings.zoomSpeedDescription"
        :modified="zoomSpeed !== defaultZoomSpeed"
        @reset="zoomSpeed = defaultZoomSpeed"
      >
        <AppSelect
          v-model="zoomSpeed"
          :label="settings.zoomSpeed"
          :options="zoomSpeedOptions"
          :ui="selectUI"
          data-test-id="settings-zoom-speed"
        />
      </SettingsRow>
      <SettingsRow
        as="label"
        :label="settings.wheelZoom"
        :description="settings.wheelZoomDescription"
        :modified="wheelZoom !== defaults.wheelZoom"
        @reset="wheelZoom = defaults.wheelZoom"
      >
        <AppSwitch
          v-model="wheelZoom"
          :label="settings.wheelZoom"
          data-test-id="settings-wheel-zoom"
        />
      </SettingsRow>
      <SettingsRow
        as="label"
        :label="settings.invertZoom"
        :description="settings.invertZoomDescription"
        :modified="invertZoom !== defaults.invertZoom"
        @reset="invertZoom = defaults.invertZoom"
      >
        <AppSwitch
          v-model="invertZoom"
          :label="settings.invertZoom"
          data-test-id="settings-invert-zoom"
        />
      </SettingsRow>
    </SettingsGroup>
  </SettingsSection>
</template>
