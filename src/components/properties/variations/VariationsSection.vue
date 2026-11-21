<script setup lang="ts">
import { computed } from 'vue'

import { useVariationMessages } from '@pairdraw/vue/i18n'

import { useSelectedVariationSet } from '@/app/editor/variations/selection'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'

/**
 * The set of variations the selection belongs to: flip through its versions, use the selected
 * one in place of the original, show the original, or discard them all.
 */
const messages = useVariationMessages()
const {
  set,
  versionIndex,
  originalChanged,
  show,
  previous,
  next,
  goToOriginal,
  pickSelectedVersion,
  discardAll
} = useSelectedVariationSet()

const position = computed(() =>
  set.value && versionIndex.value !== -1
    ? `${versionIndex.value + 1} / ${set.value.versions.length}`
    : null
)

/** Why no version can be used, when the reason lies with the original rather than the selection. */
const blocked = computed(() => {
  switch (set.value?.pickProblem) {
    case 'original-missing':
      return messages.value.originalMissing
    case 'original-in-instance':
      return messages.value.originalInInstance
    case 'original-locked':
      return messages.value.originalLocked
    case 'original-not-editable':
      return messages.value.originalNotEditable
    case 'version-type-differs':
      return messages.value.versionTypeDiffers
    default:
      return null
  }
})

const useHint = computed(() => {
  const current = set.value
  if (!current?.version) return messages.value.selectVersion
  return current.original ? messages.value.useThisHint({ name: current.original.name }) : ''
})
</script>

<template>
  <PanelSection
    v-if="set"
    :label="messages.variationsCount({ count: String(set.versions.length) })"
    data-test-id="variations-section"
  >
    <template #actions>
      <span
        v-if="position"
        class="px-1 text-[11px] text-muted tabular-nums"
        data-test-id="variations-position"
      >
        {{ position }}
      </span>
      <IconButton
        :label="messages.previousVersion"
        :disabled="set.versions.length === 0"
        data-test-id="variations-previous"
        @click="previous"
      >
        <icon-lucide-chevron-left class="size-3.5" />
      </IconButton>
      <IconButton
        :label="messages.nextVersion"
        :disabled="set.versions.length === 0"
        data-test-id="variations-next"
        @click="next"
      >
        <icon-lucide-chevron-right class="size-3.5" />
      </IconButton>
    </template>

    <p v-if="set.original" class="truncate text-[11px] text-muted">
      {{ messages.variationsOf({ name: set.original.name }) }}
    </p>

    <ul class="mt-1 flex flex-col" data-test-id="variations-list">
      <li v-for="version in set.versions" :key="version.id">
        <button
          type="button"
          class="flex h-6 w-full cursor-pointer items-center gap-2 rounded border-none bg-transparent px-1.5 text-left text-xs text-muted hover:bg-hover hover:text-surface"
          :class="{ 'bg-hover text-surface': version.id === set.version?.id }"
          :aria-current="version.id === set.version?.id ? 'true' : undefined"
          data-test-id="variations-version"
          @click="show(version.id)"
        >
          <icon-lucide-frame class="size-3 shrink-0" />
          <span class="truncate">{{ version.name }}</span>
        </button>
      </li>
    </ul>

    <AppAlert
      v-if="originalChanged"
      tone="warning"
      class="mt-1.5"
      :heading="messages.originalChanged"
      data-test-id="variations-original-changed"
    />
    <AppAlert
      v-if="blocked"
      tone="info"
      class="mt-1.5"
      :heading="blocked"
      data-test-id="variations-blocked"
    />

    <Tip :label="useHint">
      <AppButton
        color="primary"
        variant="solid"
        class="mt-2 w-full"
        :disabled="!set.version || set.pickProblem !== null"
        data-test-id="variations-use"
        @click="pickSelectedVersion"
      >
        {{ messages.useThis }}
      </AppButton>
    </Tip>
    <div class="mt-1 flex gap-1">
      <AppButton
        size="xs"
        variant="ghost"
        class="flex-1"
        :disabled="!set.original"
        data-test-id="variations-original"
        @click="goToOriginal"
      >
        {{ messages.goToOriginal }}
      </AppButton>
      <AppButton
        size="xs"
        variant="ghost"
        color="error"
        class="flex-1"
        data-test-id="variations-discard"
        @click="discardAll"
      >
        {{ messages.discardAll }}
      </AppButton>
    </div>
  </PanelSection>
</template>
