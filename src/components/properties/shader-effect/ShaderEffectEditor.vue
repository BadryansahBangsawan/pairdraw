<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { ShaderEffect, Variable } from '@open-pencil/scene-graph'
import { parseShaderUniforms, type ShaderUniformValue } from '@open-pencil/scene-graph/shaders'
import { useI18n } from '@open-pencil/vue/i18n'

import ShaderUniformControls from '@/components/fill-picker/shader/ShaderUniformControls.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppTextarea from '@/components/ui/input/AppTextarea.vue'

/**
 * The code of one layer shader effect and the inputs it declares. Typing stays local until the
 * field settles, so an undo step is one edit rather than one keystroke.
 */
const { effect, variables, codeError } = defineProps<{
  effect: ShaderEffect
  variables: readonly Variable[]
  /** What the canvas reported about the applied code, or null when it compiled. */
  codeError: string | null
}>()
const emit = defineEmits<{
  patch: [changes: Partial<ShaderEffect>]
}>()

const { panels } = useI18n()
const code = ref(effect.source)

watch(
  () => effect.source,
  (source) => {
    code.value = source
  }
)

const parsed = computed(() => parseShaderUniforms(effect.source))
const uniforms = computed(() => parsed.value.uniforms)

function commitCode() {
  if (code.value === effect.source) return
  emit('patch', { source: code.value })
}

function setValue(name: string, value: ShaderUniformValue) {
  emit('patch', { uniforms: { ...effect.uniforms, [name]: value } })
}

function bind(name: string, variableId: string | null) {
  const bindings: Record<string, string> = {}
  for (const [key, id] of Object.entries(effect.uniformBindings ?? {})) {
    if (key !== name) bindings[key] = id
  }
  if (variableId) bindings[name] = variableId
  emit('patch', { uniformBindings: bindings })
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <AppTextarea
      v-model="code"
      :rows="10"
      class="font-mono text-[11px]"
      data-test-id="effect-shader-code"
      @change="commitCode"
    />
    <AppAlert
      v-if="codeError"
      tone="error"
      :heading="panels.invalidShaderCode"
      :description="codeError"
      data-test-id="effect-shader-code-error"
    />
    <ShaderUniformControls
      :uniforms="uniforms"
      :values="effect.uniforms"
      :bindings="effect.uniformBindings"
      :variables="variables"
      @set-value="setValue"
      @bind="bind"
    />
  </div>
</template>
