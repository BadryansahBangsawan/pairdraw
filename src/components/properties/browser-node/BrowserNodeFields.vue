<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, ref, useId, watch } from 'vue'

import { useBrowserMessages } from '@pairdraw/vue/i18n'

import { browserNodeFailureHeading } from '@/app/browser/node/failure'
import { browserNodeRefreshedTime } from '@/app/browser/node/panel'
import { BROWSER_DEVICES } from '@/app/browser/state'
import { browserURLPolicy, type BrowserURLRejection } from '@/app/browser/url'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import browserNodeTheme from '@/theme/browser-node'

/**
 * The Design panel's snapshot fields. The address commits when it loses focus or Enter is
 * pressed, and only once it is a page the window would open. Refresh and Open stay disabled
 * where the desktop window is not there; the address and the device stay editable.
 */
const {
  url,
  preset,
  refreshedAt,
  canRefresh,
  refreshing = false,
  error = ''
} = defineProps<{
  url: string
  preset: string
  refreshedAt: string
  canRefresh: boolean
  refreshing?: boolean
  error?: string
}>()
const emit = defineEmits<{
  commitAddress: [url: string]
  commitPreset: [preset: string]
  refresh: []
  open: []
}>()

const messages = useBrowserMessages()
const styles = tv(browserNodeTheme)()
const addressId = useId()
const draft = ref(url)
const localError = ref('')

watch(
  () => url,
  (value) => {
    draft.value = value
    localError.value = ''
  }
)

const presetModel = computed({
  get: () => preset,
  set: (value: string) => {
    if (value !== preset) emit('commitPreset', value)
  }
})

const presetOptions = computed(() =>
  BROWSER_DEVICES.map((device) => ({
    value: device.id,
    label: presetLabel(device.id)
  }))
)

const refreshedLabel = computed(() => browserNodeRefreshedTime(refreshedAt))

const notice = computed(() => {
  if (localError.value) return { tone: 'error' as const, heading: localError.value }
  if (error) {
    return { tone: 'error' as const, heading: browserNodeFailureHeading(error, messages.value) }
  }
  if (!canRefresh) {
    return { tone: 'info' as const, heading: messages.value.snapshotCannotRefresh }
  }
  return null
})

function presetLabel(id: string): string {
  const copy = messages.value
  const labels: Record<string, string> = {
    desktop: copy.deviceDesktop,
    'iphone-14': copy.devicePhoneNarrow,
    'pixel-7': copy.devicePhoneWide,
    'ipad-air': copy.deviceTablet
  }
  return labels[id] ?? id
}

function addressMessage(reason: BrowserURLRejection): string {
  const copy = messages.value
  if (reason === 'empty') return copy.emptyAddress
  if (reason === 'scheme') return copy.schemeRefused
  return copy.invalidAddress
}

function commitAddress() {
  const policy = browserURLPolicy(draft.value)
  if (!policy.ok) {
    localError.value = addressMessage(policy.reason)
    return
  }
  localError.value = ''
  if (policy.url === url) return
  emit('commitAddress', policy.url)
}

function onEnter(event: KeyboardEvent) {
  event.preventDefault()
  commitAddress()
}
</script>

<template>
  <div :class="styles.root()" data-slot="browser-node">
    <PanelFieldGroup :label="messages.address" :for="addressId">
      <AppInput
        :id="addressId"
        v-model="draft"
        :aria-label="messages.address"
        :placeholder="messages.addressPlaceholder"
        :state="localError ? 'invalid' : 'idle'"
        :aria-invalid="localError ? 'true' : undefined"
        @change="commitAddress"
        @enter="onEnter"
      />
    </PanelFieldGroup>
    <PanelFieldGroup :label="messages.device">
      <AppSelect v-model="presetModel" :label="messages.device" :options="presetOptions" />
    </PanelFieldGroup>
    <div :class="styles.actions()">
      <AppButton
        size="xs"
        variant="outline"
        :disabled="!canRefresh"
        :loading="refreshing"
        @click="emit('refresh')"
      >
        {{ messages.snapshotRefresh }}
      </AppButton>
      <AppButton size="xs" variant="outline" :disabled="!canRefresh" @click="emit('open')">
        {{ messages.snapshotOpen }}
      </AppButton>
    </div>
    <time :datetime="refreshedAt" :class="styles.time()" data-test-id="browser-node-refreshed">
      {{ messages.snapshotRefreshed({ time: refreshedLabel }) }}
    </time>
    <AppAlert v-if="notice" :tone="notice.tone" :heading="notice.heading" />
  </div>
</template>
