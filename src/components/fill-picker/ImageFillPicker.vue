<script setup lang="ts">
import { useFileDialog } from '@vueuse/core'
import { computed, shallowRef, useTemplateRef } from 'vue'

import type { StockPhotoResult } from '@pairdraw/core/tools'
import type { Fill } from '@pairdraw/scene-graph'
import { coverImageTransform } from '@pairdraw/scene-graph/images'
import { useI18n } from '@pairdraw/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import {
  IMAGE_FILL_MODES,
  imageFillMode,
  withImageFillMode,
  type ImageFillMode
} from '@/app/editor/images/scale-mode'
import { downloadImageURL, type ImageURLFailure } from '@/app/editor/images/url'
import { downloadPhoto } from '@/app/editor/photos/download'
import type { PhotoService } from '@/app/editor/photos/search'
import { toast } from '@/app/shell/ui'
import NumberField from '@/components/inputs/NumberField.vue'
import PhotoPicker from '@/components/photo-picker/PhotoPicker.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import { useImageDrop } from '@/components/ui/drop/useImageDrop'
import AppSelect from '@/components/ui/select/AppSelect.vue'

import ImageAdjustments from './ImageAdjustments.vue'
import ImageFillPickerAIActions from './ImageFillPickerAIActions.vue'
import ImageFillPickerURLField from './ImageFillPickerURLField.vue'
import { useImageFill } from './useImageFill'

const {
  fill,
  layerSize = null,
  fillIndex = null
} = defineProps<{
  fill: Fill
  /** The layer the fill is on, which a new crop starts by covering, as Fill does. */
  layerSize?: { width: number; height: number } | null
  /** Where the fill sits in the layer's fills, when it is one; image AI writes into it there. */
  fillIndex?: number | null
}>()
const emit = defineEmits<{
  /** A discrete fill change, such as the image chosen, a step of its own. */
  update: [fill: Fill]
  /** An adjustment the sliders move continuously, coalesced into the held press. */
  adjust: [fill: Fill]
}>()

const store = useEditorStore()
const { panels, commands } = useI18n()

const MODE_LABELS = {
  FILL: 'imageModeFill',
  FIT: 'imageModeFit',
  STRETCH: 'imageModeStretch',
  CROP: 'imageModeCrop',
  TILE: 'imageModeTile'
} as const satisfies Record<ImageFillMode, keyof typeof panels.value>

const modeOptions = computed(() =>
  IMAGE_FILL_MODES.map((value) => ({ value, label: panels.value[MODE_LABELS[value]] }))
)

const { url: imagePreviewURL, size: imageSize } = useImageFill(() => fill.imageHash, {
  measure: true
})

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const { open: pickImage, onChange: onFileChange } = useFileDialog({
  accept: IMAGE_TYPES.join(','),
  multiple: false
})

function fillWith(bytes: Uint8Array) {
  const hash = store.storeImage(bytes)
  emit('update', {
    ...fill,
    type: 'IMAGE',
    imageHash: hash,
    imageScaleMode: fill.imageScaleMode ?? 'FILL'
  })
}

async function fillWithFile(file: File) {
  fillWith(new Uint8Array(await file.arrayBuffer()))
}

onFileChange((files) => {
  const file = files?.[0]
  if (file) void fillWithFile(file)
})

// An image dropped on the well fills as one chosen with the button does; with several, the first.
const well = useTemplateRef<HTMLElement>('well')
const { dragging } = useImageDrop(well, {
  accepts: (file) => IMAGE_TYPES.includes(file.type),
  onImages: ([file]) => {
    if (file) void fillWithFile(file)
  }
})

/** An image address being loaded, and why the last one gave no image. */
const urlPending = shallowRef(false)
const urlFailure = shallowRef<{ reason: ImageURLFailure; status?: number } | null>(null)

const URL_FAILURES = {
  'invalid-url': 'imageURLInvalid',
  'too-large': 'imageURLTooLarge',
  unsupported: 'imageURLUnsupported',
  unreachable: 'imageURLUnreachable'
} as const satisfies Record<Exclude<ImageURLFailure, 'status'>, keyof typeof panels.value>

const urlError = computed(() => {
  const failure = urlFailure.value
  if (!failure) return null
  if (failure.reason === 'status')
    return panels.value.imageURLStatus({ status: failure.status ?? 0 })
  return panels.value[URL_FAILURES[failure.reason]]
})

async function fillWithURL(url: string) {
  urlPending.value = true
  urlFailure.value = null
  try {
    const result = await downloadImageURL(url)
    if (result.ok) fillWith(result.bytes)
    else urlFailure.value = { reason: result.reason, status: result.status }
  } finally {
    urlPending.value = false
  }
}

async function fillWithPhoto(photo: StockPhotoResult, service: PhotoService) {
  try {
    fillWith((await downloadPhoto(service, photo)).bytes)
  } catch {
    toast.error(panels.value.insertPhotoFailed)
  }
}

/**
 * Figma keeps a crop through other modes, which ignore it, but a new crop starts over from the
 * Fill framing; without the layer's or image's size the renderer frames it as Fill does.
 */
function cropStart(): Fill['imageTransform'] {
  const image = imageSize.value
  if (!layerSize || !image) return undefined
  return coverImageTransform(layerSize.width, layerSize.height, image.width, image.height)
}

/**
 * A crop that frames the whole image stores what Stretch stores, as when the layer and image share
 * proportions, so the picker shows whichever of the two was chosen here.
 */
const pickedMode = shallowRef<ImageFillMode | null>(null)
const scaleMode = computed({
  get: () => imageFillMode(fill, pickedMode.value),
  set: (mode: ImageFillMode) => {
    const current = scaleMode.value
    pickedMode.value = mode
    if (mode !== current) emit('update', withImageFillMode(fill, mode, cropStart))
  }
})

/** A tile's size as a percentage of the image's own. */
const tileScale = computed(() => Math.round((fill.scale && fill.scale > 0 ? fill.scale : 1) * 100))
function setTileScale(percent: number) {
  if (percent > 0) emit('update', { ...fill, scale: percent / 100 })
}

function rotate() {
  emit('update', { ...fill, imageRotation: ((fill.imageRotation ?? 0) + 90) % 360 })
}

/**
 * The one layer the fill is on, while the canvas can crop and reframe this fill's image. A stroke's
 * image has no fill index, and a hidden fill no image to frame.
 */
const croppableLayerId = computed(() => {
  const ids = store.state.selectedIds
  if (!layerSize || fillIndex === null || !fill.imageHash || ids.size !== 1) return null
  const id = [...ids][0]
  return store.canEditImage(id, fillIndex) ? id : null
})

function cropOnCanvas() {
  const id = croppableLayerId.value
  if (id && fillIndex !== null) store.startImageEdit(id, fillIndex)
}
</script>

<template>
  <div class="space-y-2">
    <!--
      As Figma's image fill: the image, with its actions in the middle. With no image they show at
      once; over an image they show on hover or when the keyboard reaches them.
    -->
    <div
      ref="well"
      class="group relative flex h-28 items-center justify-center overflow-hidden rounded border border-border bg-panel-secondary data-[dragging]:border-accent"
      :data-empty="imagePreviewURL ? undefined : ''"
      :data-dragging="dragging ? '' : undefined"
      data-test-id="fill-picker-image-well"
    >
      <img
        v-if="imagePreviewURL"
        :src="imagePreviewURL"
        alt=""
        class="max-h-full max-w-full object-contain"
      />
      <div
        class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-data-[empty]:bg-transparent group-data-[empty]:opacity-100 has-[:focus-visible]:opacity-100 motion-reduce:transition-none"
      >
        <AppButton
          size="sm"
          variant="outline"
          class="w-32 bg-panel"
          data-test-id="fill-picker-choose-image"
          @click="pickImage()"
        >
          <template #leading><icon-lucide-upload class="size-3" /></template>
          {{ fill.imageHash ? panels.imageReplace : panels.imageChoose }}
        </AppButton>
        <PhotoPicker :heading="panels.stockPhoto" @select="fillWithPhoto">
          <template #trigger>
            <AppButton
              size="sm"
              variant="outline"
              class="w-32 bg-panel"
              data-test-id="fill-picker-stock-photo"
            >
              <template #leading><icon-lucide-image-plus class="size-3" /></template>
              {{ panels.stockPhoto }}
            </AppButton>
          </template>
        </PhotoPicker>
      </div>
    </div>
    <ImageFillPickerURLField
      :pending="urlPending"
      :error="urlError"
      @submit="fillWithURL"
      @edit="urlFailure = null"
    />
    <div class="flex items-center gap-1.5">
      <AppSelect
        :ui="{ trigger: 'min-w-0 flex-1' }"
        :label="panels.imageScaleMode"
        :model-value="scaleMode"
        :options="modeOptions"
        data-test-id="fill-picker-image-mode"
        @update:model-value="(m) => (scaleMode = m as ImageFillMode)"
      />
      <div v-if="scaleMode === 'TILE'" class="w-17 flex-none">
        <NumberField
          :model-value="tileScale"
          :min="1"
          suffix="%"
          :aria-label="panels.imageTileScale"
          data-test-id="fill-picker-tile-scale"
          @update:model-value="setTileScale"
          @commit="setTileScale"
        />
      </div>
      <!-- Crops and reframes the image on the canvas, with handles, as Figma's Crop image. -->
      <IconButton
        v-if="croppableLayerId"
        :label="commands.cropImage"
        data-test-id="fill-picker-crop-image"
        @click="cropOnCanvas"
      >
        <icon-lucide-crop class="size-3.5" />
      </IconButton>
      <ImageFillPickerAIActions v-if="fillIndex !== null" :fill="fill" :fill-index="fillIndex" />
      <!-- A crop, and so a stretch, holds its own turn in its transform; the other modes turn it. -->
      <IconButton
        v-if="scaleMode !== 'CROP' && scaleMode !== 'STRETCH'"
        :label="panels.rotate90"
        data-test-id="fill-picker-rotate-image"
        @click="rotate"
      >
        <icon-lucide-rotate-cw class="size-3.5" />
      </IconButton>
    </div>
    <ImageAdjustments :fill @update="emit('adjust', $event)" />
  </div>
</template>
