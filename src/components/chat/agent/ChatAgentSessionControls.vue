<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useAgentMessages } from '@pairdraw/vue/i18n'

import {
  choiceName,
  sessionControlPurpose,
  type AgentSessionControl,
  type AgentSessionControlCategory
} from '@/app/ai/agents/acp/session/controls'
import {
  chooseAgentSessionControl,
  useAgentSessionControls
} from '@/app/ai/agents/acp/session/store'
import Tip from '@/components/ui/overlay/Tip.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import type { AppSelectGroup } from '@/components/ui/select/select'
import sessionTheme from '@/theme/chat/session'

/**
 * The model, reasoning effort, and mode a coding agent advertised for its sessions. They show
 * once the agent has started a session and named them, and a choice applies to the running
 * session at once and to every session after, except a mode that skips permission requests,
 * and, in a chat's project folder, anything but the model and reasoning effort.
 */
const {
  agentId,
  agent,
  projectFolder = false
} = defineProps<{ agentId: string; agent: string; projectFolder?: boolean }>()
const emit = defineEmits<{ error: [message: string] }>()

const messages = useAgentMessages()
const styles = tv(sessionTheme)()
const controls = useAgentSessionControls(
  () => agentId,
  () => ({ projectFolder })
)

const categoryLabels = computed<Record<AgentSessionControlCategory, string | null>>(() => ({
  model: messages.value.sessionModel,
  thought_level: messages.value.sessionReasoning,
  mode: messages.value.sessionMode,
  other: null
}))

function label(control: AgentSessionControl): string {
  return categoryLabels.value[control.category] ?? control.name
}

function summary(control: AgentSessionControl): string {
  return `${label(control)}: ${choiceName(control, control.value)}`
}

function groups(control: AgentSessionControl): AppSelectGroup<string>[] {
  return control.groups.map((group) => ({
    label: group.label ?? undefined,
    options: group.choices.map((choice) => ({ value: choice.value, label: choice.name }))
  }))
}

async function choose(control: AgentSessionControl, value: string) {
  if (value === control.value) return
  try {
    await chooseAgentSessionControl(agentId, control.id, value)
  } catch {
    emit('error', messages.value.sessionControlFailed({ agent, value: choiceName(control, value) }))
  }
}
</script>

<template>
  <div v-if="controls.length" :class="styles.controls()" data-test-id="chat-agent-session-controls">
    <AppSelect
      v-for="control in controls"
      :key="control.id"
      :model-value="control.value"
      :label="summary(control)"
      :groups="groups(control)"
      :data-category="control.category"
      data-test-id="chat-agent-session-control"
      @update:model-value="choose(control, $event)"
    >
      <template #trigger>
        <button type="button" :class="styles.trigger()">
          <Tip :label="summary(control)">
            <span :class="styles.triggerContent()">
              <icon-lucide-box
                v-if="sessionControlPurpose(control) === 'model'"
                :class="styles.triggerIcon()"
                aria-hidden="true"
              />
              <icon-lucide-brain
                v-else-if="sessionControlPurpose(control) === 'thought_level'"
                :class="styles.triggerIcon()"
                aria-hidden="true"
              />
              <icon-lucide-shield-check
                v-else-if="sessionControlPurpose(control) === 'mode'"
                :class="styles.triggerIcon()"
                aria-hidden="true"
              />
              <icon-lucide-bot
                v-else-if="sessionControlPurpose(control) === 'agent'"
                :class="styles.triggerIcon()"
                aria-hidden="true"
              />
              <icon-lucide-zap
                v-else-if="sessionControlPurpose(control) === 'speed'"
                :class="styles.triggerIcon()"
                aria-hidden="true"
              />
              <icon-lucide-workflow
                v-else-if="sessionControlPurpose(control) === 'workflows'"
                :class="styles.triggerIcon()"
                aria-hidden="true"
              />
              <icon-lucide-sliders-horizontal
                v-else
                :class="styles.triggerIcon()"
                aria-hidden="true"
              />
              <span
                :class="
                  control.category === 'model'
                    ? styles.triggerValue()
                    : styles.triggerSecondaryValue()
                "
                >{{ choiceName(control, control.value) }}</span
              >
            </span>
          </Tip>
          <icon-lucide-chevron-down :class="styles.triggerChevron()" aria-hidden="true" />
        </button>
      </template>
    </AppSelect>
  </div>
</template>
