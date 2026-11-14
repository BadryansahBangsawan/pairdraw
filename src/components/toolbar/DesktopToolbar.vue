<script setup lang="ts">
import { ToolbarRoot } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import type { EditorToolDef, Tool } from '@pairdraw/core'
import {
  getToolbarToolSelection,
  isToolbarToolActive,
  ToolbarItem
} from '@pairdraw/vue/primitives/Toolbar'
import { toolbarToolTestId } from '@pairdraw/vue/testing'

import type { ToolbarAction, ToolbarItem as ToolbarLayoutItem } from '@/app/editor/toolbar/layout'
import { toolTip } from '@/app/editor/toolbar/shortcuts'
import ShapeToolButton from '@/components/toolbar/ShapeToolButton.vue'
import ToolButton from '@/components/toolbar/ToolButton.vue'
import ToolFlyout from '@/components/toolbar/ToolFlyout.vue'
import type { ToolbarUI, ToolIconMap, ToolLabels } from '@/components/toolbar/types'
import Tip from '@/components/ui/overlay/Tip.vue'
import toolbarTheme from '@/theme/toolbar'

const { items, activeTool, flyoutSelections, toolIcons, toolLabels, toolShortcuts, rulers, ui } =
  defineProps<{
    items: ToolbarLayoutItem[]
    activeTool: Tool
    flyoutSelections: ReadonlyMap<Tool, Tool>
    toolIcons: ToolIconMap
    toolLabels: ToolLabels
    toolShortcuts: Readonly<Record<Tool, string>>
    /** The canvas shows its rulers along its top and left edges. */
    rulers?: boolean
    ui?: ToolbarUI
  }>()

const emit = defineEmits<{
  setTool: [tool: Tool]
}>()

const toolbar = tv(toolbarTheme)
const styles = computed(() => toolbar({ rulers }))

/** The tool a flyout's button shows: the active one if it is in the flyout, else the last used. */
function selectedTool(tool: EditorToolDef) {
  return getToolbarToolSelection(tool, activeTool, flyoutSelections)
}

defineSlots<{
  /** A control above the tools, in a pill of its own. */
  start?(): unknown
  /** A button that runs a command, such as placing an icon, rather than picking a tool. */
  action(props: { action: ToolbarAction }): unknown
  /** Pickers whose buttons are hidden, anchored to the toolbar's top edge. */
  hidden(): unknown
  /** Fixed buttons after the layout's own, which Customize toolbar does not move or hide. */
  end(): unknown
}>()
</script>

<template>
  <div data-canvas-obstacle :class="styles.dock({ class: ui?.dock })">
    <div v-if="$slots.start" :class="styles.start()">
      <slot name="start" />
    </div>
    <ToolbarRoot data-test-id="toolbar" :class="styles.bar({ class: ui?.bar })">
      <template v-for="item in items" :key="item.kind === 'tool' ? item.tool.key : item.action">
        <slot v-if="item.kind === 'action'" name="action" :action="item.action" />

        <ShapeToolButton v-else-if="item.tool.key === 'SHAPE_WITH_TEXT'" :ui="ui" />

        <Tip
          v-else-if="item.tool.flyout"
          side="right"
          :label="
            toolTip(toolLabels[selectedTool(item.tool)], toolShortcuts[selectedTool(item.tool)])
          "
        >
          <ToolFlyout
            :tool="item.tool"
            :active-tool="activeTool"
            :selected-tool="selectedTool(item.tool)"
            :tool-icons="toolIcons"
            :tool-labels="toolLabels"
            :tool-shortcuts="toolShortcuts"
            :ui="ui"
            @select="emit('setTool', $event)"
          />
        </Tip>

        <ToolbarItem v-else v-slot="{ active, actions }" :tool="item.tool.key">
          <Tip
            side="right"
            :label="toolTip(toolLabels[item.tool.key], toolShortcuts[item.tool.key])"
          >
            <ToolButton
              :data-test-id="toolbarToolTestId(item.tool.key)"
              :icon="toolIcons[item.tool.key]"
              :label="toolLabels[item.tool.key]"
              :active="active || isToolbarToolActive(item.tool, activeTool)"
              :ui="ui"
              @click="actions.select"
            />
          </Tip>
        </ToolbarItem>
      </template>
      <slot name="end" />
    </ToolbarRoot>
    <slot name="hidden" />
  </div>
</template>
