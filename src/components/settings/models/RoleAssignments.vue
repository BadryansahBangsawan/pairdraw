<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@pairdraw/vue/i18n'

import { modelProfile } from '@/app/ai/models'
import { profileLogoSource } from '@/app/ai/models/provider-logo'
import { useModelRoleAssignments } from '@/app/ai/models/settings/assignments'
import { AI_MODEL_ROLES } from '@/app/ai/models/types'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import ProviderLogo from '@/components/settings/provider/ProviderLogo.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

import { useModelRoleLabels } from './role-labels'

const { ai } = useI18n()

const roleLabel = useModelRoleLabels()
const roleDefinitions = computed(() => AI_MODEL_ROLES.map((role) => ({ role, ...roleLabel(role) })))

const { assignmentValue, optionsForRole, updateAssignment } = useModelRoleAssignments(ai)

/** The logo of the profile a choice names; "same as Design" and "no model" have none. */
function logoFor(value: string): { provider: string; model?: string } {
  const profile = modelProfile(value)
  return profile ? profileLogoSource(profile) : { provider: '' }
}
</script>

<template>
  <SettingsGroup>
    <SettingsRow
      v-for="definition in roleDefinitions"
      :key="definition.role"
      class="max-sm:flex-col max-sm:items-stretch"
      :label="definition.label"
      :description="definition.description"
      :data-model-role="definition.role"
    >
      <AppSelect
        class="w-full sm:w-52"
        :model-value="assignmentValue(definition.role)"
        :options="optionsForRole(definition.role)"
        :label="definition.label"
        :data-test-id="`settings-model-assignment-${definition.role}`"
        @update:model-value="updateAssignment(definition.role, String($event))"
      >
        <template v-if="modelProfile(assignmentValue(definition.role))" #leading>
          <ProviderLogo v-bind="logoFor(assignmentValue(definition.role))" class="mr-2 size-3.5" />
        </template>
        <template #option="{ option }">
          <span class="flex min-w-0 items-center gap-2">
            <ProviderLogo
              v-if="modelProfile(option.value)"
              v-bind="logoFor(option.value)"
              class="size-3.5"
            />
            <!-- Keeps the label in line with the rows that show a logo. -->
            <span v-else class="size-3.5 shrink-0" />
            <span class="truncate">{{ option.label }}</span>
          </span>
        </template>
      </AppSelect>
    </SettingsRow>
  </SettingsGroup>
</template>
