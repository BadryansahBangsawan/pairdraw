<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import type { Fill, Variable } from '@pairdraw/scene-graph'
import {
  isShaderPresetPaint,
  parseShaderUniforms,
  type ShaderPaint,
  type ShaderPreset,
  type ShaderUniformValue
} from '@pairdraw/scene-graph/shaders'
import { applySolidFillColor, type OkHCLControls } from '@pairdraw/vue/controls/color-model'
import { DEFAULT_SHADER_PRESET } from '@pairdraw/vue/controls/shader'
import { useI18n } from '@pairdraw/vue/i18n'
import { useRetainedPopup } from '@pairdraw/vue/lifecycle/retention'
import {
  pickerOutsideHandlers,
  usePickerGesture,
  type PickerKeepOpen
} from '@pairdraw/vue/primitives/ColorPicker'
import { FillRoot } from '@pairdraw/vue/primitives/Fill'

import { useEditorStore } from '@/app/editor/active-store'
import ColorPickerPanel from '@/components/color-picker-panel/ColorPickerPanel.vue'
import { useEyedropperKeepOpen } from '@/components/color-picker-panel/eyedropper'
import GradientEditor from '@/components/fill-picker/GradientEditor.vue'
import ImageFillPicker from '@/components/fill-picker/ImageFillPicker.vue'
import MeshEditor from '@/components/fill-picker/MeshEditor.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import Tip from '@/components/ui/overlay/Tip.vue'
import FillSwatch from '@/components/ui/paint/FillSwatch.vue'
import fillPickerTheme from '@/theme/fill-picker'

import { useImageFill } from './useImageFill'

const fillPicker = tv(fillPickerTheme)
// The picker's panel previews the document's colors, which are stored in its profile.
const store = useEditorStore()

function tabClass(active: boolean) {
  return fillPicker({ active }).tab()
}

const {
  fill,
  okhcl = null,
  swatchBackground,
  keepOpen,
  shader = null,
  shaderCodeError = null,
  shaderVariables = [],
  layerSize = null,
  fillIndex = null
} = defineProps<{
  fill: Fill
  /** The shader the paint draws, when it is a shader's frame; the picker then edits the shader. */
  shader?: ShaderPaint | null
  /** What stops the shader's own code from compiling, when it draws code. */
  shaderCodeError?: string | null
  /** Every variable a shader input may follow. */
  shaderVariables?: readonly Variable[]
  okhcl?: OkHCLControls | null
  swatchBackground?: string
  /** Names the trigger for a paint that is not a fill, such as a stroke. */
  label?: string
  /** Whether a press outside the picker should leave it open, such as on a gradient handle. */
  keepOpen?: PickerKeepOpen
  /** The one layer the paint is on, which an image crop starts by covering. */
  layerSize?: { width: number; height: number } | null
  /** Where the paint sits in the layer's fills, when it is a fill rather than a stroke. */
  fillIndex?: number | null
}>()
/** An image fill's swatch shows its image, covering the swatch as Fill would. */
const image = useImageFill(() => (fill.type === 'IMAGE' ? fill.imageHash : undefined))
const imageBackground = computed(() =>
  image.url.value ? `center / cover no-repeat url("${image.url.value}")` : undefined
)
const activeStop = defineModel<number>('activeStop')
const emit = defineEmits<{
  update: [fill: Fill]
  updateShader: [preset: ShaderPreset]
  /** Code the user wrote, which replaces the preset the shader drew. */
  updateShaderSource: [source: string]
  /** A value the user typed for an input the shader's code declares. */
  setShaderUniform: [name: string, value: ShaderUniformValue]
  /** The variable an input follows, or null to stop following one. */
  bindShaderUniform: [name: string, variableId: string | null]
  /** Opens the paint's shader in Shader Mode, by the shader's image. */
  openShaderMode: [image: string]
  openChange: [open: boolean]
  /** Ends the edit made so far as one undo step: a press's release, or a change with none held. */
  commit: []
  /** `press`: Escape during a press that changed the paint put that press's change back. */
  cancel: [cause: 'press' | 'escape']
}>()

/** The inputs a shader's own code declares; a preset declares none. */
const shaderUniforms = computed(() =>
  shader && !isShaderPresetPaint(shader) ? parseShaderUniforms(shader.source).uniforms : []
)
let pressFill: Fill = fill
const gesture = usePickerGesture({
  open: () => popupOpen.value,
  // The paint the press found when it first changed it, so an earlier change is not put back.
  beforeChange: () => {
    pressFill = fill
  },
  commit: () => emit('commit'),
  cancel: () => {
    emit('update', pressFill)
    emit('cancel', 'press')
  }
})
const { open: popupOpen, portalActive } = useRetainedPopup(undefined, () => onOpenChange(false))
const cls = usePopoverUI({
  content: 'max-h-(--reka-popover-content-available-height) w-60 overflow-y-auto p-2'
})
const { panels } = useI18n()

/** Dragging a gradient handle or sampling a color on the canvas leaves the picker open. */
const keepPickerOpen = useEyedropperKeepOpen(() => keepOpen)
const outside = pickerOutsideHandlers(() => keepPickerOpen)

/** A press still held when the picker closes is put back, whichever way it closes. */
function onOpenChange(open: boolean) {
  if (!open) gesture.abort()
  emit('openChange', open)
}

/** Every change a press makes until it ends is one step; with no press it is a step of its own. */
function change(next: Fill) {
  gesture.change(() => emit('update', next))
}

/** A change of its own, such as an image read from a file, waits for a held press to end. */
function step(next: Fill) {
  gesture.step(() => emit('update', next))
}
</script>

<template>
  <FillRoot :fill="fill" @update="change" v-slot="root">
    <PopoverRoot v-model:open="popupOpen" @update:open="onOpenChange">
      <PopoverTrigger as-child>
        <button
          type="button"
          :aria-label="label ?? panels.fill"
          data-test-id="fill-picker-swatch"
          :data-shader-image="shader?.image"
          class="size-4 shrink-0 cursor-pointer rounded-sm border-0 bg-transparent p-0"
        >
          <FillSwatch :fill="fill" class="size-full" v-slot="swatch">
            <span
              class="pointer-events-none absolute inset-0"
              :style="{
                background: swatchBackground ?? imageBackground ?? swatch.background
              }"
            />
          </FillSwatch>
        </button>
      </PopoverTrigger>

      <PopoverPortal v-if="portalActive">
        <PopoverContent
          :class="cls.content"
          :side-offset="4"
          side="left"
          data-picker-content
          @pointer-down-outside="outside.onPointerDownOutside"
          @focus-outside="outside.onFocusOutside"
        >
          <div class="mb-2 flex items-center gap-0.5">
            <Tip :label="panels.solid">
              <button
                :data-active="root.category === 'SOLID' || undefined"
                :class="tabClass(root.category === 'SOLID')"
                :aria-label="panels.solid"
                data-test-id="fill-picker-tab-solid"
                @click="root.actions.toSolid"
              >
                <icon-lucide-square class="size-3.5" />
              </button>
            </Tip>
            <Tip :label="panels.linearGradient">
              <button
                :data-active="root.category === 'GRADIENT' || undefined"
                :class="tabClass(root.category === 'GRADIENT')"
                :aria-label="panels.linearGradient"
                data-test-id="fill-picker-tab-gradient"
                @click="root.actions.toGradient"
              >
                <icon-lucide-blend class="size-3.5" />
              </button>
            </Tip>
            <Tip :label="panels.mesh">
              <button
                :data-active="root.category === 'MESH' || undefined"
                :class="tabClass(root.category === 'MESH')"
                :aria-label="panels.mesh"
                data-test-id="fill-picker-tab-mesh"
                @click="root.actions.toMesh"
              >
                <icon-lucide-grid-2-x-2 class="size-3.5" />
              </button>
            </Tip>
            <Tip :label="panels.image">
              <button
                :data-active="(root.category === 'IMAGE' && !shader) || undefined"
                :class="tabClass(root.category === 'IMAGE' && !shader)"
                :aria-label="panels.image"
                data-test-id="fill-picker-tab-image"
                @click="root.actions.toImage"
              >
                <icon-lucide-image class="size-3.5" />
              </button>
            </Tip>
            <Tip :label="panels.shader">
              <button
                :data-active="shader !== null || undefined"
                :class="tabClass(shader !== null)"
                :aria-label="panels.shader"
                data-test-id="fill-picker-tab-shader"
                @click="shader || emit('updateShader', DEFAULT_SHADER_PRESET)"
              >
                <icon-lucide-sparkles class="size-3.5" />
              </button>
            </Tip>
          </div>

          <ColorPickerPanel
            v-if="root.category === 'SOLID'"
            :color="root.fill.color"
            :color-profile="store.graph.documentColorSpace"
            :okhcl="okhcl"
            eyedropper
            @update="change(applySolidFillColor(root.fill, $event))"
          />

          <GradientEditor
            v-if="root.category === 'GRADIENT'"
            v-model:active-stop="activeStop"
            :fill="root.fill"
            @update="change"
          />

          <MeshEditor v-if="root.category === 'MESH'" :fill="root.fill" @update="change" />

          <ShaderFillPicker
            v-if="shader"
            :preset="isShaderPresetPaint(shader) ? shader.preset : DEFAULT_SHADER_PRESET"
            :source="isShaderPresetPaint(shader) ? null : shader.source"
            :code-error="shaderCodeError"
            :uniforms="shaderUniforms"
            :uniform-values="isShaderPresetPaint(shader) ? {} : (shader.uniforms ?? {})"
            :uniform-bindings="isShaderPresetPaint(shader) ? {} : (shader.uniformBindings ?? {})"
            :variables="shaderVariables"
            can-open-mode
            @update="emit('updateShader', $event)"
            @update-source="emit('updateShaderSource', $event)"
            @set-uniform="
              (name: string, value: ShaderUniformValue) => emit('setShaderUniform', name, value)
            "
            @bind-uniform="(name: string, id: string | null) => emit('bindShaderUniform', name, id)"
            @open-mode="emit('openShaderMode', shader.image)"
          />

          <ImageFillPicker
            v-else-if="root.category === 'IMAGE'"
            :fill="root.fill"
            :layer-size="layerSize"
            :fill-index="fillIndex"
            @update="step"
            @adjust="change"
          />
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </FillRoot>
</template>
