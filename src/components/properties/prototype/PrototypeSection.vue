<script setup lang="ts">
import { computed } from 'vue'

import { primaryAction } from '@pairdraw/core/prototype'
import type {
  OverflowDirection,
  PrototypeNodeAction,
  PrototypeReaction,
  PrototypeTransitionType,
  PrototypeTriggerType
} from '@pairdraw/scene-graph'
import { useI18n } from '@pairdraw/vue/i18n'

import { openVideoExport } from '@/app/document/export/video/open'
import { useEditorStore } from '@/app/editor/active-store'
import { actionChoice, triggerHasDelay, type ActionChoice } from '@/app/editor/prototype/reactions'
import { usePrototype } from '@/app/editor/prototype/use'
import NumberField from '@/components/inputs/NumberField.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

const { panels } = useI18n()
const store = useEditorStore()
const {
  reactions,
  targets,
  variantTargets,
  scrollTargets,
  inheritedCount,
  selectMain,
  scrolls,
  overflow,
  scrollNeedsClip,
  setOverflow,
  play,
  add,
  remove,
  setTriggerType,
  setActionChoice,
  setDelay,
  setTarget,
  setTransition,
  setTransitionDuration
} = usePrototype()

/** One row per interaction, edited in place; the panel edits its first action, as Figma does. */
const triggerOptions = computed<{ value: PrototypeTriggerType; label: string }[]>(() => [
  { value: 'ON_CLICK', label: panels.value.prototypeTriggerOnClick },
  { value: 'ON_HOVER', label: panels.value.prototypeTriggerWhileHovering },
  { value: 'ON_PRESS', label: panels.value.prototypeTriggerWhilePressing },
  { value: 'MOUSE_ENTER', label: panels.value.prototypeTriggerMouseEnter },
  { value: 'MOUSE_LEAVE', label: panels.value.prototypeTriggerMouseLeave },
  { value: 'AFTER_TIMEOUT', label: panels.value.prototypeTriggerAfterDelay }
])

const actionLabels = computed<Record<ActionChoice, string>>(() => ({
  NAVIGATE: panels.value.prototypeActionNavigate,
  OVERLAY: panels.value.prototypeActionOverlay,
  CHANGE_TO: panels.value.prototypeActionChangeTo,
  SCROLL_TO: panels.value.prototypeActionScrollTo,
  BACK: panels.value.prototypeActionBack,
  CLOSE: panels.value.prototypeActionClose
}))

/**
 * The actions offered for an interaction: Change to on a layer in a variant, Scroll to on a screen
 * with something to scroll to, and one read from a file so it shows.
 */
function actionOptions(reaction: PrototypeReaction): { value: ActionChoice; label: string }[] {
  const current = actionChoice(reaction)
  const choices: ActionChoice[] = ['NAVIGATE', 'OVERLAY', 'BACK', 'CLOSE']
  if (scrollTargets.value.length > 0) choices.splice(2, 0, 'SCROLL_TO')
  if (variantTargets.value.length > 0) choices.splice(2, 0, 'CHANGE_TO')
  if (!choices.includes(current)) choices.splice(2, 0, current)
  return choices.map((value) => ({ value, label: actionLabels.value[value] }))
}

/**
 * What a node action can point at, and what its empty pick says: frames for a navigation or
 * overlay, variants for Change to, and layers that can scroll into view for Scroll to.
 */
function destinationOptions(reaction: PrototypeReaction) {
  const navigation = node(reaction)?.navigation
  if (navigation === 'CHANGE_TO') return variantTargets.value
  return navigation === 'SCROLL_TO' ? scrollTargets.value : frameOptions.value
}

function destinationPlaceholder(reaction: PrototypeReaction): string {
  const navigation = node(reaction)?.navigation
  if (navigation === 'CHANGE_TO') return panels.value.prototypeVariantPlaceholder
  if (navigation === 'SCROLL_TO') return panels.value.prototypeLayerPlaceholder
  return panels.value.prototypeDestinationPlaceholder
}

const overflowOptions = computed<{ value: OverflowDirection; label: string }[]>(() => [
  { value: 'NONE', label: panels.value.prototypeOverflowNone },
  { value: 'VERTICAL', label: panels.value.prototypeOverflowVertical },
  { value: 'HORIZONTAL', label: panels.value.prototypeOverflowHorizontal },
  { value: 'BOTH', label: panels.value.prototypeOverflowBoth }
])

const transitionOptions = computed<{ value: PrototypeTransitionType; label: string }[]>(() => [
  { value: 'INSTANT', label: panels.value.prototypeAnimationInstant },
  { value: 'DISSOLVE', label: panels.value.prototypeAnimationDissolve }
])

const frameOptions = computed(() =>
  targets.value.map((frame) => ({ value: frame.id, label: frame.name }))
)

function node(reaction: PrototypeReaction): PrototypeNodeAction | null {
  const first = primaryAction(reaction)
  return first?.type === 'NODE' ? first : null
}
</script>

<template>
  <PanelSection :label="panels.prototype" :empty="reactions.length === 0" class="pt-1">
    <template #actions>
      <IconButton
        v-if="targets.length > 0"
        :label="panels.prototypePlay"
        data-property="prototype-play"
        @click="play"
      >
        <icon-lucide-play class="size-3.5" />
      </IconButton>
      <IconButton
        v-if="targets.length > 0"
        :label="panels.prototypeExportVideo"
        data-property="prototype-export-video"
        @click="openVideoExport(store)"
      >
        <icon-lucide-clapperboard class="size-3.5" />
      </IconButton>
      <IconButton
        :label="panels.prototypeAddInteraction"
        data-property="prototype-add"
        @click="add"
      >
        <icon-lucide-plus class="size-3.5" />
      </IconButton>
    </template>

    <div v-if="scrolls" class="flex flex-col gap-1 pb-1.5">
      <div class="flex min-w-0 items-center gap-1.5">
        <span class="shrink-0 px-2 text-[11px] text-muted">{{ panels.prototypeOverflow }}</span>
        <AppSelect
          :model-value="overflow"
          :options="overflowOptions"
          :label="panels.prototypeOverflow"
          data-property="prototype-overflow"
          class="min-w-0 flex-1"
          @update:model-value="(value: OverflowDirection) => setOverflow(value)"
        />
      </div>
      <p v-if="scrollNeedsClip" class="px-2 text-[11px] text-muted">
        {{ panels.prototypeOverflowNeedsClip }}
      </p>
    </div>

    <button
      v-if="inheritedCount > 0"
      type="button"
      class="flex min-w-0 items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-muted hover:bg-hover hover:text-surface"
      data-property="prototype-inherited"
      @click="selectMain"
    >
      <icon-lucide-component class="size-3.5 shrink-0" />
      <span class="truncate">{{ panels.prototypeInheritedInteractions(inheritedCount) }}</span>
    </button>

    <div
      v-for="(reaction, index) in reactions"
      :key="reaction.id"
      data-property="prototype-reaction"
      :data-index="index"
      class="flex flex-col gap-1.5 border-b border-border py-1.5 last:border-b-0"
    >
      <div class="flex min-w-0 items-center gap-1.5">
        <AppSelect
          :model-value="reaction.trigger.type"
          :options="triggerOptions"
          :label="panels.prototypeTrigger"
          data-property="prototype-trigger"
          class="min-w-0 flex-1"
          @update:model-value="(type: PrototypeTriggerType) => setTriggerType(reaction.id, type)"
        />
        <NumberField
          v-if="triggerHasDelay(reaction.trigger.type)"
          :model-value="reaction.trigger.delay"
          :min="0"
          :step="0.1"
          :label="panels.prototypeDelay"
          suffix="s"
          data-property="prototype-delay"
          @commit="(delay: number) => setDelay(reaction.id, delay)"
        />
        <IconButton
          :label="panels.prototypeRemoveInteraction"
          data-property="prototype-remove"
          class="ml-auto"
          @click="remove(reaction.id)"
        >
          <icon-lucide-minus class="size-3.5" />
        </IconButton>
      </div>

      <AppSelect
        :model-value="actionChoice(reaction)"
        :options="actionOptions(reaction)"
        :label="panels.prototypeAction"
        data-property="prototype-action"
        @update:model-value="(value: ActionChoice) => setActionChoice(reaction.id, value)"
      />

      <template v-if="node(reaction)">
        <AppSelect
          :model-value="node(reaction)?.nodeId ?? ''"
          :options="destinationOptions(reaction)"
          :placeholder="destinationPlaceholder(reaction)"
          :label="panels.prototypeDestination"
          data-property="prototype-destination"
          @update:model-value="(id: string) => setTarget(reaction.id, id)"
        />
        <div class="flex min-w-0 items-center gap-1.5">
          <AppSelect
            :model-value="node(reaction)?.transition.type ?? 'INSTANT'"
            :options="transitionOptions"
            :label="panels.prototypeAnimation"
            data-property="prototype-animation"
            class="min-w-0 flex-1"
            @update:model-value="
              (type: PrototypeTransitionType) => setTransition(reaction.id, type)
            "
          />
          <NumberField
            v-if="node(reaction)?.transition.type === 'DISSOLVE'"
            :model-value="node(reaction)?.transition.duration ?? 0.3"
            :min="0"
            :step="0.1"
            :label="panels.prototypeDuration"
            suffix="s"
            data-property="prototype-duration"
            @commit="(seconds: number) => setTransitionDuration(reaction.id, seconds)"
          />
        </div>
      </template>
    </div>

    <template #emptyAction>
      <button
        type="button"
        class="flex min-w-0 items-center gap-1.5 rounded px-2 py-1.5 text-left text-[11px] text-muted hover:bg-hover hover:text-surface"
        data-property="prototype-add"
        @click="add"
      >
        <icon-lucide-plus class="size-3.5 shrink-0" />
        <span class="truncate">{{ panels.prototypeAddInteraction }}</span>
      </button>
    </template>

    <p v-if="targets.length === 0" class="px-2 pb-1.5 text-[11px] text-muted">
      {{ panels.prototypeNoFrames }}
    </p>
  </PanelSection>
</template>
