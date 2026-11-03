<script setup lang="ts">
import { computed, ref } from 'vue'

import { MIN_RESCALE } from '@open-pencil/scene-graph/scaling'
import { usePanelMessages } from '@open-pencil/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { useScalePanel } from '@/app/editor/scale/panel'
import NumberField from '@/components/inputs/NumberField.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import PanelGrid from '@/components/ui/panel/PanelGrid.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'

import ScaleAnchorGrid from './ScaleAnchorGrid.vue'

/** Units a typed scale factor may end with: `2x`, or `200%`. */
const FACTOR_UNITS = ['x', '%'] as const

const panels = usePanelMessages()
const store = useEditorStore()
const { anchor, bounds, preview, commit, cancel } = useScalePanel(store)

/**
 * Whether the factor is being typed. A typed draft reads as a plain number before its `x` or `%`,
 * so `200%` would preview 2x, 20x, and 200x on the way; typing previews nothing and Enter scales.
 */
const typingFactor = ref(false)

function previewFactor(value: number, unit?: string) {
  if (!typingFactor.value) preview('factor', value, unit)
}

const width = computed(() => bounds.value?.width ?? 0)
const height = computed(() => bounds.value?.height ?? 0)
</script>

<template>
  <PanelSection v-if="bounds" :label="panels.scale" data-test-id="scale-section">
    <div class="flex items-start gap-2">
      <div class="grid min-w-0 flex-1 gap-1.5">
        <PanelGrid :columns="2">
          <Tip :label="panels.width">
            <NumberField
              icon="W"
              data-test-id="scale-width"
              :aria-label="panels.width"
              :model-value="width"
              :min="MIN_RESCALE"
              @update:model-value="preview('width', $event)"
              @commit="(value: number) => commit('width', value)"
              @cancel="cancel"
            />
          </Tip>
          <Tip :label="panels.height">
            <NumberField
              icon="H"
              data-test-id="scale-height"
              :aria-label="panels.height"
              :model-value="height"
              :min="MIN_RESCALE"
              @update:model-value="preview('height', $event)"
              @commit="(value: number) => commit('height', value)"
              @cancel="cancel"
            />
          </Tip>
        </PanelGrid>
        <Tip :label="panels.scaleFactor">
          <NumberField
            data-test-id="scale-factor"
            suffix="x"
            :aria-label="panels.scaleFactor"
            :model-value="1"
            :min="MIN_RESCALE"
            :step="0.1"
            :sensitivity="0.01"
            :units="FACTOR_UNITS"
            @update:model-value="previewFactor"
            @editing-change="typingFactor = $event"
            @commit="
              (value: number, _previous: number, unit?: string) => commit('factor', value, unit)
            "
            @cancel="cancel"
          >
            <template #icon>
              <icon-lucide-scaling class="size-3" aria-hidden="true" />
            </template>
          </NumberField>
        </Tip>
      </div>
      <ScaleAnchorGrid v-model="anchor" />
    </div>
  </PanelSection>
</template>
