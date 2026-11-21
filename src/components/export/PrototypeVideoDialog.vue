<script setup lang="ts">
import { computed } from 'vue'

import { VIDEO_FORMAT_LABELS, VIDEO_FORMATS } from '@pairdraw/core/io/formats/video'
import { useCommonMessages, usePanelMessages } from '@pairdraw/vue/i18n'

import { VIDEO_SIZE_PRESET_IDS, type VideoSizePreset } from '@/app/document/export/video/record'
import { useVideoExport, VIDEO_FRAME_RATES } from '@/app/document/export/video/use'
import { useEditorStore } from '@/app/editor/active-store'
import NumberField from '@/components/inputs/NumberField.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppDialog from '@/components/ui/dialog/AppDialog.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppProgress from '@/components/ui/feedback/AppProgress.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'

/**
 * File › Export prototype as video: the frame to play from and the file to make, a summary of
 * what the recording will hold, and its progress while it records.
 */
const store = useEditorStore()
const panels = usePanelMessages()
const common = useCommonMessages()
const {
  open,
  settings,
  frames,
  plan,
  formats,
  progress,
  failure,
  update,
  setFormat,
  record,
  cancel
} = useVideoExport(store)

/** The longest a recording may run, in seconds, as the CLI and MCP tool allow. */
const MAX_SECONDS = 120

const frameOptions = computed(() =>
  frames.value.map((frame) => ({ value: frame.id, label: frame.name }))
)
const formatOptions = computed(() =>
  VIDEO_FORMATS.map((format) => ({
    value: format,
    label: VIDEO_FORMAT_LABELS[format],
    disabled: !formats.value.includes(format)
  }))
)
const sizeOptions = computed(() => {
  const labels: Record<VideoSizePreset, string> = {
    '1x': panels.value.prototypeVideoSizeOriginal,
    '2x': panels.value.prototypeVideoSizeDouble,
    '1920': panels.value.prototypeVideoSizeLongEdge({ pixels: '1920' }),
    '1280': panels.value.prototypeVideoSizeLongEdge({ pixels: '1280' })
  }
  return VIDEO_SIZE_PRESET_IDS.map((value) => ({ value, label: labels[value] }))
})
const frameRateOptions = computed(() =>
  settings.value
    ? VIDEO_FRAME_RATES[settings.value.format].map((fps) => ({
        value: String(fps),
        label: panels.value.prototypeVideoFps({ fps: String(fps) })
      }))
    : []
)
/** Names the formats this browser can record when it cannot record them all. */
const formatsHere = computed(() =>
  formats.value.length < VIDEO_FORMATS.length
    ? panels.value.prototypeVideoFormatsHere({
        formats: formats.value.map((format) => VIDEO_FORMAT_LABELS[format]).join(', ')
      })
    : null
)
const summary = computed(() => {
  const planned = plan.value
  if (planned?.kind !== 'ready') return null
  return panels.value.prototypeVideoSummary({
    seconds: (planned.durationMs / 1000).toFixed(1),
    width: String(planned.width),
    height: String(planned.height)
  })
})
const canRecord = computed(
  () =>
    plan.value?.kind === 'ready' &&
    settings.value !== null &&
    formats.value.includes(settings.value.format) &&
    progress.value === null
)

function chooseSize(value: string) {
  const preset = VIDEO_SIZE_PRESET_IDS.find((candidate) => candidate === value)
  if (preset) update({ size: preset })
}

function chooseFormat(value: string) {
  const format = VIDEO_FORMATS.find((candidate) => candidate === value)
  if (format) setFormat(format)
}
</script>

<template>
  <AppDialog
    v-model:open="open"
    :heading="panels.prototypeVideoHeading"
    :description="panels.prototypeVideoDescription"
    :close-label="common.close"
    size="sm"
    :ui="{ footer: 'justify-end' }"
    data-test-id="prototype-video-dialog"
  >
    <div v-if="settings" class="flex flex-col gap-2.5 text-xs text-surface">
      <div class="flex items-center justify-between gap-3">
        <span>{{ panels.prototypeVideoStart }}</span>
        <AppSelect
          :model-value="settings.startFrameId"
          :options="frameOptions"
          :label="panels.prototypeVideoStart"
          size="sm"
          :ui="{ trigger: 'w-44' }"
          data-test-id="prototype-video-start"
          @update:model-value="update({ startFrameId: String($event) })"
        />
      </div>
      <div class="flex items-center justify-between gap-3">
        <span>{{ panels.prototypeVideoFormat }}</span>
        <SegmentedControl
          :model-value="settings.format"
          :options="formatOptions"
          :label="panels.prototypeVideoFormat"
          data-test-id="prototype-video-format"
          @update:model-value="chooseFormat"
        />
      </div>
      <div class="flex items-center justify-between gap-3">
        <span>{{ panels.prototypeVideoSize }}</span>
        <AppSelect
          :model-value="settings.size"
          :options="sizeOptions"
          :label="panels.prototypeVideoSize"
          size="sm"
          :ui="{ trigger: 'w-44' }"
          data-test-id="prototype-video-size"
          @update:model-value="chooseSize(String($event))"
        />
      </div>
      <div class="flex items-center justify-between gap-3">
        <span>{{ panels.prototypeVideoFrameRate }}</span>
        <SegmentedControl
          :model-value="String(settings.fps)"
          :options="frameRateOptions"
          :label="panels.prototypeVideoFrameRate"
          data-test-id="prototype-video-fps"
          @update:model-value="update({ fps: Number($event) })"
        />
      </div>
      <div class="flex items-center justify-between gap-3">
        <span>{{ panels.prototypeVideoMaxLength }}</span>
        <NumberField
          :model-value="settings.maxSeconds"
          :min="1"
          :max="MAX_SECONDS"
          :step="1"
          :label="panels.prototypeVideoMaxLength"
          suffix="s"
          class="w-20"
          data-test-id="prototype-video-max-length"
          @commit="(seconds: number) => update({ maxSeconds: seconds })"
        />
      </div>

      <div
        v-if="summary"
        class="flex flex-col gap-1 text-muted"
        data-test-id="prototype-video-summary"
      >
        <p>{{ summary }}</p>
        <p v-if="plan?.kind === 'ready' && plan.loops">{{ panels.prototypeVideoLoops }}</p>
        <p v-if="plan?.kind === 'ready' && plan.truncated">{{ panels.prototypeVideoTruncated }}</p>
        <p v-if="formatsHere">{{ formatsHere }}</p>
      </div>
      <AppAlert
        v-else-if="plan?.kind === 'nothing-to-follow'"
        tone="warning"
        :heading="panels.prototypeVideoNothingToRecord"
        :description="panels.prototypeVideoNothingToFollow({ frame: plan.frame })"
      />
      <AppAlert
        v-else-if="plan?.kind === 'invalid'"
        tone="warning"
        :heading="panels.prototypeVideoNothingToRecord"
        :description="plan.message"
      />

      <AppAlert
        v-if="failure"
        tone="error"
        :heading="panels.prototypeVideoFailed"
        :description="failure"
        data-test-id="prototype-video-failure"
      />

      <AppProgress
        v-if="progress"
        :amount="progress.total > 0 ? { value: progress.done, max: progress.total } : {}"
        :label="
          progress.total > 0
            ? panels.prototypeVideoRecording({
                done: String(progress.done),
                total: String(progress.total)
              })
            : undefined
        "
        :aria-label="panels.prototypeVideoHeading"
        data-test-id="prototype-video-progress"
      />
    </div>

    <template #footer>
      <AppButton variant="ghost" data-test-id="prototype-video-cancel" @click="cancel">
        {{ common.cancel }}
      </AppButton>
      <AppButton
        color="primary"
        variant="solid"
        :disabled="!canRecord"
        data-test-id="prototype-video-export"
        @click="record"
      >
        {{ panels.prototypeVideoExport }}
      </AppButton>
    </template>
  </AppDialog>
</template>
