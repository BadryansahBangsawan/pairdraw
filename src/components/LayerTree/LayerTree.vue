<script setup lang="ts">
import { useElementSize, useScroll } from '@vueuse/core'
import {
  TreeItem,
  TreeVirtualizer,
  ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuPortal
} from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, nextTick, ref, useAttrs, useTemplateRef, watch } from 'vue'

import { useInlineRename } from '@pairdraw/vue/editor/inline-rename'
import { useI18n } from '@pairdraw/vue/i18n'
import {
  LayerTreeRoot,
  LayerTreeItem,
  stickyTopLevelRow,
  type LayerDragInstruction,
  type LayerNode,
  type LayerRow,
  type LayerSelectionMode,
  type LayerTreeVirtualizer
} from '@pairdraw/vue/primitives/LayerTree'

import { useEditorStore } from '@/app/editor/active-store'
import layerTreeTheme from '@/theme/layer-tree'

import CanvasMenu from '../canvas/CanvasMenu.vue'
import {
  LAYER_TREE_BADGE,
  LAYER_TREE_BADGE_TEXT_SIZE,
  LAYER_TREE_BUTTONS,
  LAYER_TREE_INDENT,
  LAYER_TREE_NAME_START,
  LAYER_TREE_ROW_HEIGHT
} from './geometry'
import LayerTreeNodeRow from './LayerTreeNodeRow.vue'
import LayerTreeRenameRow from './LayerTreeRenameRow.vue'
import LayerTreeStickyRow from './LayerTreeStickyRow.vue'
import { layerModeNames } from './mode-names'
import { provideLayerTreeUI } from './ui'
import type { LayerTreeUI } from './ui'
import { createTextMeasure, rowsOverflow } from './width'

const { panels } = useI18n()

interface LayerTreeRootActions {
  select: (id: string, selection: boolean | LayerSelectionMode) => void
  toggleExpand: (id: string) => void
  setFocused: (focused: boolean) => void
  setVirtualizer: (virtualizer: LayerTreeVirtualizer) => void
}

interface LayerTreeSlotScope {
  actions: LayerTreeRootActions
  draggingId: string | null
  instruction: LayerDragInstruction | null
  instructionTargetId: string | null
  focused: boolean
}

defineOptions({ inheritAttrs: false })

const { ui } = defineProps<{ ui?: LayerTreeUI }>()

const attrs = useAttrs()
const styles = tv(layerTreeTheme)()
provideLayerTreeUI(() => ui)
const store = useEditorStore()
const viewport = useTemplateRef<HTMLElement>('viewport')
const root = useTemplateRef<InstanceType<typeof LayerTreeRoot>>('root')
/** How far the rows are scrolled, for the pinned top-level row. */
const { y: scrollTop } = useScroll(viewport)
const { width: viewportWidth } = useElementSize(viewport)
const measureText = createTextMeasure()
const rename = useInlineRename((id, name) => store.renameNode(id, name))

const renameControls = {
  commit: rename.commit,
  onKeydown: rename.onKeydown,
  focusInput: rename.focusInput
}

watch(
  () => store.state.renameNodeId,
  (id) => {
    if (!id) return
    const node = store.graph.getNode(id)
    store.state.renameNodeId = null
    if (node) rename.start(node.id, node.name)
  },
  { immediate: true }
)

/** Rename the pinned layer on its own row: scroll the list back to it, then start. */
async function renamePinned(id: string, name: string, index: number) {
  if (viewport.value) viewport.value.scrollTop = index * LAYER_TREE_ROW_HEIGHT
  await nextTick()
  rename.start(id, name)
}

function onLayerRightClick(e: MouseEvent) {
  const row = (e.target as HTMLElement).closest<HTMLElement>('[data-node-id]')
  if (!row?.dataset.nodeId) return
  if (!store.state.selectedIds.has(row.dataset.nodeId)) store.select([row.dataset.nodeId])
}

function layerSelectionMode(e: CustomEvent): LayerSelectionMode {
  const mouseEvent = e.detail?.originalEvent as MouseEvent | undefined
  return {
    additive: !!(mouseEvent?.metaKey || mouseEvent?.ctrlKey),
    range: !!mouseEvent?.shiftKey
  }
}

function onTreeSelect(
  e: CustomEvent,
  id: string,
  select: (id: string, selection: boolean | LayerSelectionMode) => void
) {
  e.preventDefault()
  select(id, layerSelectionMode(e))
}

function isLayerNode(value: unknown): value is LayerNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'type' in value &&
    'layoutMode' in value &&
    'visible' in value &&
    'locked' in value &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.type === 'string' &&
    typeof value.layoutMode === 'string' &&
    typeof value.visible === 'boolean' &&
    typeof value.locked === 'boolean'
  )
}

function toLayerNode(value: unknown): LayerNode {
  if (isLayerNode(value)) return value
  throw new Error('[pairdraw] Invalid layer tree item')
}

function layerTextContent(value: unknown): string {
  return toLayerNode(value).name
}

function chrome(scope: Omit<LayerTreeSlotScope, 'actions'>) {
  return {
    draggingId: scope.draggingId,
    instruction: scope.instruction,
    instructionTargetId: scope.instructionTargetId,
    focused: scope.focused,
    indent: LAYER_TREE_INDENT
  }
}

/**
 * The rows' width, wider than the list for the widest row's whole name. It goes on the
 * virtualizer's own element, over its `width: 100%`; its rows fill it, and a wider block runs past
 * the list's end, so the list scrolls sideways. The rows are reactive, so a rename or a new mode
 * badge widens it, while other renders reuse it.
 */
const rowsWidth = computed(() => {
  const el = viewport.value
  // The list sets the rows' text size, so its font is the names' font.
  const style = el ? getComputedStyle(el) : null
  const overflow = rowsOverflow(
    root.value?.visibleRows ?? [],
    {
      font: style?.font ?? '',
      badgeFont: style
        ? `${style.fontWeight} ${LAYER_TREE_BADGE_TEXT_SIZE}px ${style.fontFamily}`
        : '',
      indent: LAYER_TREE_INDENT,
      nameStart: LAYER_TREE_NAME_START,
      buttons: LAYER_TREE_BUTTONS,
      badge: LAYER_TREE_BADGE,
      viewportWidth: viewportWidth.value
    },
    { modeNames: (row) => layerModeNames(store.graph, row.node.modeIds) },
    measureText
  )
  return `calc(100% + ${overflow}px)`
})

/**
 * The sideways scroll that shows a row with one level of its parent's indent before it, as
 * Figma's layers panel does when a layer is selected; top two levels need none.
 */
function inlineScroll(level: number): number {
  return Math.max(0, level - 2) * LAYER_TREE_INDENT
}

/**
 * The sideways scroll a reveal asked for until the rows are wide enough to take it: a reveal can
 * run before `rowsWidth` reaches the rows, when the list still has nowhere to scroll.
 */
const pendingInline = ref<number | null>(null)

function applyInline(): void {
  const el = viewport.value
  if (!el || pendingInline.value === null) return
  const desired = pendingInline.value
  if (desired > 0 && el.scrollWidth <= el.clientWidth) return
  el.scrollLeft = getComputedStyle(el).direction === 'rtl' ? -desired : desired
  pendingInline.value = null
}

watch(rowsWidth, applyInline)

/**
 * Bring a row into view. A nested row stops below the top-level row pinned over the top of the
 * list, so the pin never covers it; rows are one height, so their place is exact. Sideways, the
 * list scrolls to the row's depth, so a deep layer's name shows instead of shrinking away.
 */
function revealRow(rows: readonly LayerRow[], index: number) {
  const el = viewport.value
  const row = rows.at(index)
  if (!el || !row) return
  // Mirrored, the start edge is on the right and sideways scroll runs negative from it.
  pendingInline.value = inlineScroll(row.level)
  applyInline()
  // A layer showing as the pinned row is in view already, so selecting it keeps the list still.
  if (stickyTopLevelRow(rows, el.scrollTop, LAYER_TREE_ROW_HEIGHT)?.index === index) return
  const top = index * LAYER_TREE_ROW_HEIGHT
  const pinned = row.level > 1 ? LAYER_TREE_ROW_HEIGHT : 0
  if (top - pinned < el.scrollTop) {
    el.scrollTop = Math.max(0, top - pinned)
  } else if (top + LAYER_TREE_ROW_HEIGHT > el.scrollTop + el.clientHeight) {
    el.scrollTop = top + LAYER_TREE_ROW_HEIGHT - el.clientHeight
  }
}

function registerVirtualizer(
  actions: LayerTreeRootActions,
  virtualizer: LayerTreeVirtualizer,
  rows: () => readonly LayerRow[]
): boolean {
  actions.setVirtualizer({
    scrollToIndex: (index, options) => {
      if ((options?.align ?? 'auto') === 'auto') revealRow(rows(), index)
      else virtualizer.scrollToIndex(index, options)
    }
  })
  return true
}

function onFocusOut(event: FocusEvent, actions: LayerTreeRootActions) {
  const next = event.relatedTarget
  if (
    next instanceof Node &&
    event.currentTarget instanceof Node &&
    event.currentTarget.contains(next)
  ) {
    return
  }
  actions.setFocused(false)
}
</script>

<template>
  <LayerTreeRoot
    ref="root"
    v-slot="scope"
    :indent-per-level="LAYER_TREE_INDENT"
    multiple
    :aria-label="panels.layers"
  >
    <ContextMenuRoot :modal="false">
      <!-- The trigger covers the pinned row too, so right-clicking it opens the layer menu. -->
      <ContextMenuTrigger as-child @contextmenu="onLayerRightClick">
        <div
          v-bind="attrs"
          class="relative min-h-0 flex-1 overflow-hidden px-2"
          @focusin="scope.actions.setFocused(true)"
          @focusout="onFocusOut($event, scope.actions)"
        >
          <div
            ref="viewport"
            data-test-id="layers-scroll"
            data-slot="viewport"
            :class="styles.viewport({ class: ui?.viewport })"
          >
            <TreeVirtualizer
              v-slot="{ item, virtualizer }"
              :style="{ minWidth: rowsWidth }"
              :estimate-size="LAYER_TREE_ROW_HEIGHT"
              :text-content="layerTextContent"
            >
              <template
                v-if="registerVirtualizer(scope.actions, virtualizer, () => scope.visibleRows)"
              >
                <TreeItem
                  v-slot="{ isExpanded }"
                  v-bind="item.bind"
                  as-child
                  @select="
                    (e: CustomEvent) =>
                      onTreeSelect(e, toLayerNode(item.value).id, scope.actions.select)
                  "
                  @toggle="
                    (e: CustomEvent) => {
                      if (e.detail.originalEvent?.type === 'click') e.preventDefault()
                    }
                  "
                >
                  <LayerTreeItem
                    v-slot="{
                      node,
                      isSelected,
                      padLeft,
                      actions,
                      instruction,
                      instructionTargetId
                    }"
                    :node="toLayerNode(item.value)"
                    :level="item.level"
                    :has-children="item.hasChildren"
                  >
                    <LayerTreeRenameRow
                      v-if="rename.editingId.value === node.id"
                      :node="node"
                      :has-children="item.hasChildren"
                      :pad-left="padLeft"
                      :expanded="isExpanded"
                      :actions="actions"
                      :rename-controls="renameControls"
                    />

                    <LayerTreeNodeRow
                      v-else
                      :node="node"
                      :level="item.level"
                      :has-children="item.hasChildren"
                      :selected="isSelected"
                      :pad-left="padLeft"
                      :expanded="isExpanded"
                      :actions="actions"
                      :chrome="
                        chrome({
                          ...scope,
                          instruction,
                          instructionTargetId
                        })
                      "
                      @rename-start="rename.start"
                    />
                  </LayerTreeItem>
                </TreeItem>
              </template>
            </TreeVirtualizer>
          </div>
          <LayerTreeStickyRow
            :scroll-top="scrollTop"
            :chrome="chrome({ ...scope, instruction: null, instructionTargetId: null })"
            @rename-start="renamePinned"
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuPortal>
        <CanvasMenu />
      </ContextMenuPortal>
    </ContextMenuRoot>
  </LayerTreeRoot>
</template>
