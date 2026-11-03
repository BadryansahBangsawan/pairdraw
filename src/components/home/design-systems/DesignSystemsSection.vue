<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, onMounted } from 'vue'

import type { LibrarySummary } from '@open-pencil/core/library'
import { useViewportKind } from '@open-pencil/vue/editor/viewport-kind'
import { useI18n } from '@open-pencil/vue/i18n'

import {
  matchingDesignSystems,
  orderedDesignSystems,
  useHomeDesignSystems
} from '@/app/home/design-systems'
import { useDateFormat } from '@/app/i18n/date'
import DocumentEntry from '@/components/home/document/DocumentEntry.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import AppSkeleton from '@/components/ui/feedback/AppSkeleton.vue'
import { skeleton } from '@/components/ui/feedback/skeleton'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'
import documentsTheme from '@/theme/home/documents'

/**
 * The design systems on Home: the published component libraries a new design can start from.
 * Picking one opens a new design with that library turned on.
 */
const { query } = defineProps<{
  /** Home's search as typed, trimmed. */
  query: string
}>()
const emit = defineEmits<{ start: [library: LibrarySummary] }>()
const view = defineModel<'grid' | 'list'>('view', { required: true })

const { files, common, panels, locale } = useI18n()
const { isTouch } = useViewportKind()
const dates = useDateFormat()
const styles = tv(documentsTheme)()
const loading = skeleton()
const designSystems = useHomeDesignSystems()
const listed = computed(() =>
  orderedDesignSystems(
    matchingDesignSystems(
      designSystems.libraries.value,
      query.toLocaleLowerCase(locale.value),
      locale.value
    ),
    locale.value
  )
)

onMounted(() => void designSystems.refresh())

function metadata(library: LibrarySummary): string {
  const components = files.value.designSystemComponents(library.assetCount)
  return Date.parse(library.publishedAt)
    ? `${components} · ${dates.relative(library.publishedAt)}`
    : components
}
</script>

<template>
  <section :class="styles.section()">
    <div :class="styles.header()">
      <div :class="styles.heading()">
        <h1 :class="styles.title()">{{ files.designSystems }}</h1>
        <p :class="styles.description()">{{ files.designSystemsDescription }}</p>
      </div>
      <div :class="styles.actions()">
        <IconButton
          :label="common.refresh"
          :size="isTouch ? 'lg' : 'sm'"
          @click="designSystems.refresh"
        >
          <icon-lucide-refresh-cw class="size-3.5" />
        </IconButton>
        <SegmentedControl
          v-model="view"
          required
          :label="files.designSystems"
          :size="isTouch ? 'touch' : 'md'"
          :options="[
            { value: 'grid', label: panels.gridView },
            { value: 'list', label: panels.listView }
          ]"
        >
          <template #option="{ option }">
            <icon-lucide-layout-grid v-if="option.value === 'grid'" class="size-3.5" />
            <icon-lucide-list v-else class="size-3.5" />
          </template>
        </SegmentedControl>
      </div>
    </div>

    <div
      v-if="!designSystems.loaded.value && designSystems.loading.value"
      :class="[styles.grid(), loading.group()]"
      role="status"
      :aria-label="files.loadingDesignSystems"
    >
      <div v-for="index in 3" :key="index" :class="styles.skeleton()">
        <AppSkeleton :class="styles.skeletonPreview()" />
        <AppSkeleton :class="styles.skeletonName()" />
        <AppSkeleton :class="styles.skeletonMeta()" />
      </div>
    </div>

    <div
      v-else-if="designSystems.error.value && listed.length === 0"
      :class="styles.error()"
      role="alert"
    >
      <p :class="styles.errorText()">{{ designSystems.error.value }}</p>
      <AppButton variant="outline" :class="styles.errorAction()" @click="designSystems.refresh">
        {{ common.refresh }}
      </AppButton>
    </div>

    <div v-else-if="listed.length" :class="view === 'grid' ? styles.grid() : styles.list()">
      <DocumentEntry
        v-for="library in listed"
        :key="library.libraryId"
        :view="view"
        :name="library.name"
        :metadata="metadata(library)"
        :label="files.newDesignWith({ name: library.name })"
        @open="emit('start', library)"
      >
        <template #fallback
          ><icon-lucide-library-big :class="styles.designSystemPreview()"
        /></template>
        <template #icon><icon-lucide-library-big :class="styles.designSystemIcon()" /></template>
      </DocumentEntry>
    </div>

    <AppPlaceholder
      v-else-if="!query && designSystems.loaded.value"
      size="page"
      label-as="h2"
      :label="files.noDesignSystems"
      :description="files.noDesignSystemsDescription"
      :ui="{ root: styles.empty() }"
    >
      <template #icon><icon-lucide-library-big class="size-5" /></template>
    </AppPlaceholder>

    <p v-else-if="query && designSystems.loaded.value" :class="styles.empty()">
      {{ files.noMatchingFiles({ query }) }}
    </p>
  </section>
</template>
