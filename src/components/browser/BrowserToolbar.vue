<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { useBrowserMessages } from '@open-pencil/vue/i18n'

import {
  browserState,
  BROWSER_ZOOM_MAX,
  BROWSER_ZOOM_MIN,
  setDevice,
  setZoom
} from '@/app/browser/state'
import {
  browserAddressRequest,
  browserDeviceRequest,
  browserZoomRequest,
  type BrowserToolbarRefusal
} from '@/app/browser/toolbar'
import {
  closeBrowserWindow,
  goBack,
  goForward,
  openBrowserWindow,
  reloadBrowserWindow,
  sizeBrowserWindow,
  watchBrowserWindow,
  zoomBrowserWindow
} from '@/app/browser/window'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import { IS_TAURI } from '@/constants'

/**
 * Controls for the desktop browser window. The page itself is a separate webview with no app UI
 * and no Tauri permission, so the address, history, zoom, and device size live here, in the editor.
 * A browser tab can show the controls and why they do nothing; it never calls the window.
 */
const messages = useBrowserMessages()
const popover = usePopoverUI({ content: 'w-80 p-3' })
const address = ref(browserState.url ?? '')
const addressFocused = ref(false)
const zoomDraft = ref<number | string>(browserState.zoom)
const refusal = ref<string | null>(null)
let stopWatch: (() => void) | undefined
let left = false

const windowReady = computed(() => IS_TAURI && browserState.open)
const deviceOptions = computed(() => [
  { value: 'desktop', label: messages.value.deviceDesktop },
  { value: 'iphone-14', label: messages.value.devicePhoneNarrow },
  { value: 'pixel-7', label: messages.value.devicePhoneWide },
  { value: 'ipad-air', label: messages.value.deviceTablet }
])
const notice = computed(() => {
  if (!IS_TAURI) return { tone: 'info' as const, description: messages.value.desktopOnly }
  if (refusal.value) return { tone: 'error' as const, description: refusal.value }
  return null
})

watch(
  () => browserState.url,
  (url) => {
    if (!addressFocused.value && url) address.value = url
  }
)
watch(
  () => browserState.zoom,
  (zoom) => {
    zoomDraft.value = zoom
  }
)

onMounted(() => {
  if (!IS_TAURI) return
  void watchBrowserWindow().then((stop) => {
    if (left) stop()
    else stopWatch = stop
    return null
  })
})
onUnmounted(() => {
  left = true
  stopWatch?.()
})

function reasonText(reason: BrowserToolbarRefusal): string {
  switch (reason) {
    case 'desktop':
      return messages.value.desktopOnly
    case 'empty':
      return messages.value.emptyAddress
    case 'scheme':
      return messages.value.schemeRefused
    case 'invalid':
      return messages.value.invalidAddress
  }
}

function commandError(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error)
  return messages.value.commandFailed({ error: detail })
}

async function submitAddress() {
  const request = browserAddressRequest(address.value, IS_TAURI)
  if (!request.ok) {
    refusal.value = reasonText(request.reason)
    return
  }
  try {
    await openBrowserWindow(request.value)
    address.value = request.value
    const device = browserDeviceRequest(browserState.device, true)
    if (device.ok && (device.value.width > 0 || device.value.height > 0)) {
      await sizeBrowserWindow(device.value.width, device.value.height)
    }
    if (browserState.zoom !== 100) await zoomBrowserWindow(browserState.zoom)
    refusal.value = null
  } catch (error) {
    refusal.value = commandError(error)
  }
}

async function applyZoom(percent: number) {
  const request = browserZoomRequest(percent, IS_TAURI)
  if (!request.ok) {
    refusal.value = reasonText(request.reason)
    return
  }
  try {
    if (browserState.open) await zoomBrowserWindow(request.value)
    setZoom(request.value)
    refusal.value = null
  } catch (error) {
    zoomDraft.value = browserState.zoom
    refusal.value = commandError(error)
  }
}

function commitZoom() {
  const parsed = typeof zoomDraft.value === 'number' ? zoomDraft.value : Number(zoomDraft.value)
  void applyZoom(parsed)
}

async function onDevice(id: string) {
  const request = browserDeviceRequest(id, IS_TAURI)
  if (!request.ok) {
    refusal.value = reasonText(request.reason)
    return
  }
  try {
    if (browserState.open) {
      await sizeBrowserWindow(request.value.width, request.value.height)
    }
    setDevice(request.value.id)
    refusal.value = null
  } catch (error) {
    refusal.value = commandError(error)
  }
}

async function runWindowCommand(command: () => Promise<void>) {
  if (!windowReady.value) return
  try {
    await command()
    refusal.value = null
  } catch (error) {
    refusal.value = commandError(error)
  }
}
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger as-child>
      <IconButton
        :label="messages.openBrowser"
        size="sm"
        side="bottom"
        data-test-id="editor-browser"
      >
        <icon-lucide-globe class="size-4" />
      </IconButton>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        :class="popover.content"
        :side-offset="8"
        side="bottom"
        align="end"
        data-test-id="browser-toolbar"
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <span class="text-sm font-medium">{{ messages.title }}</span>
          <span v-if="browserState.title" class="truncate text-xs text-muted">{{
            browserState.title
          }}</span>
        </div>

        <AppAlert
          v-if="notice"
          :tone="notice.tone"
          :heading="messages.title"
          :description="notice.description"
          data-test-id="browser-toolbar-notice"
        />

        <form class="mt-2 flex flex-col gap-2" @submit.prevent="submitAddress">
          <PanelFieldGroup :label="messages.address">
            <AppInput
              v-model="address"
              type="url"
              :placeholder="messages.addressPlaceholder"
              :aria-label="messages.address"
              :disabled="!IS_TAURI"
              data-test-id="browser-address"
              @focus="addressFocused = true"
              @blur="addressFocused = false"
            />
          </PanelFieldGroup>
          <div class="flex items-center gap-1">
            <IconButton
              :label="messages.back"
              size="sm"
              :disabled="!windowReady"
              data-test-id="browser-back"
              @click="runWindowCommand(goBack)"
            >
              <icon-lucide-arrow-left class="size-4" />
            </IconButton>
            <IconButton
              :label="messages.forward"
              size="sm"
              :disabled="!windowReady"
              data-test-id="browser-forward"
              @click="runWindowCommand(goForward)"
            >
              <icon-lucide-arrow-right class="size-4" />
            </IconButton>
            <IconButton
              :label="messages.reload"
              size="sm"
              :disabled="!windowReady"
              data-test-id="browser-reload"
              @click="runWindowCommand(reloadBrowserWindow)"
            >
              <icon-lucide-rotate-cw class="size-4" />
            </IconButton>
            <AppButton type="submit" size="sm" :disabled="!IS_TAURI" data-test-id="browser-open">
              {{ messages.open }}
            </AppButton>
            <IconButton
              :label="messages.close"
              size="sm"
              :disabled="!windowReady"
              data-test-id="browser-close"
              @click="runWindowCommand(closeBrowserWindow)"
            >
              <icon-lucide-x class="size-4" />
            </IconButton>
          </div>
          <div class="flex items-end gap-1">
            <IconButton
              :label="messages.zoomOut"
              size="sm"
              :disabled="!IS_TAURI"
              data-test-id="browser-zoom-out"
              @click="applyZoom(browserState.zoom - 25)"
            >
              <icon-lucide-minus class="size-4" />
            </IconButton>
            <PanelFieldGroup :label="messages.zoom" class="min-w-0 flex-1">
              <AppInput
                v-model="zoomDraft"
                type="number"
                :min="BROWSER_ZOOM_MIN"
                :max="BROWSER_ZOOM_MAX"
                :step="25"
                :aria-label="messages.zoomValue({ percent: String(browserState.zoom) })"
                :disabled="!IS_TAURI"
                data-test-id="browser-zoom"
                @change="commitZoom"
              />
            </PanelFieldGroup>
            <IconButton
              :label="messages.zoomIn"
              size="sm"
              :disabled="!IS_TAURI"
              data-test-id="browser-zoom-in"
              @click="applyZoom(browserState.zoom + 25)"
            >
              <icon-lucide-plus class="size-4" />
            </IconButton>
          </div>
          <PanelFieldGroup :label="messages.device">
            <AppSelect
              :model-value="browserState.device"
              :options="deviceOptions"
              :label="messages.device"
              :disabled="!IS_TAURI"
              data-test-id="browser-device"
              @update:model-value="onDevice"
            />
          </PanelFieldGroup>
        </form>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
