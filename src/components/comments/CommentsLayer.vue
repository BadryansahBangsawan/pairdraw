<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import {
  ContextMenuContent,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuTrigger,
  PopoverContent,
  PopoverPortal,
  PopoverRoot
} from 'reka-ui'
import { computed, ref, useTemplateRef, watch } from 'vue'

import type { ViewportTransform } from '@pairdraw/core/geometry'
import type { Vector } from '@pairdraw/scene-graph/primitives'
import { useCommentMessages } from '@pairdraw/vue/i18n'

import {
  liveStrokeBox,
  regionStrokeBox,
  strokeMaskURL,
  strokeToComment,
  type StrokeBox
} from '@/app/comments/region'
import { useComments } from '@/app/comments/use'
import { useEditorStore } from '@/app/editor/active-store'
import { useMenuUI } from '@/components/ui/menu/menu'
import MenuScrollArea from '@/components/ui/menu/MenuScrollArea.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import { COMMENT_PIN_SIZE } from '@/theme/comments'

import { useCommentAuthor } from './author'
import CommentActionsMenu from './CommentActionsMenu.vue'
import CommentComposer from './CommentComposer.vue'
import CommentPin from './CommentPin.vue'
import CommentThreadCard from './CommentThreadCard.vue'
import { comments as commentsTheme } from './ui'
import { usePinDrag } from './usePinDrag'

const { canvasEl, drawn = null } = defineProps<{
  canvasEl: HTMLCanvasElement | null
  /**
   * The pan and zoom of the canvas's last drawn frame. Pins follow it rather than the live view,
   * which runs ahead of the drawing while panning fast, as preview islands do.
   */
  drawn?: ViewportTransform | null
}>()

/** Room between a card and its pin's bubble. */
const CARD_GAP = 8

const store = useEditorStore()
const comments = useComments()
const messages = useCommentMessages()
const author = useCommentAuthor()
const menuCls = useMenuUI({ content: 'min-w-40' })
const ui = commentsTheme()
const threadCls = usePopoverUI({ content: ui.card() })
const draftCls = usePopoverUI({ content: ui.draftCard() })
const { activeThreadId, draft, stroke, showOnCanvas, listShowResolved, commentsOnly } = comments
const commenting = computed(() => store.state.activeTool === 'COMMENT')

const draftText = ref('')
const draftComposer = useTemplateRef<{ focus: () => void }>('draftComposer')
const threadCard = useTemplateRef<{ focus: () => void }>('threadCard')

// Picking another tool drops a comment that was never sent, as in Figma.
watch(commenting, (on) => {
  if (!on) {
    draft.value = null
    comments.cancelStrokeIfDrawing()
  }
})

const placement = computed<ViewportTransform>(() => drawn ?? store.state)

/** A canvas point in the pins' layer, which panning moves as a whole. */
function toLayer(at: Vector) {
  return { left: at.x * placement.value.zoom, top: at.y * placement.value.zoom }
}

function toScreen(at: Vector) {
  const { left, top } = toLayer(at)
  return { left: left + placement.value.panX, top: top + placement.value.panY }
}

const pinDrag = usePinDrag({
  zoom: () => store.state.zoom,
  onDrop: comments.movePin,
  onClick: comments.toggleThread
})

/** How far a press must travel, in screen pixels, before it draws a region instead of dropping a pin. */
const DRAG_THRESHOLD = 4
/** Screen pixels between the points kept while drawing; a pointer sends far more than a stroke needs. */
const SAMPLE_DISTANCE = 1.5

/**
 * Listeners that only matter between a press and its release. Their target is the canvas while a
 * stroke is in progress and nothing otherwise, so an idle Comment tool keeps no pointer handler;
 * VueUse adds and removes them as the target changes. Escape is the editor's to take, which asks
 * `cancelStrokeIfDrawing` before it would leave the tool.
 */
const strokeTarget = computed<HTMLCanvasElement | null>(() => (stroke.value ? canvasEl : null))

useEventListener(strokeTarget, 'pointermove', moveStroke)
useEventListener(strokeTarget, 'pointerup', releaseStroke)
useEventListener(strokeTarget, 'pointercancel', cancelStroke)
useEventListener(strokeTarget, 'contextmenu', cancelStroke)

// Pins show unless View → Comments hid them; the Comment tool always shows them, as in Figma.
const pins = computed(() => {
  // Layers move without the comment changing; re-place pins on every scene change.
  void store.state.sceneVersion
  if (!showOnCanvas.value && !commenting.value) return []
  const pageId = store.state.currentPageId
  return comments.threads.value
    .filter(
      (thread) =>
        !thread.deleted && thread.pageId === pageId && (!thread.resolved || listShowResolved.value)
    )
    .map((thread) => {
      const dragged = pinDrag.draggedTo(thread.id)
      const at = dragged ?? comments.pinPosition(thread)
      const mark = thread.region ? regionStrokeBox(thread.region, at, placement.value.zoom) : null
      return { thread, at, dragging: dragged !== null, mark, ...toLayer(at) }
    })
})

/** The strokes of the threads on screen, drawn under the pins at the drawn frame's pan and zoom. */
const strokes = computed(() =>
  pins.value.flatMap((pin) => (pin.mark ? [{ id: pin.thread.id, box: pin.mark }] : []))
)

const activePin = computed(() => pins.value.find((pin) => pin.thread.id === activeThreadId.value))
const draftAt = computed(() =>
  draft.value && draft.value.pageId === store.state.currentPageId ? draft.value : null
)
const draftPlace = computed(() => draftAt.value && toLayer(draftAt.value))

// The card sits beside the pin's bubble, which rises above and right of the commented spot,
// on whichever side has room; the bubble's box is what it keeps clear of.
const cardAnchor = computed(() => activePin.value?.at ?? draftAt.value ?? null)
const cardReference = computed(() => {
  const at = cardAnchor.value
  const canvas = canvasEl
  if (!at || !canvas) return null
  const { left, top } = toScreen(at)
  return {
    getBoundingClientRect() {
      const rect = canvas.getBoundingClientRect()
      return new DOMRect(
        rect.left + left,
        rect.top + top - COMMENT_PIN_SIZE,
        COMMENT_PIN_SIZE,
        COMMENT_PIN_SIZE
      )
    }
  }
})

/** Where the pointer is, in the canvas's own pixels. */
function screenAt(event: PointerEvent): Vector | null {
  if (!canvasEl) return null
  const rect = canvasEl.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function placeDraft(event: PointerEvent) {
  if (!commenting.value || event.button !== 0 || !canvasEl) return
  event.preventDefault()
  // With a card open, a click on the canvas only closes it, as in Figma.
  if (comments.closeCard()) return
  const screen = screenAt(event)
  if (!screen) return
  const at = store.screenToCanvas(screen.x, screen.y)
  // A press becomes a pin on release; moving it draws the area to comment on instead.
  canvasEl.setPointerCapture(event.pointerId)
  stroke.value = { pointerId: event.pointerId, points: [at], start: at, startScreen: screen }
}

/** Grows the stroke with the pointer, keeping only points a person would see the shape through. */
function moveStroke(event: PointerEvent) {
  const current = stroke.value
  if (!current || current.pointerId !== event.pointerId) return
  const screen = screenAt(event)
  if (!screen) return
  const travel = Math.hypot(screen.x - current.startScreen.x, screen.y - current.startScreen.y)
  if (current.points.length === 1 && travel < DRAG_THRESHOLD) return
  const at = store.screenToCanvas(screen.x, screen.y)
  const last = current.points[current.points.length - 1]
  if (!last) return
  if (Math.hypot(at.x - last.x, at.y - last.y) * placement.value.zoom < SAMPLE_DISTANCE) return
  // Mutating the array in place keeps a mouse move from rebuilding the path more than once.
  current.points.push(at)
}

/** Ends the gesture: a stroke becomes the thread's region, a press a plain pin. */
function releaseStroke(event: PointerEvent) {
  const current = stroke.value
  if (!current || current.pointerId !== event.pointerId) return
  cancelStroke()
  const pageId = store.state.currentPageId
  const drawn =
    current.points.length > 1 ? strokeToComment(current.points, placement.value.zoom) : null
  comments.startDraft(
    drawn ? { pageId, ...drawn.at, region: drawn.region } : { pageId, ...current.start }
  )
  draftText.value = ''
}

/** Drops an unfinished stroke: nothing reaches the document, and the tool stays. */
function cancelStroke() {
  const current = stroke.value
  comments.cancelStrokeIfDrawing()
  if (current && canvasEl?.hasPointerCapture(current.pointerId)) {
    canvasEl.releasePointerCapture(current.pointerId)
  }
}

const draftStroke = computed(() => {
  const at = draftAt.value
  return at?.region ? regionStrokeBox(at.region, at, placement.value.zoom) : null
})

const liveStroke = computed(() => {
  const current = stroke.value
  return current && current.points.length > 1
    ? liveStrokeBox(current.points, placement.value.zoom)
    : null
})

const maskCache = new Map<string, string>()

/** A stroke's box and mask, encoded once per shape rather than on every frame it pans with. */
function strokeStyle(box: StrokeBox) {
  const key = `${box.width}x${box.height}:${box.stroke}:${box.d}`
  let mask = maskCache.get(key)
  if (!mask) {
    if (maskCache.size >= 256) maskCache.clear()
    mask = strokeMaskURL(box)
    maskCache.set(key, mask)
  }
  return {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    maskImage: mask,
    maskSize: '100% 100%',
    maskRepeat: 'no-repeat'
  }
}

// The canvas places drafts itself, so its other buttons keep panning and opening the layer menu.
useEventListener(() => canvasEl, 'pointerdown', placeDraft)

// Scrolling and zooming keep working over pins and while placing comments, as in Figma.
function forwardWheel(event: WheelEvent) {
  if (!canvasEl) return
  event.preventDefault()
  canvasEl.dispatchEvent(new WheelEvent('wheel', event))
}

function postDraft(text: string) {
  comments.addThread(text)
  draftText.value = ''
}

function focusCard() {
  const card = draftAt.value ? draftComposer.value : threadCard.value
  card?.focus()
}

function onCardOpen(event: Event) {
  event.preventDefault()
  focusCard()
}

// The card stays open when a sent comment becomes its thread or another pin is picked.
const cardKey = computed(() => (draftAt.value ? 'draft' : (activePin.value?.thread.id ?? null)))
watch(cardKey, (key) => key && focusCard(), { flush: 'post' })

// Escape closes the card only; the editor's Escape would leave the Comment tool as well.
function onCardEscape(event: KeyboardEvent) {
  event.stopPropagation()
}

function closeCard() {
  comments.closeCard()
}
</script>

<template>
  <!-- Right-clicks here belong to comments, not to the canvas layer menu underneath; scrolling
       and zooming over pins or while placing comments still reach the canvas. -->
  <div :class="ui.layer()" data-canvas-overlay="comments" @contextmenu.stop @wheel="forwardWheel">
    <div
      :class="ui.pins()"
      :style="{ transform: `translate(${placement.panX}px, ${placement.panY}px)` }"
    >
      <!-- The strokes people circled with, drawn in the accent color under the pins. -->
      <span
        v-for="entry in strokes"
        :key="entry.id"
        :class="ui.stroke()"
        :style="strokeStyle(entry.box)"
        data-slot="comment-region"
      />
      <span
        v-if="draftStroke"
        :class="ui.stroke()"
        :style="strokeStyle(draftStroke)"
        data-slot="comment-region"
        data-draft
      />
      <span
        v-if="liveStroke"
        :class="ui.stroke()"
        :style="strokeStyle(liveStroke)"
        data-slot="comment-region"
        data-draft
      />
      <ContextMenuRoot v-for="pin in pins" :key="pin.thread.id" :modal="false">
        <ContextMenuTrigger as-child>
          <CommentPin
            :author="author.name(pin.thread.author)"
            :color="pin.thread.authorColor"
            :text="pin.thread.text"
            :at="pin.thread.createdAt"
            :active="activeThreadId === pin.thread.id"
            :resolved="pin.thread.resolved"
            :dragging="pin.dragging"
            :style="{ left: `${pin.left}px`, top: `${pin.top}px` }"
            :aria-label="`${author.name(pin.thread.author)}: ${pin.thread.text}`"
            @pointerdown.stop="!commentsOnly && pinDrag.start($event, pin.thread.id, pin.at)"
            @pointermove="pinDrag.move"
            @pointerup="pinDrag.end"
            @pointercancel="pinDrag.end"
            @click.stop="pinDrag.click(pin.thread.id)"
          />
        </ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent :class="menuCls.content">
            <MenuScrollArea>
              <CommentActionsMenu :thread="pin.thread" kind="context" show-hide />
            </MenuScrollArea>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenuRoot>

      <CommentPin
        v-if="draftPlace"
        draft
        :style="{ left: `${draftPlace.left}px`, top: `${draftPlace.top}px` }"
        aria-hidden="true"
        tabindex="-1"
      />
    </div>

    <PopoverRoot
      :open="!!cardReference && (!!activePin || !!draftAt)"
      @update:open="(open: boolean) => !open && closeCard()"
    >
      <PopoverPortal>
        <PopoverContent
          v-if="cardReference"
          :reference="cardReference"
          side="right"
          :align="draftAt ? 'center' : 'start'"
          :side-offset="CARD_GAP"
          :collision-padding="8"
          :class="draftAt ? draftCls.content : threadCls.content"
          @open-auto-focus="onCardOpen"
          @escape-key-down="onCardEscape"
        >
          <CommentComposer
            v-if="draftAt"
            ref="draftComposer"
            v-model="draftText"
            bare
            :label="messages.addComment"
            @submit="postDraft"
            @cancel="closeCard"
          />
          <CommentThreadCard
            v-else-if="activePin"
            ref="threadCard"
            :thread="activePin.thread"
            :can-delete-replies="!commentsOnly"
            @close="closeCard"
            @resolve="comments.setResolved"
            @reply="comments.reply"
            @delete-reply="comments.deleteReply"
          >
            <template #menu>
              <CommentActionsMenu :thread="activePin.thread" kind="dropdown" />
            </template>
          </CommentThreadCard>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </div>
</template>
