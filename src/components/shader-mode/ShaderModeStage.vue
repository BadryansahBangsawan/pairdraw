<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, onMounted, onUnmounted, useTemplateRef, watch } from 'vue'

import type { ShaderStageBackend } from '@open-pencil/vue/canvas/surface'
import { useI18n, useShaderMessages } from '@open-pencil/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { restoreShaderModeFocus } from '@/app/editor/shader-mode/focus'
import { useShaderModeStage } from '@/app/editor/shader-mode/stage'
import { useDocumentShortcuts } from '@/app/shell/keyboard/document'
import ShaderFillPicker from '@/components/fill-picker/shader/ShaderFillPicker.vue'
import { useImageFill } from '@/components/fill-picker/useImageFill'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import theme from '@/theme/shader-mode/stage'

import ShaderModeTransport from './ShaderModeTransport.vue'

/** The key that leaves Shader Mode, as keyboards label it. */
const LEAVE_SHORTCUT = 'Esc'

/**
 * Shader Mode: the focused shader large in its own card, with its transport below and its
 * settings beside it. It takes the place of the panels and the canvas until Done or Escape.
 */
const { backend } = defineProps<{
  /** What plays the shader; the browser's WebGPU unless a story hands its own. */
  backend?: ShaderStageBackend<HTMLCanvasElement>
}>()
const store = useEditorStore()
const root = useTemplateRef<HTMLElement>('root')
const stage = useShaderModeStage(
  store,
  {
    root,
    area: useTemplateRef<HTMLElement>('area'),
    target: useTemplateRef<HTMLCanvasElement>('target')
  },
  backend
)
const { mode, editable, frame, clock, status } = stage
const messages = useShaderMessages()
const { panels } = useI18n()
const styles = tv(theme)()

/** Undo and redo reach the document from inside the stage, as they do on the canvas. */
const onDocumentKeys = useDocumentShortcuts()

/** The paint's saved frame, shown where the shader cannot play. */
const still = useImageFill(() => mode.value?.image)
const playable = computed(() => status.value === 'starting' || status.value === 'ready')

// Shader Mode's keys work from the moment it opens.
onMounted(() => root.value?.focus({ preventScroll: true }))

/** The shader last shown, whose swatch takes focus back when Shader Mode ends. */
let shownImage: string | null = null
watch(
  () => mode.value?.image,
  (image) => {
    if (image) shownImage = image
  },
  { immediate: true }
)
// Focus was inside the stage, which goes with Shader Mode; the editor gets it back.
onUnmounted(() => restoreShaderModeFocus(shownImage))
</script>

<template>
  <section
    ref="root"
    tabindex="-1"
    data-test-id="shader-mode"
    :aria-label="messages.region({ name: mode?.name ?? '' })"
    :class="styles.root()"
    @keydown="onDocumentKeys"
  >
    <div :class="styles.layout()">
      <div :class="styles.main()">
        <header :class="styles.header()">
          <div :class="styles.heading()">
            <h2 :class="styles.title()">{{ messages.mode }}</h2>
            <span :class="styles.name()">{{ mode?.name }}</span>
          </div>
          <div :class="styles.actions()">
            <Tip as-child :label="messages.leave({ shortcut: LEAVE_SHORTCUT })">
              <AppButton
                variant="solid"
                size="sm"
                data-test-id="shader-mode-done"
                @click="stage.leave()"
              >
                {{ messages.done }}
              </AppButton>
            </Tip>
          </div>
        </header>

        <div v-if="status === 'unsupported' || status === 'failed'" :class="styles.notice()">
          <AppAlert
            tone="warning"
            :heading="status === 'unsupported' ? panels.shaderNeedsWebGPU : messages.failed"
            data-test-id="shader-mode-unavailable"
          />
        </div>

        <div ref="area" :class="styles.area()">
          <div
            :class="styles.frame()"
            :style="{ width: `${frame?.width ?? 0}px`, height: `${frame?.height ?? 0}px` }"
            data-test-id="shader-mode-preview"
            :data-status="status"
          >
            <img
              v-if="!playable && still.url.value"
              :src="still.url.value"
              alt=""
              :class="styles.still()"
            />
            <canvas
              v-show="playable"
              ref="target"
              role="img"
              :aria-label="messages.preview"
              :class="styles.canvas()"
            />
            <p v-if="status === 'starting'" aria-live="polite" :class="styles.status()">
              {{ messages.starting }}
            </p>
          </div>
        </div>

        <div :class="styles.footer()">
          <ShaderModeTransport
            :playing="clock.playing"
            :time="clock.time"
            :duration="clock.duration"
            :disabled="!playable"
            @toggle="stage.toggle()"
            @restart="stage.restart()"
            @seek="stage.seek($event)"
            @scrub="stage.scrub($event)"
          />
        </div>
      </div>

      <aside
        :aria-label="messages.settings"
        :class="styles.settings()"
        data-test-id="shader-mode-settings"
      >
        <h3 :class="styles.settingsTitle()">{{ messages.settings }}</h3>
        <AppAlert v-if="!editable" tone="info" :heading="messages.readOnly" />
        <ShaderFillPicker
          v-else-if="mode"
          :preset="mode.preset"
          @update="stage.setPreset($event)"
        />
      </aside>
    </div>
  </section>
</template>
