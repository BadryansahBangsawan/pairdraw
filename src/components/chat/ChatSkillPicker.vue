<script setup lang="ts">
import { partition } from 'es-toolkit'
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from 'reka-ui'
import { computed, ref, useId } from 'vue'

import { useAIMessages } from '@pairdraw/vue/i18n'

import type { Skill } from '@/app/ai/skills/types'
import { chatSkillPickerTheme } from '@/components/chat/ui'
import { useSkillMessages } from '@/components/settings/skills/messages'
import IconButton from '@/components/ui/button/IconButton.vue'
import { menuItem, useMenuUI } from '@/components/ui/menu/menu'
import MenuScrollArea from '@/components/ui/menu/MenuScrollArea.vue'

/**
 * The composer's "Pick a skill" menu: the skills the user can run, their own first and then the
 * ones that ship with the app, as `/` offers them. Picking one starts the message with it once
 * the menu has closed, so the field gets the focus back.
 */
const { skills, disabled = false } = defineProps<{
  /** The skills the user can run by name now. */
  skills: readonly Skill[]
  disabled?: boolean
}>()
const emit = defineEmits<{
  /** The menu opened, so the list can be read again. */
  open: []
  pick: [name: string]
  manage: []
}>()

const ai = useAIMessages()
const messages = useSkillMessages()
const ui = chatSkillPickerTheme()
const menu = useMenuUI({ content: 'w-72 max-w-[calc(100vw-1rem)]', icon: 'shrink-0' })
const skillItem = menuItem({ justify: 'start', class: 'items-start py-1.5' })
const manageItem = menuItem({ justify: 'start' })
/** The empty state describes the menu, so a screen reader says why it holds only Manage. */
const emptyId = useId()

const groups = computed(() => {
  const [builtin, own] = partition(skills, (skill) => skill.source === 'builtin')
  return [
    { key: 'own', label: ai.value.skillPickerYours, skills: own },
    { key: 'builtin', label: ai.value.skillsBuiltinSource, skills: builtin }
  ].filter((group) => group.skills.length > 0)
})

/** What was chosen, acted on as the menu closes. */
const chosen = ref<{ kind: 'pick'; name: string } | { kind: 'manage' } | null>(null)

function onOpen(open: boolean) {
  if (open) emit('open')
}

function onCloseAutoFocus(event: Event) {
  const choice = chosen.value
  chosen.value = null
  if (!choice) return
  // The message field or Settings takes the focus instead of the trigger.
  event.preventDefault()
  if (choice.kind === 'pick') emit('pick', choice.name)
  else emit('manage')
}
</script>

<template>
  <DropdownMenuRoot :modal="false" @update:open="onOpen">
    <DropdownMenuTrigger as-child>
      <IconButton
        :label="ai.pickSkill"
        size="sm"
        :disabled="disabled"
        data-test-id="chat-skill-picker"
      >
        <icon-lucide-book-open :class="ui.triggerIcon()" />
      </IconButton>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        side="top"
        align="start"
        :side-offset="6"
        :collision-padding="8"
        :class="menu.content"
        :aria-label="ai.pickSkill"
        :aria-describedby="groups.length === 0 ? emptyId : undefined"
        @close-auto-focus="onCloseAutoFocus"
      >
        <MenuScrollArea>
          <p v-if="groups.length === 0" :id="emptyId" :class="ui.empty()">
            {{ ai.skillPickerNone }}
          </p>
          <DropdownMenuGroup v-for="group in groups" :key="group.key">
            <DropdownMenuLabel :class="menu.label">{{ group.label }}</DropdownMenuLabel>
            <DropdownMenuItem
              v-for="skill in group.skills"
              :key="`${skill.source}/${skill.name}`"
              :class="skillItem"
              :text-value="skill.name"
              :data-skill="skill.name"
              @select="chosen = { kind: 'pick', name: skill.name }"
            >
              <icon-lucide-book-open :class="[menu.icon, ui.skillIcon()]" aria-hidden="true" />
              <span :class="ui.itemText()">
                <span :class="ui.name()">{{ skill.name }}</span>
                <span :class="ui.description()">{{ messages.description(skill) }}</span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </MenuScrollArea>
        <DropdownMenuSeparator :class="menu.separator" />
        <DropdownMenuItem :class="manageItem" @select="chosen = { kind: 'manage' }">
          <icon-lucide-settings-2 :class="menu.icon" aria-hidden="true" />
          {{ ai.skillPickerManage }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
