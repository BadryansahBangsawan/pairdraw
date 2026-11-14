<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, useTemplateRef } from 'vue'
import IconSearch from '~icons/lucide/search'

import { useCommandMessages } from '@pairdraw/vue/i18n'

import {
  filterShortcutSheet,
  shortcutKeyGroups,
  type ShortcutSheetSection
} from '@/app/shell/keyboard/sheet'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import shortcutSheetTheme from '@/theme/shortcut-sheet'

/**
 * The shortcut sheet's search and sections. Its columns follow its own width
 * (`@container/shortcuts`), whatever holds it.
 */
const { sections } = defineProps<{ sections: readonly ShortcutSheetSection[] }>()
const query = defineModel<string>('query', { default: '' })

const commands = useCommandMessages()
const styles = tv(shortcutSheetTheme)()
const search = useTemplateRef<InstanceType<typeof AppInput>>('search')

const shown = computed(() => filterShortcutSheet(sections, query.value))

defineExpose({ focus: () => search.value?.focus() })
</script>

<template>
  <div :class="styles.body()">
    <AppInput
      ref="search"
      v-model="query"
      type="search"
      :class="styles.search()"
      :aria-label="commands.shortcutSheetSearch"
      :placeholder="commands.shortcutSheetSearch"
    >
      <template #leading><IconSearch :class="styles.searchIcon()" /></template>
    </AppInput>
    <div v-if="shown.length > 0" :class="styles.grid()">
      <section
        v-for="section in shown"
        :key="section.id"
        :aria-labelledby="`shortcut-sheet-${section.id}`"
        :class="styles.section()"
      >
        <h3 :id="`shortcut-sheet-${section.id}`" :class="styles.sectionTitle()">
          {{ section.label }}
        </h3>
        <dl :class="styles.list()">
          <div
            v-for="entry in section.entries"
            :key="entry.id"
            data-slot="shortcut"
            :class="styles.row()"
          >
            <dt :class="styles.label()">{{ entry.label }}</dt>
            <dd :class="styles.keys()">
              <template v-for="(caps, group) in shortcutKeyGroups(entry.shortcut)" :key="group">
                <span v-if="group > 0" :class="styles.separator()">,</span>
                <kbd v-for="(cap, index) in caps" :key="index" :class="styles.key()">
                  {{ cap }}
                </kbd>
              </template>
              <span v-if="entry.gesture" :class="styles.gesture()">{{ entry.gesture }}</span>
            </dd>
          </div>
        </dl>
      </section>
    </div>
    <AppPlaceholder
      v-else
      size="compact"
      :fill="false"
      :label="commands.shortcutSheetEmpty"
      :class="styles.empty()"
    />
  </div>
</template>
