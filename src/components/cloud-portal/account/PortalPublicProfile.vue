<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { CloudAPIError } from '@pairdraw/cloud/client'
import {
  cloudPublicProfilePath,
  isPublicProfileHandle,
  PUBLIC_PROFILE_BIO_MAX_LENGTH
} from '@pairdraw/cloud/contract'
import { useCloudPortalMessages } from '@pairdraw/vue/i18n'

import { portalURL } from '@/app/cloud-portal/navigation'
import { usePublicProfileAPI } from '@/app/cloud-portal/profiles'
import { usePortalAction, usePortalLoad } from '@/app/cloud-portal/state'
import { portalToast } from '@/app/cloud-portal/toast'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import SettingsSection from '@/components/settings/layout/SettingsSection.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import { useAppButtonUI } from '@/components/ui/button/button'
import AppConfirmationDialog from '@/components/ui/dialog/AppConfirmationDialog.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import AppTextarea from '@/components/ui/input/AppTextarea.vue'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'

import { portalForm, portalProfile } from '../ui'

/**
 * The signed-in person's public profile, `/u/<handle>`: the handle and bio it shows, and which of
 * the workspaces they administer it lists, whose files anyone may then open read-only.
 */
const api = usePublicProfileAPI()
const messages = useCloudPortalMessages()
const ui = portalProfile()
const form = portalForm({ size: 'md' })
const viewLink = useAppButtonUI({ variant: 'outline', size: 'sm' })

const loaded = usePortalLoad(() => api.getPublicProfileSettings(), null)
const settings = computed(() => loaded.data.value)
const handle = ref('')
const bio = ref('')
watch(
  settings,
  (value) => {
    handle.value = value?.handle ?? ''
    bio.value = value?.bio ?? ''
  },
  { immediate: true }
)
const normalized = computed(() => handle.value.trim().toLowerCase())
const handleValid = computed(() => isPublicProfileHandle(normalized.value))
const profilePath = computed(() =>
  settings.value?.handle ? cloudPublicProfilePath(settings.value.handle) : null
)
const address = computed(() =>
  portalURL(cloudPublicProfilePath(normalized.value || messages.value.publicProfileHandle))
)

async function saved(update: Promise<unknown>, notice: string) {
  try {
    await update
  } catch (error) {
    if (error instanceof CloudAPIError && error.code === 'handle_taken') {
      save.fail(messages.value.publicProfileHandleTaken)
      return
    }
    throw error
  }
  await loaded.reload()
  portalToast.info(notice)
}

const save = usePortalAction(() =>
  saved(
    api.updatePublicProfile({ handle: normalized.value, bio: bio.value }),
    messages.value.publicProfileSaved
  )
)
const remove = usePortalAction(() =>
  saved(api.updatePublicProfile({ handle: null }), messages.value.publicProfileRemoved)
)
const publish = usePortalAction(async (workspaceId: string, published: boolean) => {
  try {
    await api.publishWorkspace(workspaceId, published)
  } catch {
    portalToast.error(messages.value.publicProfilePublishFailed)
  }
  await loaded.reload()
})

/**
 * The workspace about to go public. Making one public lets anyone download every file in it, so
 * it asks first; making one private again does not. It stays named while the dialog closes.
 */
const confirming = ref<{ id: string; name: string } | null>(null)
const confirmOpen = ref(false)

function toggleWorkspace(workspace: { id: string; name: string }, published: boolean) {
  if (!published) {
    void publish.run(workspace.id, false)
    return
  }
  confirming.value = { id: workspace.id, name: workspace.name }
  confirmOpen.value = true
}

function confirmPublish() {
  if (confirming.value) void publish.run(confirming.value.id, true)
}
watch(remove.error, (failure) => failure && portalToast.error(failure))
const busy = computed(() => save.busy.value || remove.busy.value || publish.busy.value)
</script>

<template>
  <SettingsSection :level="2" v-if="settings" data-test-id="portal-public-profile">
    <template #title>{{ messages.publicProfile }}</template>
    <template #description>{{ messages.publicProfileDescription({ address }) }}</template>
    <form :class="ui.settings()" @submit.prevent="handleValid && save.run()">
      <label :class="form.field()">
        <span :class="form.label()">{{ messages.publicProfileHandle }}</span>
        <AppInput
          v-model="handle"
          autocomplete="off"
          spellcheck="false"
          :aria-invalid="(handle !== '' && !handleValid) || undefined"
          data-test-id="portal-public-profile-handle"
        />
        <span :class="form.hint()">{{ save.error.value ?? messages.publicProfileHandleHint }}</span>
      </label>
      <label :class="form.field()">
        <span :class="form.label()">{{ messages.publicProfileBio }}</span>
        <AppTextarea v-model="bio" :rows="2" :maxlength="PUBLIC_PROFILE_BIO_MAX_LENGTH" />
      </label>
      <div :class="ui.settingsActions()">
        <AppButton
          type="submit"
          size="sm"
          color="primary"
          variant="solid"
          :disabled="!handleValid || busy"
          :loading="save.busy.value"
        >
          {{ messages.save }}
        </AppButton>
        <a v-if="profilePath" :href="profilePath" :class="viewLink.base">
          {{ messages.publicProfileView }}
        </a>
        <AppButton
          v-if="settings.handle"
          size="sm"
          variant="ghost"
          :disabled="busy"
          @click="remove.run()"
        >
          {{ messages.publicProfileRemove }}
        </AppButton>
      </div>
    </form>
    <SettingsGroup v-if="settings.handle">
      <SettingsRow
        :label="messages.publicProfileWorkspaces"
        :description="
          settings.workspaces.length
            ? messages.publicProfileWorkspacesDescription
            : messages.publicProfileNoWorkspaces
        "
      />
      <SettingsRow
        v-for="workspace in settings.workspaces"
        :key="workspace.id"
        as="label"
        :label="workspace.name"
      >
        <AppSwitch
          :model-value="workspace.public"
          :label="messages.publicProfileShowWorkspace({ workspace: workspace.name })"
          :disabled="busy"
          @update:model-value="toggleWorkspace(workspace, $event)"
        />
      </SettingsRow>
    </SettingsGroup>
    <AppConfirmationDialog
      v-model:open="confirmOpen"
      tone="warning"
      :heading="messages.publicProfilePublishHeading({ workspace: confirming?.name ?? '' })"
      :description="messages.publicProfilePublishDescription"
      :cancel-label="messages.cancel"
      :confirm-label="messages.publicProfilePublishConfirm"
      data-test-id="portal-public-profile-publish-confirm"
      @confirm="confirmPublish"
    />
  </SettingsSection>
</template>
