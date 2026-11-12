<script setup lang="ts">
import { isEqual } from "es-toolkit";
import {
  computed,
  onMounted,
  ref,
  shallowRef,
  watch,
  type ComponentPublicInstance,
} from "vue";

import type { Variable } from "@open-pencil/scene-graph";
import type {
  ShaderPreset,
  ShaderUniform,
  ShaderUniformValue,
} from "@open-pencil/scene-graph/shaders";
import { canDrawShaders } from "@open-pencil/vue/canvas/surface";
import {
  addShaderEffect,
  DEFAULT_SHADER_EFFECT,
  DEFAULT_SHADER_PRESET,
  DEFAULT_SHADER_SOURCE,
  loadShaderCatalog,
  moveShaderEffect,
  parseShaderPreset,
  removeShaderEffect,
  setShaderEffectProp,
  shaderEffectLabel,
  shaderPresetJSON,
  type ShaderEffect,
} from "@open-pencil/vue/controls/shader";
import { useI18n, useShaderMessages } from "@open-pencil/vue/i18n";
import { useFlatReorderDrag } from "@open-pencil/vue/shared/drag";

import ShaderEffectControls from "@/components/fill-picker/shader/ShaderEffectControls.vue";
import ShaderEffectThumb from "@/components/fill-picker/shader/ShaderEffectThumb.vue";
import ShaderFillPickerGallery from "@/components/fill-picker/shader/ShaderFillPickerGallery.vue";
import ShaderUniformControls from "@/components/fill-picker/shader/ShaderUniformControls.vue";
import AppButton from "@/components/ui/button/AppButton.vue";
import IconButton from "@/components/ui/button/IconButton.vue";
import AppAlert from "@/components/ui/feedback/AppAlert.vue";
import AppTextarea from "@/components/ui/input/AppTextarea.vue";
import Tip from "@/components/ui/overlay/Tip.vue";
import PanelItemRow from "@/components/ui/panel/PanelItemRow.vue";
import AppCombobox from "@/components/ui/select/AppCombobox.vue";

/**
 * Edits a shader paint's preset as the properties panel edits effects: a list of the shader's
 * effects, top first, each with its type and settings, reordered by dragging; a gallery of
 * complete shaders to start from, which a paint that just became a shader opens on; and the
 * preset as JSON, which also takes a preset copied from shaders.com. Where it can, it opens the
 * shader in Shader Mode, large on its own.
 */
const {
  preset,
  source = null,
  codeError = null,
  canOpenMode = false,
  uniforms = [],
  uniformValues = {},
  uniformBindings = {},
  variables = [],
} = defineProps<{
  preset: ShaderPreset;
  /** Code the user wrote, when the paint draws that instead of the preset. */
  source?: string | null;
  /** What stops `source` from compiling, as the canvas reports it. */
  codeError?: string | null;
  /** Whether it offers to open the shader in Shader Mode, which emits `openMode`. */
  canOpenMode?: boolean;
  /** The inputs `source` declares, which the picker edits below the code. */
  uniforms?: readonly ShaderUniform[];
  /** The value the document stores for each input, by the input's name. */
  uniformValues?: Readonly<Record<string, ShaderUniformValue>>;
  /** The variables the inputs follow, by the input's name. */
  uniformBindings?: Readonly<Record<string, string>>;
  /** Every variable an input may follow. */
  variables?: readonly Variable[];
}>();
const emit = defineEmits<{
  update: [preset: ShaderPreset];
  updateSource: [source: string];
  setUniform: [name: string, value: ShaderUniformValue];
  bindUniform: [name: string, variableId: string | null];
  openMode: [];
}>();

/** The code being written, seeded from the paint's own code or the smallest shader that draws. */
const code = ref(source ?? DEFAULT_SHADER_SOURCE);
watch(
  () => source,
  (value) => {
    if (value != null) code.value = value;
  },
);
/** Whether the picker shows the code instead of the preset; a paint that draws code always does. */
const writing = ref(false);
const codeView = computed(() => source != null || writing.value);
const appliedCode = computed(() => source != null && code.value === source);
const { panels, common } = useI18n();
const shaderMessages = useShaderMessages();

const catalog = shallowRef<ShaderEffect[]>([]);
onMounted(async () => {
  catalog.value = await loadShaderCatalog();
});
const effectsByName = computed(
  () => new Map(catalog.value.map((effect) => [effect.name, effect])),
);

const effectOptions = computed(() =>
  catalog.value.map((effect) => ({
    value: effect.name,
    label: shaderEffectLabel(effect.name),
    group: effect.category,
    description: effect.description,
  })),
);

/** The effects top first, as the panel lists layers: the last one drawn is on top. */
const rows = computed(() =>
  preset.components
    .map((component, index) => ({
      id: String(index),
      index,
      component,
      effect: catalog.value.find((effect) => effect.name === component.type),
    }))
    .reverse(),
);

const expanded = ref<number | null>(null);

/** What the picker shows below its header: the effects, the gallery, or the preset's JSON. */
const view = ref<"effects" | "gallery" | "json">(
  isEqual(preset, DEFAULT_SHADER_PRESET) ? "gallery" : "effects",
);

function add() {
  emit("update", addShaderEffect(preset, DEFAULT_SHADER_EFFECT));
  expanded.value = preset.components.length;
  view.value = "effects";
}

function toggleGallery() {
  view.value = view.value === "gallery" ? "effects" : "gallery";
}

function applyGallery(next: ShaderPreset) {
  emit("update", next);
  expanded.value = null;
}

function remove(index: number) {
  emit("update", removeShaderEffect(preset, index));
  expanded.value = null;
}

/** Changing an effect's type starts it from the new effect's own defaults. */
function setType(index: number, type: string) {
  if (preset.components[index]?.type === type) return;
  emit("update", {
    ...preset,
    components: preset.components.map((component, at) =>
      at === index ? { type } : component,
    ),
  });
}

const reorder = useFlatReorderDrag({
  items: () => rows.value,
  // Rows run top first, so a row's place counts from the end of the preset's list.
  onMove: (id, target) => {
    const from = Number(id);
    emit(
      "update",
      moveShaderEffect(preset, from, preset.components.length - 1 - target),
    );
    expanded.value = null;
  },
});

function setupRow(
  element: Element | ComponentPublicInstance | null,
  id: string,
) {
  reorder.setupItem(element instanceof HTMLElement ? element : null, () => ({
    id,
  }));
}

function dropPosition(id: string) {
  if (reorder.instructionTargetId.value !== id) return undefined;
  return reorder.instruction.value?.operation === "reorder-before"
    ? "before"
    : "after";
}

const json = ref("");
const invalid = ref(false);
function toggleJSON() {
  view.value = view.value === "json" ? "effects" : "json";
  json.value = shaderPresetJSON(preset);
  invalid.value = false;
}
function applyJSON() {
  const parsed = parseShaderPreset(json.value);
  invalid.value = parsed === null;
  if (!parsed) return;
  emit("update", parsed);
  expanded.value = null;
  view.value = "effects";
}
</script>

<template>
  <div class="flex flex-col gap-2" data-test-id="shader-fill-picker">
    <AppAlert
      v-if="!canDrawShaders()"
      tone="warning"
      :heading="panels.shaderNeedsWebGPU"
      data-test-id="shader-no-webgpu"
    />

    <div>
      <div class="mb-1 flex items-center justify-between">
        <span class="text-[11px] text-muted">
          {{
            codeView
              ? panels.shaderCode
              : view === "gallery"
                ? panels.shaderGallery
                : panels.effects
          }}
        </span>
        <div class="flex items-center">
          <IconButton
            v-if="canOpenMode && !codeView"
            :label="shaderMessages.open"
            data-test-id="shader-open-mode"
            @click="emit('openMode')"
          >
            <icon-lucide-maximize-2 class="size-3" />
          </IconButton>
          <template v-if="!codeView">
            <IconButton
              :label="panels.shaderGallery"
              :active="view === 'gallery'"
              toggle
              data-test-id="shader-gallery-toggle"
              @click="toggleGallery"
            >
              <icon-lucide-layout-grid class="size-3" />
            </IconButton>
            <IconButton
              :label="panels.shaderPreset"
              :active="view === 'json'"
              toggle
              data-test-id="shader-preset-toggle"
              @click="toggleJSON"
            >
              <icon-lucide-braces class="size-3" />
            </IconButton>
            <IconButton
              :label="panels.addShaderEffect"
              data-test-id="shader-add-effect"
              @click="add"
            >
              <icon-lucide-plus class="size-3" />
            </IconButton>
          </template>
          <IconButton
            :label="panels.shaderCode"
            :active="codeView"
            toggle
            data-test-id="shader-code-toggle"
            @click="writing = !writing"
          >
            <icon-lucide-code class="size-3" />
          </IconButton>
        </div>
      </div>

      <div v-if="codeView" class="flex flex-col gap-1.5">
        <AppTextarea
          v-model="code"
          :rows="12"
          class="font-mono text-[11px]"
          data-test-id="shader-code"
        />
        <AppAlert
          v-if="codeError"
          tone="error"
          :heading="panels.invalidShaderCode"
          :description="codeError"
          data-test-id="shader-code-error"
        />
        <ShaderUniformControls
          v-if="source != null"
          :uniforms="uniforms"
          :values="uniformValues"
          :bindings="uniformBindings"
          :variables="variables"
          @set-value="(name, value) => emit('setUniform', name, value)"
          @bind="(name, variableId) => emit('bindUniform', name, variableId)"
        />
        <div class="flex justify-end gap-1.5">
          <AppButton
            v-if="source == null"
            variant="ghost"
            size="sm"
            data-test-id="shader-code-cancel"
            @click="writing = false"
          >
            {{ common.cancel }}
          </AppButton>
          <AppButton
            size="sm"
            :disabled="appliedCode"
            data-test-id="shader-code-apply"
            @click="emit('updateSource', code)"
          >
            {{ common.apply }}
          </AppButton>
        </div>
      </div>

      <ShaderFillPickerGallery
        v-else-if="view === 'gallery'"
        :preset="preset"
        @apply="applyGallery"
      />

      <div v-else-if="view === 'json'" class="flex flex-col gap-1.5">
        <AppTextarea v-model="json" :rows="8" class="font-mono text-[11px]" />
        <AppAlert
          v-if="invalid"
          tone="error"
          :heading="panels.invalidShaderPreset"
        />
        <div class="flex justify-end gap-1.5">
          <AppButton variant="ghost" size="sm" @click="view = 'effects'">
            {{ common.cancel }}
          </AppButton>
          <AppButton
            size="sm"
            data-test-id="shader-preset-apply"
            @click="applyJSON"
          >
            {{ panels.applyShaderPreset }}
          </AppButton>
        </div>
      </div>

      <div v-else class="flex flex-col" data-test-id="shader-effects">
        <div
          v-for="row in rows"
          :key="row.id"
          :ref="(element) => setupRow(element, row.id)"
          class="relative data-[dragging]:opacity-50"
          :data-dragging="reorder.draggingId.value === row.id || undefined"
          :data-shader-effect="row.component.type"
        >
          <div
            v-if="dropPosition(row.id)"
            class="pointer-events-none absolute inset-x-1 z-10 h-0.5 rounded-full bg-accent"
            :class="dropPosition(row.id) === 'before' ? 'top-0' : 'bottom-0'"
          />
          <PanelItemRow>
            <div class="flex min-w-0 flex-1 items-center gap-1.5">
              <Tip
                :label="
                  expanded === row.index
                    ? panels.collapseEffectSettings
                    : panels.expandEffectSettings
                "
              >
                <button
                  type="button"
                  :aria-expanded="expanded === row.index"
                  :aria-label="
                    expanded === row.index
                      ? panels.collapseEffectSettings
                      : panels.expandEffectSettings
                  "
                  class="flex size-5 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-border bg-input p-0"
                  @click="expanded = expanded === row.index ? null : row.index"
                >
                  <icon-lucide-sparkles class="size-3 text-muted" />
                </button>
              </Tip>
              <div class="min-w-0 flex-1">
                <AppCombobox
                  :model-value="row.component.type"
                  :options="effectOptions"
                  :label="panels.shader"
                  :search-placeholder="panels.searchShaderEffects"
                  :empty-label="panels.noShaderEffects"
                  :result-limit="catalog.length"
                  :ui="{ content: 'w-64' }"
                  @update:model-value="setType(row.index, $event)"
                >
                  <template #option="{ option }">
                    <ShaderEffectThumb
                      :effect="effectsByName.get(option.value)"
                    />
                    <span class="min-w-0 flex-1 truncate text-surface">{{
                      option.label
                    }}</span>
                  </template>
                </AppCombobox>
              </div>
            </div>
            <template #rail="{ removeClass }">
              <Tip :label="panels.removeShaderEffect">
                <IconButton
                  :label="panels.removeShaderEffect"
                  :disabled="preset.components.length === 1"
                  :class="removeClass"
                  @click="remove(row.index)"
                >
                  <icon-lucide-minus class="size-3.5" />
                </IconButton>
              </Tip>
            </template>
          </PanelItemRow>
          <ShaderEffectControls
            v-if="expanded === row.index && row.effect"
            class="py-2"
            :effect="row.effect"
            :component="row.component"
            @set="
              (key, value) =>
                emit(
                  'update',
                  setShaderEffectProp(preset, row.index, key, value),
                )
            "
          />
        </div>
      </div>
    </div>
  </div>
</template>
