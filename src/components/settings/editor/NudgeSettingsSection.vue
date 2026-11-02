<script setup lang="ts">
import { computed } from 'vue'

import { useSettingsMessages } from '@open-pencil/vue/i18n'

import { NUDGE_DISTANCE_MAX, NUDGE_DISTANCE_MIN } from '@/app/settings/preferences/schema'
import {
  appPreferences,
  DEFAULT_APP_PREFERENCES,
  updateNudgePreferences
} from '@/app/settings/preferences/store'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import SettingsSection from '@/components/settings/layout/SettingsSection.vue'
import PresetNumberField from '@/components/ui/input/PresetNumberField.vue'

/** How far the arrow keys move selected layers, alone and with Shift. */
const settings = useSettingsMessages()

const SMALL_NUDGE_PRESETS = [0.5, 1, 2, 4]
const BIG_NUDGE_PRESETS = [5, 8, 10, 16, 20]
const defaults = DEFAULT_APP_PREFERENCES.editing.nudge

const smallNudge = computed({
  get: () => appPreferences.value.editing.nudge.small,
  set: (small: number) => updateNudgePreferences({ small })
})

const bigNudge = computed({
  get: () => appPreferences.value.editing.nudge.large,
  set: (large: number) => updateNudgePreferences({ large })
})

const rangeMessage = computed(() =>
  settings.value.nudgeRange({ min: NUDGE_DISTANCE_MIN, max: NUDGE_DISTANCE_MAX })
)
</script>

<template>
  <SettingsSection>
    <template #title>{{ settings.nudge }}</template>

    <SettingsGroup>
      <SettingsRow
        :label="settings.smallNudge"
        :description="settings.smallNudgeDescription"
        class="max-sm:flex-col max-sm:items-stretch"
        :modified="smallNudge !== defaults.small"
        @reset="smallNudge = defaults.small"
      >
        <PresetNumberField
          v-model:number="smallNudge"
          :presets="SMALL_NUDGE_PRESETS"
          :min="NUDGE_DISTANCE_MIN"
          :max="NUDGE_DISTANCE_MAX"
          :label="settings.smallNudge"
          :custom-label="settings.nudgeCustom"
          :range-message="rangeMessage"
          fractional
          data-test-id="settings-small-nudge"
        />
      </SettingsRow>
      <SettingsRow
        :label="settings.bigNudge"
        :description="settings.bigNudgeDescription"
        class="max-sm:flex-col max-sm:items-stretch"
        :modified="bigNudge !== defaults.large"
        @reset="bigNudge = defaults.large"
      >
        <PresetNumberField
          v-model:number="bigNudge"
          :presets="BIG_NUDGE_PRESETS"
          :min="NUDGE_DISTANCE_MIN"
          :max="NUDGE_DISTANCE_MAX"
          :label="settings.bigNudge"
          :custom-label="settings.nudgeCustom"
          :range-message="rangeMessage"
          fractional
          data-test-id="settings-big-nudge"
        />
      </SettingsRow>
    </SettingsGroup>
  </SettingsSection>
</template>
