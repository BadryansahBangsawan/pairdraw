<script setup lang="ts">
import { tv } from 'tailwind-variants'

import { useCloudMessages, useFileMessages, useRecoveryMessages } from '@open-pencil/vue/i18n'

import theme from '@/theme/home/location-tabs'

import type { HomeLocation } from './cloud/types'

/**
 * The places Home always has, as tabs over its documents: recent files, drafts, and design
 * systems. The other places, a storage bucket and Cloud's workspaces, are in the menu the slot
 * holds at the end of the row.
 */
const { active } = defineProps<{ active: HomeLocation }>()
const emit = defineEmits<{ select: [location: HomeLocation] }>()
const t = useCloudMessages()
const files = useFileMessages()
const recovery = useRecoveryMessages()
const styles = tv(theme)()
</script>

<template>
  <nav :class="styles.root()" :aria-label="t.homeLocations">
    <div :class="styles.tabs()">
      <button
        type="button"
        :class="styles.tab()"
        :data-active="active.kind === 'recent'"
        :aria-current="active.kind === 'recent' ? 'page' : undefined"
        data-test-id="home-tab-recent"
        @click="emit('select', { kind: 'recent', id: 'recent' })"
      >
        {{ t.homeRecent }}
      </button>
      <button
        type="button"
        :class="styles.tab()"
        :data-active="active.kind === 'drafts'"
        :aria-current="active.kind === 'drafts' ? 'page' : undefined"
        data-test-id="home-tab-drafts"
        @click="emit('select', { kind: 'drafts', id: 'drafts' })"
      >
        {{ recovery.drafts }}
      </button>
      <button
        type="button"
        :class="styles.tab()"
        :data-active="active.kind === 'libraries'"
        :aria-current="active.kind === 'libraries' ? 'page' : undefined"
        data-test-id="home-tab-design-systems"
        @click="emit('select', { kind: 'libraries', id: 'libraries' })"
      >
        {{ files.designSystems }}
      </button>
    </div>
    <div v-if="$slots.default" :class="styles.more()"><slot /></div>
  </nav>
</template>
