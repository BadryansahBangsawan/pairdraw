import type { ToolDef } from '@pairdraw/core/tools'

/**
 * A named agent a run can put in a team. Each one works the same prompt from its own role, over
 * one shared, headless document, in the order the run names it.
 *
 * A profile can only narrow what the run allows. It names no tool of its own beyond a subset the
 * run already offers, so it can never grant `eval` or a network call, and the run's `--allow` and
 * `--deny` still decide everything else.
 */
export interface AgentProfile {
  id: string
  /** One line for `pairdraw agent list`. */
  description: string
  /** What this agent is told it is, appended to the run's system prompt. */
  systemPrompt: string
  /** Only tools that leave the document unchanged, for an agent that reviews rather than edits. */
  readOnly: boolean
  /**
   * The only tools this agent may call, when it works on part of a design. Omit to keep every
   * tool the run offers.
   */
  only?: readonly string[]
  /** Tools withheld from this agent even when the run offers them. */
  deny: readonly string[]
  /** This agent's own step ceiling, when the run's is too many turns for its job. */
  maxSteps?: number
}

/** The agent a run starts with when it names no `--agent`. */
export const DEFAULT_AGENT_ID = 'designer'

/** The text tools a typesetter works with, beside the reads it needs to find them. */
const TYPESETTER_TOOLS = [
  'get_selection',
  'get_node',
  'find_nodes',
  'describe',
  'render',
  'set_text',
  'set_text_properties'
] as const

export const AGENT_PROFILES: readonly AgentProfile[] = [
  {
    id: 'designer',
    description: 'Edits the document with every tool the run offers',
    systemPrompt: 'You are the designer: make the change the prompt asks for in the document.',
    readOnly: false,
    deny: []
  },
  {
    id: 'reviewer',
    description: 'Reads the document and reports what needs changing, without editing it',
    systemPrompt:
      'You are the reviewer: inspect the document and report what is missing or wrong. You cannot change it, so state precisely what the designer should fix.',
    readOnly: true,
    deny: []
  },
  {
    id: 'typesetter',
    description: 'Corrects text content and text properties, leaving every other property alone',
    systemPrompt:
      'You are the typesetter: correct text content and text properties. Leave layer structure, fills, and geometry to the designer.',
    readOnly: false,
    only: TYPESETTER_TOOLS,
    deny: [],
    maxSteps: 12
  }
]

/** The profile an id names. */
export function findAgentProfile(id: string): AgentProfile | undefined {
  return AGENT_PROFILES.find((profile) => profile.id === id)
}

/**
 * The agents a run names, in order, or the default agent when it names none. An unknown id fails
 * the run rather than quietly running a different agent.
 */
export function resolveAgentProfiles(ids: readonly string[]): AgentProfile[] {
  const named = ids.length === 0 ? [DEFAULT_AGENT_ID] : ids
  return named.map((id) => {
    const profile = findAgentProfile(id)
    if (profile) return profile
    const known = AGENT_PROFILES.map((candidate) => candidate.id).join(', ')
    throw new Error(`Unknown agent "${id}"; choose from: ${known}`)
  })
}

/**
 * The tools one agent may call: the run's tools, narrowed by the agent's role. Intersecting keeps
 * the run as the only source of permission, so a profile added later cannot widen it.
 */
export function toolsForAgent(tools: readonly ToolDef[], profile: AgentProfile): ToolDef[] {
  const only = profile.only === undefined ? null : new Set(profile.only)
  const denied = new Set(profile.deny)
  return tools.filter(
    (tool) =>
      (only === null || only.has(tool.name)) &&
      !denied.has(tool.name) &&
      (!profile.readOnly || tool.execution.mutation === 'none')
  )
}

/** The system prompt one agent works from. */
export function agentSystemPrompt(profile: AgentProfile, base: string): string {
  return `${base} ${profile.systemPrompt}`
}

/**
 * What an agent in a team is asked: the run's prompt, and what the agents before it reported, so
 * a reviewer reviews real work and a second editor does not repeat the first.
 */
export function agentPrompt(prompt: string, previous: readonly AgentRunRound[]): string {
  const reports = previous
    .map((round) => `${round.agent}: ${round.text.trim() || '(no comment)'}`)
    .join('\n')
  return previous.length === 0 ? prompt : `${prompt}\n\nAgents before you in this run:\n${reports}`
}

/** One agent's turn in a team run. */
export interface AgentRunRound {
  agent: string
  text: string
  steps: number
  tools: Array<{ name: string; ok: boolean; error?: string }>
}
