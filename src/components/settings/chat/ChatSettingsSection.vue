<script setup lang="ts">
import { computed } from 'vue'

import { useAgentMessages, useI18n } from '@pairdraw/vue/i18n'

import {
  animateAIEdits,
  approveActions,
  compactAutomatically,
  canvasPrompt,
  changePreviewSize,
  maxAgentSteps,
  reasoningDisplay,
  showTokenUsage
} from '@/app/ai/chat/preferences'
import { AGENT_STEP_LIMIT_MIN, AGENT_STEP_LIMIT_MAX } from '@/app/ai/reply/schema'
import { openToolAccessSettings } from '@/app/automation/tool-access/settings/use'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import SettingsSection from '@/components/settings/layout/SettingsSection.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import PresetNumberField from '@/components/ui/input/PresetNumberField.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'

const { ai, automation, settings } = useI18n()
const agents = useAgentMessages()
const stepPresets = [25, 50, 100, 200]
const limitMessage = computed(() =>
  ai.value.maxAgentStepsRange({ min: AGENT_STEP_LIMIT_MIN, max: AGENT_STEP_LIMIT_MAX })
)
const options = computed(() => [
  { value: 'collapsed' as const, label: ai.value.reasoningCollapsed },
  { value: 'while-thinking' as const, label: ai.value.reasoningWhileThinking },
  { value: 'expanded' as const, label: ai.value.reasoningExpanded }
])
const previewOptions = computed(() => [
  { value: 'off' as const, label: ai.value.changePreviewOff },
  { value: 'small' as const, label: ai.value.changePreviewSmall },
  { value: 'medium' as const, label: ai.value.changePreviewMedium },
  { value: 'large' as const, label: ai.value.changePreviewLarge }
])
</script>

<template>
  <SettingsSection>
    <template #title>{{ ai.chatSettings }}</template>
    <SettingsGroup>
      <SettingsRow :label="ai.reasoningDisplay" class="max-sm:flex-col max-sm:items-stretch">
        <AppSelect
          v-model="reasoningDisplay"
          :label="ai.reasoningDisplay"
          :options="options"
          :ui="{ trigger: 'w-full sm:w-52' }"
        />
      </SettingsRow>
      <SettingsRow
        :label="ai.changePreview"
        :description="ai.changePreviewHint"
        class="max-sm:flex-col max-sm:items-stretch"
      >
        <AppSelect
          v-model="changePreviewSize"
          :label="ai.changePreview"
          :options="previewOptions"
          :ui="{ trigger: 'w-full sm:w-52' }"
        />
      </SettingsRow>
      <SettingsRow
        :label="ai.maxAgentSteps"
        :description="ai.maxAgentStepsHint"
        class="max-sm:flex-col max-sm:items-stretch"
      >
        <PresetNumberField
          v-model:number="maxAgentSteps"
          :presets="stepPresets"
          :min="AGENT_STEP_LIMIT_MIN"
          :max="AGENT_STEP_LIMIT_MAX"
          :label="ai.maxAgentSteps"
          :custom-label="ai.maxAgentStepsCustom"
          :range-message="limitMessage"
        />
      </SettingsRow>
      <SettingsRow :label="ai.canvasPrompt" :description="ai.canvasPromptHint">
        <AppSwitch v-model="canvasPrompt" :label="ai.canvasPrompt" />
      </SettingsRow>
      <SettingsRow :label="ai.animateEdits" :description="ai.animateEditsHint">
        <AppSwitch
          v-model="animateAIEdits"
          :label="ai.animateEdits"
          data-test-id="settings-ai-animate-edits"
        />
      </SettingsRow>
      <SettingsRow :label="ai.showTokenUsage" :description="ai.showTokenUsageHint">
        <AppSwitch
          v-model="showTokenUsage"
          :label="ai.showTokenUsage"
          data-test-id="settings-ai-show-token-usage"
        />
      </SettingsRow>
      <SettingsRow :label="agents.approveActions" :description="agents.approveActionsHint">
        <AppSwitch
          v-model="approveActions"
          :label="agents.approveActions"
          data-test-id="settings-ai-approve-actions"
        />
      </SettingsRow>
      <SettingsRow :label="ai.compactAutomatically" :description="ai.compactAutomaticallyHint">
        <AppSwitch
          v-model="compactAutomatically"
          :label="ai.compactAutomatically"
          data-test-id="settings-ai-compact-automatically"
        />
      </SettingsRow>
    </SettingsGroup>
    <SettingsGroup>
      <SettingsRow :label="settings.toolAccess" :description="automation.aiToolAccessDescription">
        <AppButton
          size="xs"
          variant="outline"
          data-test-id="settings-ai-tool-access"
          @click="openToolAccessSettings('ai')"
          >{{ settings.edit }}</AppButton
        >
      </SettingsRow>
    </SettingsGroup>
  </SettingsSection>
</template>
