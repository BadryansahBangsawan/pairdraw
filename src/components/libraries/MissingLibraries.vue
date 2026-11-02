<script setup lang="ts">
import { computed } from 'vue'

import type { LibrarySummary } from '@open-pencil/core/library'
import { useI18n } from '@open-pencil/vue/i18n'

import type { MissingLibrary } from '@/app/libraries/relink'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

/** Enabled libraries no catalog can read, each with a choice of library to relink it to. */
const {
  missing,
  libraries,
  disabled = false
} = defineProps<{
  missing: MissingLibrary[]
  /** The libraries the catalog offers in their place. */
  libraries: LibrarySummary[]
  disabled?: boolean
}>()
const emit = defineEmits<{ relink: [fromLibraryId: string, toLibraryId: string] }>()
const { panels } = useI18n()

const options = computed(() =>
  libraries.map((library) => ({ value: library.libraryId, label: library.name }))
)

function choose(fromLibraryId: string, toLibraryId: string) {
  if (toLibraryId) emit('relink', fromLibraryId, toLibraryId)
}
</script>

<template>
  <AppAlert
    v-if="missing.length > 0"
    tone="warning"
    class="mb-4"
    data-test-id="missing-libraries"
    :heading="panels.missingLibraries"
    :description="
      options.length > 0 ? panels.missingLibrariesDescription : panels.noLibrariesToRelink
    "
  >
    <template #details>
      <ul>
        <li
          v-for="library in missing"
          :key="library.libraryId"
          data-slot="missing-library"
          class="flex items-center gap-3 border-t border-warning-border py-2 first:border-t-0"
        >
          <icon-lucide-library class="size-4 shrink-0" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-surface">{{ library.libraryId }}</p>
            <p class="text-[10px] text-muted">
              {{
                panels.missingLibraryUsage({
                  assets: panels.missingLibraryAssets(library.assetCount),
                  instances: panels.missingLibraryInstances(library.instanceCount)
                })
              }}
            </p>
          </div>
          <AppSelect
            v-if="options.length > 0"
            model-value=""
            size="sm"
            :label="panels.relinkLibraryLabel({ library: library.libraryId })"
            :placeholder="panels.relinkLibrary"
            :options="options"
            :disabled="disabled"
            :ui="{ trigger: 'w-40' }"
            @update:model-value="choose(library.libraryId, $event)"
          />
        </li>
      </ul>
    </template>
  </AppAlert>
</template>
