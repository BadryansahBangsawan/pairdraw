import { primaryAction } from '@pairdraw/core/prototype'
import type {
  PrototypeAction,
  PrototypeActionType,
  PrototypeEasingType,
  PrototypeNavigationType,
  PrototypeNodeAction,
  PrototypeReaction,
  PrototypeTransitionType,
  PrototypeTriggerType
} from '@pairdraw/scene-graph'
import { generateId } from '@pairdraw/scene-graph'

/** Figma's transition length for a new interaction, and its default delay, in seconds. */
export const DEFAULT_TRANSITION_DURATION = 0.3
export const DEFAULT_TIMEOUT_DELAY = 1

/**
 * A new interaction: a click that jumps to a frame the author picks. The panel shows one action
 * per interaction in this version, as Figma's first action row; `actions` keeps the array the
 * `.fig` model and Figma's plugin API use.
 */
export function createReaction(): PrototypeReaction {
  return {
    id: generateId(),
    trigger: { type: 'ON_CLICK', delay: 0 },
    actions: [nodeAction()]
  }
}

function nodeAction(action: Partial<PrototypeNodeAction> = {}): PrototypeNodeAction {
  return {
    type: 'NODE',
    nodeId: null,
    navigation: 'NAVIGATE',
    transition: { type: 'INSTANT', duration: DEFAULT_TRANSITION_DURATION },
    overlayPosition: 'CENTER',
    ...action
  }
}

function replaceAction(reaction: PrototypeReaction, action: PrototypeAction): PrototypeReaction {
  return { ...reaction, actions: [action, ...reaction.actions.slice(1)] }
}

export function withReaction(
  reactions: readonly PrototypeReaction[],
  reaction: PrototypeReaction
): PrototypeReaction[] {
  return [...reactions, reaction]
}

export function withoutReaction(
  reactions: readonly PrototypeReaction[],
  id: string
): PrototypeReaction[] {
  return reactions.filter((reaction) => reaction.id !== id)
}

/**
 * The interaction with one change to its trigger or first action. `next` reads the interaction as
 * it is, so callers patch only the field they change.
 */
export function withReactionChange(
  reactions: readonly PrototypeReaction[],
  id: string,
  next: (reaction: PrototypeReaction) => PrototypeReaction
): PrototypeReaction[] {
  return reactions.map((reaction) => (reaction.id === id ? next(reaction) : reaction))
}

/** Whether a trigger waits a delay first: After delay, Mouse enter, and Mouse leave. */
export function triggerHasDelay(type: PrototypeTriggerType): boolean {
  return type === 'AFTER_TIMEOUT' || type === 'MOUSE_ENTER' || type === 'MOUSE_LEAVE'
}

/**
 * Keeps the delay while it stays a delayed trigger; a new After delay gets Figma's default one, a
 * new Mouse enter or leave none, and any other trigger drops it.
 */
export function setTriggerType(
  reaction: PrototypeReaction,
  type: PrototypeTriggerType
): PrototypeReaction {
  if (reaction.trigger.type === type) return reaction
  const kept = triggerHasDelay(reaction.trigger.type) ? reaction.trigger.delay : 0
  if (!triggerHasDelay(type)) return { ...reaction, trigger: { type, delay: 0 } }
  const delay = type === 'AFTER_TIMEOUT' ? kept || DEFAULT_TIMEOUT_DELAY : kept
  return { ...reaction, trigger: { type, delay } }
}

export function setDelay(reaction: PrototypeReaction, delay: number): PrototypeReaction {
  return { ...reaction, trigger: { ...reaction.trigger, delay } }
}

/** The first action as another kind; a node action kept its frame while it stays one. */
export function setActionType(
  reaction: PrototypeReaction,
  type: PrototypeActionType
): PrototypeReaction {
  const current = primaryAction(reaction)
  if (current?.type === type) return reaction
  return replaceAction(reaction, type === 'NODE' ? nodeAction() : { type })
}

export function setNavigation(
  reaction: PrototypeReaction,
  navigation: PrototypeNodeAction['navigation']
): PrototypeReaction {
  const current = primaryAction(reaction)
  if (current?.type !== 'NODE' || current.navigation === navigation) return reaction
  // A frame, a variant, and a layer to scroll to are different picks; one does not carry over.
  const sameKind = targetKind(current.navigation) === targetKind(navigation)
  return replaceAction(reaction, {
    ...current,
    navigation,
    nodeId: sameKind ? current.nodeId : null
  })
}

/** What a node action points at: a frame for a navigation or overlay, else a variant or a layer. */
function targetKind(navigation: PrototypeNavigationType): 'frame' | 'variant' | 'layer' {
  if (navigation === 'CHANGE_TO') return 'variant'
  return navigation === 'SCROLL_TO' ? 'layer' : 'frame'
}

export function setTarget(reaction: PrototypeReaction, nodeId: string | null): PrototypeReaction {
  const current = primaryAction(reaction)
  if (current?.type !== 'NODE') return reaction
  return replaceAction(reaction, { ...current, nodeId })
}

export function setTransition(
  reaction: PrototypeReaction,
  type: PrototypeTransitionType
): PrototypeReaction {
  const current = primaryAction(reaction)
  if (current?.type !== 'NODE') return reaction
  // The easing stays as it is: none plays as Figma's default, and keeps a file's spring intact.
  return replaceAction(reaction, {
    ...current,
    transition: { ...current.transition, type }
  })
}

export function setTransitionEasing(
  reaction: PrototypeReaction,
  easing: PrototypeEasingType
): PrototypeReaction {
  const current = primaryAction(reaction)
  if (current?.type !== 'NODE') return reaction
  return replaceAction(reaction, {
    ...current,
    transition: { ...current.transition, easing }
  })
}

export function setTransitionDuration(
  reaction: PrototypeReaction,
  duration: number
): PrototypeReaction {
  const current = primaryAction(reaction)
  if (current?.type !== 'NODE') return reaction
  return replaceAction(reaction, {
    ...current,
    transition: { ...current.transition, duration }
  })
}

/** The actions the panel offers: Figma's node actions and its two returns. */
export type ActionChoice = PrototypeNavigationType | 'BACK' | 'CLOSE'

export function actionChoice(reaction: PrototypeReaction): ActionChoice {
  const current = primaryAction(reaction)
  if (current?.type !== 'NODE') return current?.type ?? 'NAVIGATE'
  return current.navigation
}

export function setActionChoice(
  reaction: PrototypeReaction,
  choice: ActionChoice
): PrototypeReaction {
  if (choice === 'BACK' || choice === 'CLOSE') return setActionType(reaction, choice)
  return setNavigation(setActionType(reaction, 'NODE'), choice)
}
