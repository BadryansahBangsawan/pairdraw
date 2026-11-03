<script setup lang="ts">
import { computed, ref } from 'vue'

import { useMediaMessages, useSettingsMessages } from '@open-pencil/vue/i18n'

import {
  backgroundServiceID,
  IMAGE_AI_PROVIDER_DEFINITIONS,
  imageAIProviderID,
  REMOVE_BG_NAME
} from '@/app/editor/image-ai'
import { vectorizeProviderID, VECTORIZE_PROVIDER_DEFINITIONS } from '@/app/editor/vectorize'
import { pexelsKeyStatus, unsplashKeyStatus } from '@/app/settings/credentials/media'
import type { MediaSettingsService } from '@/app/settings/media/use'
import SettingsPage from '@/components/settings/layout/SettingsPage.vue'
import SettingsSection from '@/components/settings/layout/SettingsSection.vue'
import AppActionRow from '@/components/ui/list/AppActionRow.vue'
import { useHeldContent } from '@/components/ui/overlay/held'
import PanelDrillIn from '@/components/ui/panel/PanelDrillIn.vue'

import MediaBackgroundEditor from './MediaBackgroundEditor.vue'
import MediaCredentialEditor from './MediaCredentialEditor.vue'
import MediaImageAIEditor from './MediaImageAIEditor.vue'

/** The image AI editors open from this page beside the credential editors. */
type MediaEditor = MediaSettingsService | 'image-ai' | 'background'

const editing = ref<MediaEditor | null>(null)
// The editor keeps its service while it slides away.
const editedService = useHeldContent(editing)
const settings = useSettingsMessages()
const media = useMediaMessages()
const stockServices = computed(() => [
  { id: 'pexels' as const, name: 'Pexels', status: pexelsKeyStatus.value },
  { id: 'unsplash' as const, name: 'Unsplash', status: unsplashKeyStatus.value }
])
const vectorProvider = computed(() =>
  VECTORIZE_PROVIDER_DEFINITIONS.find((item) => item.id === vectorizeProviderID.value)
)
const imageAIProviderLabel = computed(() =>
  imageAIProviderID.value === 'openai'
    ? IMAGE_AI_PROVIDER_DEFINITIONS[0].name
    : media.value.imageAIProviderCompatible
)
const backgroundServiceLabel = computed(() =>
  backgroundServiceID.value === 'remove-bg' ? REMOVE_BG_NAME : media.value.backgroundServiceImageAI
)
</script>

<template>
  <PanelDrillIn :open="editing !== null" data-test-id="settings-media-panel">
    <template #detail>
      <MediaImageAIEditor v-if="editedService === 'image-ai'" @done="editing = null" />
      <MediaBackgroundEditor v-else-if="editedService === 'background'" @done="editing = null" />
      <MediaCredentialEditor
        v-else-if="editedService"
        :key="editedService"
        :service="editedService"
        @done="editing = null"
      />
    </template>
    <SettingsPage>
      <div class="flex flex-col gap-6">
        <SettingsSection>
          <template #title>{{ settings.media }}</template>
          <AppActionRow
            v-for="service in stockServices"
            :key="service.id"
            @click="editing = service.id"
          >
            {{ service.name }}
            <template #description>{{
              service.status === 'configured' ? settings.configured : settings.notConfigured
            }}</template>
            <template #trailing
              >{{ settings.edit }}<icon-lucide-chevron-right class="size-3.5"
            /></template>
          </AppActionRow>
        </SettingsSection>
        <SettingsSection>
          <template #title>{{ media.vectorization }}</template>
          <template #description
            >{{ media.vectorizationDescription }} {{ media.svgGenerationNote }}</template
          >
          <AppActionRow data-vectorize-settings @click="editing = 'vectorize'">
            {{ vectorProvider?.name }}
            <template #trailing
              >{{ settings.edit }}<icon-lucide-chevron-right class="size-3.5"
            /></template>
          </AppActionRow>
        </SettingsSection>
        <SettingsSection>
          <template #title>{{ media.imageAI }}</template>
          <template #description>{{ media.imageAIDescription }}</template>
          <AppActionRow data-image-ai-settings @click="editing = 'image-ai'">
            {{ imageAIProviderLabel }}
            <template #trailing
              >{{ settings.edit }}<icon-lucide-chevron-right class="size-3.5"
            /></template>
          </AppActionRow>
        </SettingsSection>
        <SettingsSection>
          <template #title>{{ media.backgroundRemoval }}</template>
          <template #description>{{ media.backgroundRemovalDescription }}</template>
          <AppActionRow data-background-settings @click="editing = 'background'">
            {{ backgroundServiceLabel }}
            <template #trailing
              >{{ settings.edit }}<icon-lucide-chevron-right class="size-3.5"
            /></template>
          </AppActionRow>
        </SettingsSection>
      </div>
    </SettingsPage>
  </PanelDrillIn>
</template>
