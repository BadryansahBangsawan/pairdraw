/**
 * The hero's scene: the copy is already on the frame, and the agent draws its selection around
 * it and answers the person's comment. Starting from the finished copy keeps the headline, lead
 * and buttons in the first paint, while the agent still acts on them. Each step is a frame of the
 * design's "Hero motion" storyboard, held for its time. Kept free of Vue, so `bun test` can load it.
 */
export const HERO_STEPS = ['draw', 'size', 'comment', 'done'] as const

export type HeroStep = (typeof HERO_STEPS)[number]

/** Seconds each frame holds before the next dissolves in; the last holds before the loop. */
export const STEP_HOLD: Record<HeroStep, number> = {
  draw: 0.5,
  size: 0.4,
  comment: 1.5,
  done: 6
}

/** Seconds the finished scene takes to clear before the next loop starts. */
export const RESET_HOLD = 0.6

export const LAST_STEP = HERO_STEPS.length - 1

/** Later loops draw the box again around the copy that is already there. */
export const LOOP_START = 0

/** How far the agent has dragged the headline's box while drawing it, across and down. */
export const DRAW_FRACTION = 0.43

/** Where the agent's cursor points: a corner of the headline's box. */
export type AgentAnchor = 'drawing' | 'end'

/** Who acts on the layer row the strip highlights; violet for the agent, orange for a person. */
export type Actor = 'agent' | 'human'

export interface HeroScene {
  agent: AgentAnchor
  /** The headline's box: being drawn, or at its size with handles and a label. */
  box: 'drawing' | 'sized'
  lead: boolean
  /** The person's cursor, her comment, and the agent's reply to it. */
  human: boolean
  comment: boolean
  reply: boolean
  /** The buttons and the line under them. */
  actions: boolean
  /** The layer row being worked on, and by whom. */
  active: { layer: 'heading' | 'comment'; actor: Actor }
  /** Layer rows that exist yet; the others wait, dimmed. */
  layers: { heading: boolean; comment: boolean; lead: boolean }
}

/** The step's place in `HERO_STEPS`. */
const at = (name: HeroStep) => HERO_STEPS.indexOf(name)

/** The copy is on the frame from the first step; the agent only acts on it. */
export function heroScene(index: number): HeroScene {
  const step = Math.min(Math.max(index, 0), LAST_STEP)
  const name = HERO_STEPS.at(step)
  return {
    agent: name === 'draw' ? 'drawing' : 'end',
    box: name === 'draw' ? 'drawing' : 'sized',
    lead: true,
    human: step >= at('comment'),
    comment: step >= at('comment'),
    reply: step >= at('done'),
    actions: true,
    active:
      step >= at('comment')
        ? { layer: 'comment', actor: step >= at('done') ? 'agent' : 'human' }
        : { layer: 'heading', actor: 'agent' },
    layers: { heading: true, comment: step >= at('comment'), lead: true }
  }
}
