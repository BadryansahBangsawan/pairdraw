<script setup lang="ts">
import { computed, ref } from 'vue'

import { currentDesignRules, distilDesignValues } from '@pairdraw/core/design-memory'
import {
  allowDesignValue,
  createDesignMemory,
  DESIGN_MEMORY_GROUPS,
  pinDesignExample,
  type DesignMemoryGroup
} from '@pairdraw/scene-graph/design-memory'
import { useCommonMessages, useDesignMemoryMessages } from '@pairdraw/vue/i18n'

import { useDesignMemory } from '@/app/editor/design-memory/use'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import AppCheckbox from '@/components/ui/toggle/AppCheckbox.vue'

/**
 * The values the layers use that the memory does not allow yet, most used first, to add as
 * rules. Values used only once start unchecked: they are more often slips than decisions.
 * Adding pins the frames learned from as examples. A document without a memory gets one, which
 * allows its variables and styles, only when the person adds.
 */
const { nodeIds } = defineProps<{ nodeIds: readonly string[] }>()
const emit = defineEmits<{ done: [] }>()

const messages = useDesignMemoryMessages()
const common = useCommonMessages()
const { store, memory } = useDesignMemory()

/** Read once as Learn opens; the layers may change after, the proposal does not follow them. */
const learned = distilDesignValues(store.graph, nodeIds)
/** The memory the proposals add to: the document's, or a new one it does not have yet. */
const base = computed(() => memory.value ?? createDesignMemory())
const rules = computed(() => currentDesignRules(store.graph, base.value))

const proposals = computed(() =>
  DESIGN_MEMORY_GROUPS.flatMap((group) => {
    const allowed = new Set(
      rules.value[group].allowed.map(({ value }) => String(value).toLowerCase())
    )
    const values = learned[group].filter((entry) => !allowed.has(String(entry.value).toLowerCase()))
    return values.length > 0 ? [{ group, values }] : []
  })
)

const key = (group: DesignMemoryGroup, value: string | number) => `${group}:${value}`
const checked = ref(
  new Set(
    DESIGN_MEMORY_GROUPS.flatMap((group) =>
      learned[group].filter((entry) => entry.count > 1).map((entry) => key(group, entry.value))
    )
  )
)

function toggle(group: DesignMemoryGroup, value: string | number, on: boolean) {
  const next = new Set(checked.value)
  if (on) next.add(key(group, value))
  else next.delete(key(group, value))
  checked.value = next
}

function addChecked() {
  const examples = nodeIds.filter((id) => store.graph.getNode(id)?.type !== 'CANVAS')
  let next = base.value
  for (const { group, values } of proposals.value)
    for (const { value } of values)
      if (checked.value.has(key(group, value))) next = allowDesignValue(next, group, value)
  next = examples.reduce(pinDesignExample, next)
  if (next !== memory.value)
    store.setDesignMemory(next, memory.value ? 'Learn design memory' : 'Create design memory')
  emit('done')
}
</script>

<template>
  <div class="flex flex-col gap-3" data-test-id="design-memory-learn">
    <div v-if="proposals.length > 0">
      <h3 class="text-[12px] font-medium">{{ messages.learnHeading }}</h3>
      <p class="text-[11px] text-muted">{{ messages.learnHint }}</p>
    </div>
    <AppPlaceholder
      v-else
      :label="messages.learnHeading"
      :description="messages.nothingToLearn"
      :fill="false"
      size="compact"
    />
    <section v-for="{ group, values } in proposals" :key="group" class="flex flex-col gap-1">
      <h4 class="text-[11px] text-muted">{{ messages[group] }}</h4>
      <ul class="flex flex-col gap-0.5">
        <li v-for="entry in values" :key="entry.value">
          <label class="flex items-center gap-2 text-[12px] tabular-nums">
            <AppCheckbox
              :model-value="checked.has(key(group, entry.value))"
              :ariaLabel="String(entry.value)"
              @update:model-value="toggle(group, entry.value, $event)"
            />
            <span
              v-if="group === 'colors'"
              class="size-3 rounded-sm border border-border"
              :style="{ backgroundColor: String(entry.value) }"
              aria-hidden="true"
            />
            <span class="flex-1">{{ entry.value }}</span>
            <span class="text-[11px] text-muted">{{ messages.uses(entry.count) }}</span>
          </label>
        </li>
      </ul>
    </section>
    <div class="flex justify-end gap-2">
      <AppButton variant="ghost" @click="emit('done')">{{ common.cancel }}</AppButton>
      <AppButton
        variant="solid"
        color="primary"
        data-test-id="design-memory-add-checked"
        @click="addChecked"
      >
        {{ messages.addChecked }}
      </AppButton>
    </div>
  </div>
</template>
