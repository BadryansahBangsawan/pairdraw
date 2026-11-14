<script setup lang="ts">
import { tv } from 'tailwind-variants'

import { useCloudMessages } from '@pairdraw/vue/i18n'

import AppButton from '@/components/ui/button/AppButton.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import cloudShareTheme from '@/theme/cloud/share'

import type { ShareSnapshotState } from './types'

/**
 * The document's snapshot link: a view-only link to one saved version that anyone with it can
 * download as a `.fig` file. Update snapshot pins the same link to the latest save; deleting it
 * stops it opening anything.
 */
const { snapshot, copied = false } = defineProps<{
  snapshot: ShareSnapshotState
  copied?: boolean
}>()
const emit = defineEmits<{ share: []; copy: []; reset: []; delete: [] }>()

const ui = tv(cloudShareTheme)()
const t = useCloudMessages()
</script>

<template>
  <section aria-labelledby="share-snapshot-heading" data-test-id="cloud-share-snapshot">
    <h3 id="share-snapshot-heading" :class="ui.heading()">{{ t.shareSnapshotHeading }}</h3>
    <div :class="ui.access()">
      <span :class="ui.accessIcon()" :data-access="snapshot.state === 'shared' ? 'link' : null">
        <icon-lucide-camera class="size-4" />
      </span>
      <div :class="ui.accessBody()">
        <p :class="ui.accessDetail()">
          {{
            snapshot.state === 'unsaved'
              ? t.shareSnapshotNeedsSave
              : snapshot.state === 'shared'
                ? snapshot.behind
                  ? t.shareSnapshotBehind
                  : t.shareSnapshotCurrent
                : t.shareSnapshotDescription
          }}
        </p>
        <div :class="ui.snapshotActions()">
          <AppButton
            v-if="snapshot.state === 'none'"
            variant="outline"
            size="sm"
            data-test-id="cloud-share-snapshot-create"
            @click="emit('share')"
          >
            <template #leading><icon-lucide-camera class="size-3.5" /></template>
            {{ t.shareSnapshotCreate }}
          </AppButton>
          <template v-else-if="snapshot.state === 'shared'">
            <AppButton
              v-if="snapshot.copyable"
              variant="outline"
              size="sm"
              data-test-id="cloud-share-snapshot-copy"
              @click="emit('copy')"
            >
              <template #leading>
                <icon-lucide-check v-if="copied" class="size-3.5" />
                <icon-lucide-link v-else class="size-3.5" />
              </template>
              {{ copied ? t.shareSnapshotCopied : t.shareSnapshotCopy }}
            </AppButton>
            <Tip v-else :label="t.shareSnapshotResetTip">
              <AppButton variant="outline" size="sm" @click="emit('reset')">
                <template #leading><icon-lucide-refresh-cw class="size-3.5" /></template>
                {{ t.shareResetLink }}
              </AppButton>
            </Tip>
            <AppButton
              v-if="snapshot.behind"
              variant="outline"
              size="sm"
              data-test-id="cloud-share-snapshot-update"
              @click="emit('share')"
            >
              <template #leading><icon-lucide-refresh-ccw class="size-3.5" /></template>
              {{ t.shareSnapshotUpdate }}
            </AppButton>
            <AppButton
              variant="ghost"
              size="sm"
              data-test-id="cloud-share-snapshot-delete"
              @click="emit('delete')"
            >
              <template #leading><icon-lucide-trash-2 class="size-3.5" /></template>
              {{ t.shareSnapshotDelete }}
            </AppButton>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
