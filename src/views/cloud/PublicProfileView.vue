<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { cloudPublicDocumentURL } from '@open-pencil/cloud/contract'
import { useCloudPortalMessages } from '@open-pencil/vue/i18n'

import { usePortal } from '@/app/cloud-portal/context'
import { usePublicProfileAPI } from '@/app/cloud-portal/profiles'
import { usePortalLoad } from '@/app/cloud-portal/state'
import { useDateFormat } from '@/app/i18n/date'
import PortalLoadAlert from '@/components/cloud-portal/layout/PortalLoadAlert.vue'
import PortalPublicLayout from '@/components/cloud-portal/layout/PortalPublicLayout.vue'
import { portalProfile, portalPublic } from '@/components/cloud-portal/ui'
import AccountAvatar from '@/components/presence/AccountAvatar.vue'

/**
 * Someone's public profile, `/u/<handle>`: their name and bio, and the workspaces they made public
 * with the files in each, which anyone opens read-only in the editor.
 */
const portal = usePortal()
const route = useRoute()
const api = usePublicProfileAPI()
const messages = useCloudPortalMessages()
const dates = useDateFormat()
const page = portalPublic()
const ui = portalProfile()

const handle = computed(() => (typeof route.params.handle === 'string' ? route.params.handle : ''))
const loaded = usePortalLoad(() => api.getPublicProfile(handle.value), null)
const profile = computed(() => loaded.data.value)
const missing = computed(() => loaded.status.value === 'ready' && !profile.value)
const documentURL = (id: string) => cloudPublicDocumentURL(globalThis.location.origin, id)
</script>

<template>
  <PortalPublicLayout
    :host="portal.host"
    :heading="profile?.name ?? (missing ? messages.publicProfileNotFound : messages.publicProfile)"
    :description="
      profile
        ? (profile.bio ?? undefined)
        : missing
          ? messages.publicProfileNotFoundDescription
          : undefined
    "
  >
    <template v-if="profile" #icon>
      <AccountAvatar :id="profile.handle" :name="profile.name" :image="profile.image" size="lg" />
    </template>
    <PortalLoadAlert
      v-if="loaded.error.value"
      :error="loaded.error.value"
      @retry="loaded.reload()"
    />
    <template v-if="profile">
      <p v-if="profile.workspaces.length === 0" :class="page.aside()">
        {{ messages.publicProfileEmpty }}
      </p>
      <section
        v-for="workspace in profile.workspaces"
        :key="workspace.id"
        :class="ui.workspace()"
        :aria-label="workspace.name"
        data-test-id="public-profile-workspace"
      >
        <h2 :class="ui.workspaceName()">{{ workspace.name }}</h2>
        <div v-if="workspace.documents.length" :class="ui.documents()">
          <a
            v-for="document in workspace.documents"
            :key="document.id"
            :href="documentURL(document.id)"
            :class="ui.document()"
            data-test-id="public-profile-document"
          >
            <icon-lucide-file :class="ui.documentIcon()" />
            <span :class="ui.documentBody()">
              <span :class="ui.documentName()">{{ document.name }}</span>
              <span :class="ui.documentDetail()">
                {{
                  messages.publicProfileUpdated({ date: dates.format(document.updatedAt, 'date') })
                }}
              </span>
            </span>
          </a>
        </div>
        <p v-else :class="ui.empty()">{{ messages.publicProfileEmpty }}</p>
      </section>
    </template>
  </PortalPublicLayout>
</template>
