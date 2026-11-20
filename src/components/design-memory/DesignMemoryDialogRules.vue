<script setup lang="ts">
import { computed, reactive } from 'vue'

import {
  allowDesignValue,
  DESIGN_MEMORY_GROUPS,
  disallowDesignValue,
  type DesignMemoryEnforcement,
  type DesignMemoryGroup
} from '@pairdraw/scene-graph/design-memory'
import { useDesignMemoryMessages } from '@pairdraw/vue/i18n'

import { useDesignMemory } from '@/app/editor/design-memory/use'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import AppCheckbox from '@/components/ui/toggle/AppCheckbox.vue'

/**
 * What each group allows: the document's variables and styles when included, plus values of
 * the person's own, and what an agent's edit with another value does.
 */
const messages = useDesignMemoryMessages()
const { memory, report, change } = useDesignMemory()
const drafts = reactive<Record<DesignMemoryGroup, string>>({
  colors: '',
  fonts: '',
  fontSizes: '',
  spacing: '',
  radius: ''
})

const enforcementOptions = computed(() => [
  { value: 'refuse', label: messages.value.refuse },
  { value: 'warn', label: messages.value.warn },
  { value: 'off', label: messages.value.off }
])

/** How many derived values each group shows before it counts the rest. */
const SHOWN_SYSTEM_VALUES = 24

/** The values a group takes from the document's variables and styles, which it shows greyed. */
function systemValues(group: DesignMemoryGroup) {
  const resolved = report.value?.groups[group]
  const values = resolved?.allowed.filter((entry) => entry.name !== null) ?? []
  return {
    shown: values.slice(0, SHOWN_SYSTEM_VALUES),
    count: values.length + (resolved?.more ?? 0),
    more: Math.max(0, values.length - SHOWN_SYSTEM_VALUES) + (resolved?.more ?? 0)
  }
}

function pickColor(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return
  const color = event.target.value
  change((current) => allowDesignValue(current, 'colors', color))
}

/** A group allows nothing yet, so nothing is checked whatever its setting. */
function unchecked(group: DesignMemoryGroup): boolean {
  return memory.value?.[group].enforce !== 'off' && report.value?.groups[group].enforce === 'off'
}

function isEnforcement(value: string): value is DesignMemoryEnforcement {
  return value === 'refuse' || value === 'warn' || value === 'off'
}

function setEnforcement(group: DesignMemoryGroup, value: string) {
  if (!isEnforcement(value)) return
  change((current) => ({ ...current, [group]: { ...current[group], enforce: value } }))
}

function setFromSystem(group: DesignMemoryGroup, fromSystem: boolean) {
  change((current) => ({ ...current, [group]: { ...current[group], fromSystem } }))
}

function add(group: DesignMemoryGroup) {
  const text = drafts[group].trim()
  if (!text) return
  const value = group === 'colors' || group === 'fonts' ? text : Number(text)
  change((current) => allowDesignValue(current, group, value))
  drafts[group] = ''
}

function remove(group: DesignMemoryGroup, value: string | number) {
  change((current) => disallowDesignValue(current, group, value))
}
</script>

<template>
  <div v-if="memory" class="flex flex-col gap-3" data-test-id="design-memory-rules">
    <section
      v-for="group in DESIGN_MEMORY_GROUPS"
      :key="group"
      class="flex flex-col gap-1.5 border-b border-border pb-3 last:border-b-0 last:pb-0"
      :data-group="group"
    >
      <div class="flex items-center gap-2">
        <h3 class="flex-1 text-[12px] font-medium">{{ messages[group] }}</h3>
        <AppSelect
          :model-value="memory[group].enforce"
          :options="enforcementOptions"
          :label="messages.enforcement"
          :ui="{ trigger: 'w-36' }"
          data-test-id="design-memory-enforcement"
          @update:model-value="setEnforcement(group, String($event))"
        />
      </div>
      <label class="flex items-center gap-2 text-[11px]">
        <AppCheckbox
          :model-value="memory[group].fromSystem"
          :ariaLabel="messages.fromSystem"
          @update:model-value="setFromSystem(group, $event)"
        />
        <span>{{ messages.fromSystem }}</span>
        <span v-if="memory[group].fromSystem" class="text-muted">
          {{ messages.fromSystemCount(systemValues(group).count) }}
        </span>
      </label>
      <ul
        v-if="memory[group].fromSystem && systemValues(group).count > 0"
        class="flex flex-wrap gap-1 text-[11px] text-muted tabular-nums"
        data-test-id="design-memory-system-values"
      >
        <li
          v-for="entry in systemValues(group).shown"
          :key="entry.value"
          class="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 opacity-70"
        >
          <span
            v-if="group === 'colors'"
            class="size-3 rounded-sm border border-border"
            :style="{ backgroundColor: String(entry.value) }"
            aria-hidden="true"
          />
          {{ entry.value }}
        </li>
        <li v-if="systemValues(group).more > 0" class="px-1 py-0.5">
          {{ messages.moreValues({ count: String(systemValues(group).more) }) }}
        </li>
      </ul>
      <ul v-if="memory[group].values.length > 0" class="flex flex-wrap gap-1">
        <li
          v-for="value in memory[group].values"
          :key="value"
          class="flex items-center gap-1 rounded bg-panel-field py-0.5 pr-0.5 pl-1.5 text-[11px] tabular-nums"
        >
          <span
            v-if="group === 'colors'"
            class="size-3 rounded-sm border border-border"
            :style="{ backgroundColor: String(value) }"
            aria-hidden="true"
          />
          {{ value }}
          <IconButton
            :label="messages.removeValue({ value: String(value) })"
            @click="remove(group, value)"
          >
            <icon-lucide-x class="size-3" />
          </IconButton>
        </li>
      </ul>
      <div class="flex items-center gap-1.5">
        <input
          v-if="group === 'colors'"
          type="color"
          class="size-6 shrink-0 cursor-pointer rounded border border-border bg-transparent"
          :aria-label="messages.pickColor"
          @change="pickColor"
        />
        <AppInput
          v-model="drafts[group]"
          size="sm"
          tone="panel"
          class="flex-1"
          :placeholder="messages.addValue"
          :aria-label="`${messages[group]}: ${messages.addValue}`"
          @enter="add(group)"
        />
      </div>
      <p v-if="unchecked(group)" class="text-[11px] text-muted">{{ messages.notChecked }}</p>
    </section>
  </div>
</template>
