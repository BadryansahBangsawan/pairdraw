<script setup lang="ts">
import { useI18n } from '@pairdraw/vue/i18n'

import {
  roleChoiceKey,
  type OnboardingPlan,
  type PlannedModel,
  type PlannedRole
} from '@/app/ai/models/settings/onboarding/plan'
import { AI_MODEL_ROLES, type AIModelRole } from '@/app/ai/models/types'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import ProviderLogo from '@/components/settings/provider/ProviderLogo.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

import { useRoleLabels } from './role-label'

const { plan, options, isRecommended } = defineProps<{
  plan: OnboardingPlan
  options: (role: AIModelRole) => PlannedRole[]
  isRecommended: boolean
}>()
const emit = defineEmits<{ choose: [role: AIModelRole, key: string]; useRecommended: [] }>()
const { ai } = useI18n()
const { choiceLabel, roleLabel } = useRoleLabels()

/** The model a choice names, whose logo it shows; "same as Design" and "no model" have none. */
function chosenModel(role: AIModelRole, key: string | number): PlannedModel | null {
  const choice = options(role).find((option) => roleChoiceKey(option) === key)
  return choice && choice !== 'design' ? choice : null
}

function selectOptions(role: AIModelRole) {
  return options(role).map((option) => ({
    value: roleChoiceKey(option),
    label: choiceLabel(option)
  }))
}
</script>

<template>
  <SettingsGroup>
    <SettingsRow
      v-for="role in AI_MODEL_ROLES"
      :key="role"
      class="max-sm:flex-col max-sm:items-stretch"
      :label="roleLabel(role).label"
      :description="roleLabel(role).description"
      :data-model-role="role"
    >
      <AppSelect
        class="w-full sm:w-64"
        :model-value="roleChoiceKey(plan[role])"
        :options="selectOptions(role)"
        :label="roleLabel(role).label"
        @update:model-value="emit('choose', role, String($event))"
      >
        <template v-if="plan[role] && plan[role] !== 'design'" #leading>
          <ProviderLogo
            :provider="plan[role].providerID"
            :model="plan[role].modelID"
            class="mr-2 size-3.5"
          />
        </template>
        <template #option="{ option }">
          <span class="flex min-w-0 items-center gap-2">
            <ProviderLogo
              v-if="chosenModel(role, option.value)"
              :provider="chosenModel(role, option.value)?.providerID ?? ''"
              :model="chosenModel(role, option.value)?.modelID"
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
  <AppButton v-if="!isRecommended" class="self-start" @click="emit('useRecommended')">
    {{ ai.aiSetupUseRecommended }}
  </AppButton>
</template>
