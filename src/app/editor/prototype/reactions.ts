import type {
  PrototypeAction,
  PrototypeActionType,
  PrototypeNodeAction,
  PrototypeOverlayPositionType,
  PrototypeReaction,
  PrototypeTransitionType,
  PrototypeTriggerType
} from '@open-pencil/scene-graph'
import { generateId } from '@open-pencil/scene-graph'

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

/** The interaction the panel edits: the first action, which this version edits alone. */
export function primaryAction(reaction: PrototypeReaction): PrototypeAction | null {
  return reaction.actions[0] ?? null
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

/** Keeps the delay when it stays a delay, and gives a new timeout Figma's default one. */
export function setTriggerType(
  reaction: PrototypeReaction,
  type: PrototypeTriggerType
): PrototypeReaction {
  if (reaction.trigger.type === type) return reaction
  const delay = type === 'AFTER_TIMEOUT' ? reaction.trigger.delay || DEFAULT_TIMEOUT_DELAY : 0
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
  if (current?.type !== 'NODE') return reaction
  return replaceAction(reaction, { ...current, navigation })
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
  return replaceAction(reaction, {
    ...current,
    transition: { ...current.transition, type }
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

/** The four actions the panel offers: Figma's two navigation kinds and its two returns. */
export type ActionChoice = 'NAVIGATE' | 'OVERLAY' | 'BACK' | 'CLOSE'

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

export function setOverlayPosition(
  reaction: PrototypeReaction,
  overlayPosition: PrototypeOverlayPositionType
): PrototypeReaction {
  const current = primaryAction(reaction)
  if (current?.type !== 'NODE') return reaction
  return replaceAction(reaction, { ...current, overlayPosition })
}
