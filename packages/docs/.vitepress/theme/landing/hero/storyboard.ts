/**
 * The hero's scene: a person asks an agent for the headline, and the agent draws its box, types
 * it, and answers her comment. Each step is a frame of the design's "Hero motion" storyboard,
 * which advances after the frame's hold. Kept free of Vue, so `bun test` can load it.
 */
export const HERO_STEPS = [
  'prompt',
  'pick',
  'draw',
  'size',
  'type1',
  'type2',
  'type3',
  'type4',
  'headline',
  'comment',
  'done'
] as const

export type HeroStep = (typeof HERO_STEPS)[number]

/** Seconds each frame holds before the next dissolves in; the last holds before the loop. */
export const STEP_HOLD: Record<HeroStep, number> = {
  prompt: 1.6,
  pick: 0.7,
  draw: 0.35,
  size: 0.6,
  type1: 0.3,
  type2: 0.3,
  type3: 0.35,
  type4: 0.3,
  headline: 0.9,
  comment: 1.1,
  done: 6
}

/** Seconds the finished scene takes to clear before the next loop starts. */
export const RESET_HOLD = 0.6

export const LAST_STEP = HERO_STEPS.length - 1

/** Later loops start with the agent picking its spot: the person asked once. */
export const LOOP_START = HERO_STEPS.indexOf('pick')

/** How far the agent has dragged the headline's box while drawing it, across and down. */
export const DRAW_FRACTION = 0.43

/** Where the agent's cursor points: the prompt it reads, or a corner of the headline's box. */
export type AgentAnchor = 'prompt' | 'start' | 'drawing' | 'end'

/** Who acts on the layer row the strip highlights; violet for the agent, orange for a person. */
export type Actor = 'agent' | 'human'

export interface HeroScene {
  /** What the agent says it is doing under the prompt; null once the prompt is gone. */
  status: 'reading' | 'adding' | 'writing' | null
  agent: AgentAnchor
  /** The headline's box: not drawn, being drawn, or at its size with handles and a label. */
  box: 'none' | 'drawing' | 'sized'
  /** How much of the headline is typed, from none to all. */
  typed: 'none' | 'letters' | 'word' | 'most' | 'nearly' | 'all'
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

const TYPED: HeroScene['typed'][] = ['letters', 'word', 'most', 'nearly']

/** The step's place in `HERO_STEPS`. */
const at = (name: HeroStep) => HERO_STEPS.indexOf(name)

function statusAt(step: number): HeroScene['status'] {
  if (step === at('prompt')) return 'reading'
  if (step < at('type1')) return 'adding'
  return step < at('headline') ? 'writing' : null
}

/** The agent reads the prompt, picks the box's corner, drags it, then works at its far corner. */
const AGENT_AT: Partial<Record<HeroStep, AgentAnchor>> = {
  prompt: 'prompt',
  pick: 'start',
  draw: 'drawing'
}

function boxAt(step: number): HeroScene['box'] {
  if (step < at('draw')) return 'none'
  return step === at('draw') ? 'drawing' : 'sized'
}

/** The person comments, then the agent replies; until then the agent works on the heading. */
function activeAt(step: number): HeroScene['active'] {
  if (step === at('comment')) return { layer: 'comment', actor: 'human' }
  if (step === at('done')) return { layer: 'comment', actor: 'agent' }
  return { layer: 'heading', actor: 'agent' }
}

/** The scene at step `index` of `HERO_STEPS`. */
export function heroScene(index: number): HeroScene {
  const step = Math.min(Math.max(index, 0), LAST_STEP)
  const name = HERO_STEPS.at(step)
  return {
    status: statusAt(step),
    agent: (name && AGENT_AT[name]) ?? 'end',
    box: boxAt(step),
    typed: step < at('type1') ? 'none' : (TYPED[step - at('type1')] ?? 'all'),
    lead: step >= at('headline'),
    human: step >= at('comment'),
    comment: step >= at('comment'),
    reply: step >= at('done'),
    actions: step >= at('done'),
    active: activeAt(step),
    layers: {
      heading: step >= at('pick'),
      comment: step >= at('comment'),
      lead: step >= at('headline')
    }
  }
}

/** The headline as typed so far: a few letters, the first word, then word by word. */
export function typedHeadline(title: string, typed: HeroScene['typed']): string {
  const words = title.split(' ')
  const first = words[0] ?? ''
  switch (typed) {
    case 'none':
      return ''
    case 'letters':
      return first.slice(0, 3)
    case 'word':
      return first
    case 'most':
      return words.slice(0, Math.ceil(words.length * 0.6)).join(' ')
    case 'nearly':
      return words.slice(0, Math.max(words.length - 1, 1)).join(' ')
    case 'all':
      return title
  }
  return title
}
