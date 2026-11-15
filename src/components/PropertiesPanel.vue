<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, defineAsyncComponent } from 'vue'

import { useDesignCheckMessages, useI18n } from '@pairdraw/vue/i18n'

import { useAIChat } from '@/app/ai/chat/use'
import { isVersionHistoryOpen } from '@/app/cloud/integration'
import { useEditorStore } from '@/app/editor/active-store'
import { countIssues } from '@/app/editor/design-check/issues'
import { CloudVersionHistory } from '@/components/cloud/integration'
import { useOpenedOnce } from '@/components/ui/overlay/opened'
import Tip from '@/components/ui/overlay/Tip.vue'
import propertiesTabsTheme from '@/theme/panel/properties-tabs'
import sidePanelTheme from '@/theme/panel/side'

import CommentsPanel from './comments/CommentsPanel.vue'
import DesignCheckPanel from './design-check/DesignCheckPanel.vue'
import DesignPanel from './DesignPanel.vue'

const propertiesTabs = tv(propertiesTabsTheme)

const { activeTab } = useAIChat()
// The code panel, with its exporters, loads the first time its tab opens.
const CodePanel = defineAsyncComponent(() => import('./CodePanel.vue'))
const codeOpened = useOpenedOnce(() => activeTab.value === 'code')
const { panels } = useI18n()
const checkMessages = useDesignCheckMessages()
const store = useEditorStore()

const tabStyles = propertiesTabs()
const iconTabStyles = propertiesTabs({ segment: 'icon' })
const sideStyles = tv(sidePanelTheme)()
/** The Comment tool turns the sidebar into the comments list, as in Figma; the tabs keep their state. */
const commenting = computed(() => store.state.activeTool === 'COMMENT')
/** Version history takes the sidebar while it is open, for the document and a version alike. */
const history = computed(() => isVersionHistoryOpen(store))

/** Errors and warnings on the current page; suggestions do not earn an indicator. */
const problemCount = computed(() => {
  const snapshot = store.designCheck.snapshot.value
  if (!snapshot || snapshot.pageId !== store.state.currentPageId) return null
  const counts = countIssues(snapshot.issues)
  return { total: counts.error + counts.warning, severity: counts.error > 0 ? 'error' : 'warning' }
})
</script>

<template>
  <aside data-test-id="properties-panel" :class="sideStyles.root()">
    <CloudVersionHistory v-if="history" />
    <CommentsPanel v-else-if="commenting" />
    <TabsRoot
      v-show="!commenting && !history"
      v-model="activeTab"
      class="flex min-h-0 flex-1 flex-col"
    >
      <div :class="sideStyles.switcher()">
        <TabsList :class="tabStyles.list()">
          <TabsTrigger
            value="design"
            data-test-id="properties-tab-design"
            :class="tabStyles.trigger()"
          >
            {{ panels.design }}
          </TabsTrigger>
          <TabsTrigger value="code" data-test-id="properties-tab-code" :class="tabStyles.trigger()">
            <icon-lucide-code :class="tabStyles.icon()" aria-hidden="true" />
            <span :class="tabStyles.label()">{{ panels.code }}</span>
          </TabsTrigger>
          <Tip :label="checkMessages.tab">
            <TabsTrigger
              value="lint"
              data-test-id="properties-tab-lint"
              :aria-label="
                problemCount?.total
                  ? `${checkMessages.tab}, ${checkMessages.tabCount({ count: problemCount.total })}`
                  : checkMessages.tab
              "
              :class="iconTabStyles.trigger()"
            >
              <!-- Errors and warnings tint the icon, which costs no room in a full row. -->
              <icon-lucide-list-checks
                :data-severity="problemCount?.total ? problemCount.severity : undefined"
                :class="iconTabStyles.icon()"
                aria-hidden="true"
              />
            </TabsTrigger>
          </Tip>
        </TabsList>
      </div>

      <TabsContent
        value="design"
        class="flex min-h-0 flex-1 flex-col"
        :force-mount="true"
        :hidden="activeTab !== 'design'"
      >
        <DesignPanel />
      </TabsContent>

      <TabsContent
        value="code"
        class="flex min-h-0 flex-1 flex-col"
        :force-mount="true"
        :hidden="activeTab !== 'code'"
      >
        <CodePanel v-if="codeOpened" :active="activeTab === 'code'" />
      </TabsContent>

      <TabsContent
        value="lint"
        class="flex min-h-0 flex-1 flex-col"
        :force-mount="true"
        :hidden="activeTab !== 'lint'"
      >
        <DesignCheckPanel :active="activeTab === 'lint'" />
      </TabsContent>
    </TabsRoot>
  </aside>
</template>
