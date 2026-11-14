<script setup lang="ts">
import type { OnboardingPlan } from '@/app/ai/models/settings/onboarding/plan'
import { AI_MODEL_ROLES } from '@/app/ai/models/types'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import ProviderLogo from '@/components/settings/provider/ProviderLogo.vue'

import { useRoleLabels } from './role-label'

const { plan } = defineProps<{ plan: OnboardingPlan }>()
const { choiceLabel, roleLabel } = useRoleLabels()
</script>

<template>
  <SettingsGroup>
    <SettingsRow
      v-for="role in AI_MODEL_ROLES"
      :key="role"
      :label="roleLabel(role).label"
      :description="choiceLabel(plan[role])"
      :data-model-role="role"
    >
      <ProviderLogo
        v-if="plan[role] && plan[role] !== 'design'"
        :provider="plan[role].providerID"
        :model="plan[role].modelID"
      />
    </SettingsRow>
  </SettingsGroup>
</template>
