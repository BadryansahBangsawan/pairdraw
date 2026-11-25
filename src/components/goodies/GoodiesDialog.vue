<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, ref, watch } from 'vue'

import { BUILTIN_LIBRARY_ID } from '@pairdraw/core/library'
import { SHADER_GALLERY, type ShaderGalleryId } from '@pairdraw/vue/controls/shader'
import { useI18n } from '@pairdraw/vue/i18n'

import { getActiveEditorStore, useEditorStore } from '@/app/editor/active-store'
import { applyGoodieShader, insertGoodieScript, pinGoodieStyle } from '@/app/goodies/actions'
import { GOODIE_SCRIPTS, type GoodieScript } from '@/app/goodies/scripts'
import { GOODIE_STYLES, type GoodieStyle } from '@/app/goodies/styles'
import { notificationMessages } from '@/app/i18n/notifications'
import { useLibraryService } from '@/app/libraries'
import { toast } from '@/app/shell/ui'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppDialogHeader, AppDialogRoot } from '@/components/ui/dialog'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import { AppTabsContent, AppTabsList, AppTabsRoot, AppTabsTrigger } from '@/components/ui/tabs'
import theme from '@/theme/goodies'

import GoodiesShaderTile from './GoodiesShaderTile.vue'

/**
 * Goodies: styles for the AI chat, design systems, scripts and shaders to start from, each in a
 * tab, with a few of each under Featured. Using one closes the dialog, so its result shows.
 */
const GOODIES_TABS = ['featured', 'styles', 'design-systems', 'scripts', 'shaders'] as const
type GoodiesTab = (typeof GOODIES_TABS)[number]
/** How many of each kind Featured shows. */
const FEATURED_STYLES = 3
const FEATURED_SCRIPTS = 3
const FEATURED_SHADERS = 4

const store = useEditorStore()
const service = useLibraryService()
const { editor, panels, common } = useI18n()
const styles = tv(theme)()
const tab = ref<GoodiesTab>('featured')

const tabLabels = computed<Record<GoodiesTab, string>>(() => ({
  featured: editor.value.goodiesFeatured,
  styles: editor.value.goodiesStyles,
  'design-systems': editor.value.goodiesDesignSystems,
  scripts: editor.value.goodiesScripts,
  shaders: editor.value.goodiesShaders
}))
const scriptLabels = computed<Record<GoodieScript['id'], { name: string; hint: string }>>(() => ({
  statCard: {
    name: editor.value.goodiesScriptStatCard,
    hint: editor.value.goodiesScriptStatCardHint
  },
  barChart: {
    name: editor.value.goodiesScriptBarChart,
    hint: editor.value.goodiesScriptBarChartHint
  },
  swatches: {
    name: editor.value.goodiesScriptSwatches,
    hint: editor.value.goodiesScriptSwatchesHint
  },
  calendar: {
    name: editor.value.goodiesScriptCalendar,
    hint: editor.value.goodiesScriptCalendarHint
  },
  dots: { name: editor.value.goodiesScriptDots, hint: editor.value.goodiesScriptDotsHint }
}))
const shaderNames = computed<Record<ShaderGalleryId, string>>(() => ({
  sunset: panels.value.shaderGallerySunset,
  northernLights: panels.value.shaderGalleryNorthernLights,
  retroScreen: panels.value.shaderGalleryRetroScreen,
  halftonePrint: panels.value.shaderGalleryHalftonePrint,
  ditheredDusk: panels.value.shaderGalleryDitheredDusk,
  glassOrb: panels.value.shaderGalleryGlassOrb,
  marble: panels.value.shaderGalleryMarble,
  neonGrid: panels.value.shaderGalleryNeonGrid,
  velvet: panels.value.shaderGalleryVelvet,
  liquidChrome: panels.value.shaderGalleryLiquidChrome,
  flutedGlass: panels.value.shaderGalleryFlutedGlass,
  paperStock: panels.value.shaderGalleryPaperStock,
  godRays: panels.value.shaderGalleryGodRays,
  thermal: panels.value.shaderGalleryThermal,
  voronoiCells: panels.value.shaderGalleryVoronoiCells,
  deepWater: panels.value.shaderGalleryDeepWater,
  smokePlume: panels.value.shaderGallerySmokePlume,
  neonPulse: panels.value.shaderGalleryNeonPulse,
  grainWash: panels.value.shaderGalleryGrainWash,
  obsidian: panels.value.shaderGalleryObsidian,
  marbleInk: panels.value.shaderGalleryMarbleInk
}))

/** The sections a tab shows: Featured shows the first few of each kind, a kind's tab all of it. */
const shown = computed(() => {
  const featured = tab.value === 'featured'
  return {
    styles: featured ? GOODIE_STYLES.slice(0, FEATURED_STYLES) : GOODIE_STYLES,
    scripts: featured ? GOODIE_SCRIPTS.slice(0, FEATURED_SCRIPTS) : GOODIE_SCRIPTS,
    shaders: featured ? SHADER_GALLERY.slice(0, FEATURED_SHADERS) : SHADER_GALLERY
  }
})

function close() {
  store.state.goodiesOpen = false
}

function fail(cause: unknown) {
  const error = cause instanceof Error ? cause.message : String(cause)
  toast.error(notificationMessages.get().operationFailed({ error }))
}

// Each opening starts on Featured and reads the libraries the document can enable.
watch(
  () => store.state.goodiesOpen,
  (open) => {
    if (!open) return
    tab.value = 'featured'
    void service.refresh(getActiveEditorStore()).catch(fail)
  }
)

function useStyle(style: GoodieStyle) {
  pinGoodieStyle(getActiveEditorStore(), style)
  close()
}

function insertScript(script: GoodieScript) {
  insertGoodieScript(getActiveEditorStore(), script)
  close()
}

function applyShader(id: ShaderGalleryId) {
  const entry = SHADER_GALLERY.find((item) => item.id === id)
  if (!entry) return
  applyGoodieShader(getActiveEditorStore(), entry.preset)
  close()
}

function libraryEnabled(libraryId: string): boolean {
  void store.state.sceneVersion
  return store.graph.enabledLibraries.get(libraryId)?.enabled === true
}

async function toggleLibrary(libraryId: string) {
  const target = getActiveEditorStore()
  try {
    if (libraryEnabled(libraryId)) await service.disable(target, libraryId)
    else await service.enable(target, libraryId)
  } catch (cause) {
    fail(cause)
  }
}
</script>

<template>
  <AppDialogRoot
    v-model:open="store.state.goodiesOpen"
    size="xl"
    height="tall"
    data-test-id="goodies-dialog"
  >
    <AppDialogHeader
      :heading="editor.goodies"
      :description="editor.goodiesDescription"
      :close-label="common.close"
    />
    <AppTabsRoot v-model="tab" orientation="horizontal">
      <AppTabsList :label="editor.goodies">
        <AppTabsTrigger
          v-for="value in GOODIES_TABS"
          :key="value"
          :value="value"
          :data-test-id="`goodies-tab-${value}`"
        >
          {{ tabLabels[value] }}
        </AppTabsTrigger>
      </AppTabsList>
      <AppTabsContent v-for="value in GOODIES_TABS" :key="value" :value="value" as-child>
        <div :class="styles.body()">
          <section
            v-if="value === 'featured' || value === 'styles'"
            :aria-label="editor.goodiesStyles"
            :class="styles.section()"
          >
            <h3 :class="styles.heading()">{{ editor.goodiesStyles }}</h3>
            <p :class="styles.hint()">{{ editor.goodiesStylesHint }}</p>
            <ul :class="styles.grid()">
              <li
                v-for="style in shown.styles"
                :key="style.id"
                :class="styles.card()"
                :data-goodie-style="style.id"
              >
                <div :class="styles.swatches()" aria-hidden="true">
                  <span
                    v-for="color in style.kit.colors"
                    :key="color.hex"
                    :class="styles.swatch()"
                    :style="{ background: color.hex }"
                  />
                </div>
                <p :class="styles.cardTitle()">{{ style.kit.name }}</p>
                <p :class="styles.fonts()">{{ style.kit.fonts.join(', ') }}</p>
                <p :class="styles.cardText()">{{ style.kit.notes }}</p>
                <AppButton variant="outline" :class="styles.cardAction()" @click="useStyle(style)">
                  {{ editor.goodiesUseStyle }}
                </AppButton>
              </li>
            </ul>
          </section>

          <section
            v-if="value === 'design-systems'"
            :aria-label="editor.goodiesDesignSystems"
            :class="styles.section()"
          >
            <h3 :class="styles.heading()">{{ editor.goodiesDesignSystems }}</h3>
            <p :class="styles.hint()">{{ editor.goodiesDesignSystemsHint }}</p>
            <div
              v-for="library in service.summaries.value"
              :key="library.libraryId"
              :class="styles.library()"
              :data-goodie-library="library.libraryId"
            >
              <icon-lucide-library class="size-4 text-component" />
              <div :class="styles.libraryText()">
                <p :class="styles.libraryName()">
                  <span class="truncate">{{ library.name }}</span>
                  <span
                    v-if="library.libraryId === BUILTIN_LIBRARY_ID"
                    :class="styles.libraryBadge()"
                  >
                    {{ panels.builtinLibrary }}
                  </span>
                </p>
                <p :class="styles.libraryCount()">
                  {{ panels.libraryAssetCount({ count: library.assetCount }) }}
                </p>
              </div>
              <AppButton variant="outline" @click="toggleLibrary(library.libraryId)">
                {{
                  libraryEnabled(library.libraryId) ? panels.disableLibrary : panels.enableLibrary
                }}
              </AppButton>
            </div>
            <AppPlaceholder
              v-if="service.summaries.value.length === 0"
              :label="panels.noLibraries"
              size="compact"
              :fill="false"
            />
          </section>

          <section
            v-if="value === 'featured' || value === 'scripts'"
            :aria-label="editor.goodiesScripts"
            :class="styles.section()"
          >
            <h3 :class="styles.heading()">{{ editor.goodiesScripts }}</h3>
            <p :class="styles.hint()">{{ editor.goodiesScriptsHint }}</p>
            <ul :class="styles.grid()">
              <li
                v-for="script in shown.scripts"
                :key="script.id"
                :class="styles.card()"
                :data-goodie-script="script.id"
              >
                <div :class="styles.cardHeader()">
                  <icon-lucide-braces :class="styles.icon()" />
                  <p :class="styles.cardTitle()">{{ scriptLabels[script.id].name }}</p>
                </div>
                <p :class="styles.cardText()">{{ scriptLabels[script.id].hint }}</p>
                <AppButton
                  variant="outline"
                  :class="styles.cardAction()"
                  @click="insertScript(script)"
                >
                  {{ editor.goodiesInsertScript }}
                </AppButton>
              </li>
            </ul>
          </section>

          <section
            v-if="value === 'featured' || value === 'shaders'"
            :aria-label="editor.goodiesShaders"
            :class="styles.section()"
          >
            <h3 :class="styles.heading()">{{ editor.goodiesShaders }}</h3>
            <p :class="styles.hint()">{{ editor.goodiesShadersHint }}</p>
            <div :class="styles.shaderGrid()">
              <GoodiesShaderTile
                v-for="entry in shown.shaders"
                :key="entry.id"
                :entry="entry"
                :label="shaderNames[entry.id]"
                @apply="applyShader(entry.id)"
              />
            </div>
          </section>
        </div>
      </AppTabsContent>
    </AppTabsRoot>
  </AppDialogRoot>
</template>
