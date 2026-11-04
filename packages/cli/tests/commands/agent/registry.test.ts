import { describe, expect, test } from 'bun:test'

import { ALL_TOOLS } from '@open-pencil/core/tools'
import { agentToolDefinitions } from '#cli/agent/policy'
import {
  AGENT_PROFILES,
  DEFAULT_AGENT_ID,
  agentPrompt,
  agentSystemPrompt,
  findAgentProfile,
  resolveAgentProfiles,
  toolsForAgent,
  type AgentRunRound
} from '#cli/agent/registry'

const offered = agentToolDefinitions({ catalog: ALL_TOOLS })
const namesFor = (id: string) => {
  const profile = findAgentProfile(id)
  if (!profile) throw new Error(`Unknown agent "${id}"`)
  return toolsForAgent(offered, profile).map((tool) => tool.name)
}

describe('agent registry', () => {
  test('defaults to the designer and never resolves an empty team', () => {
    expect(resolveAgentProfiles([]).map((profile) => profile.id)).toEqual([DEFAULT_AGENT_ID])
    expect(resolveAgentProfiles(['designer', 'reviewer']).map((profile) => profile.id)).toEqual([
      'designer',
      'reviewer'
    ])
  })
  test('refuses an unknown agent and names the known ones', () => {
    expect(() => resolveAgentProfiles(['painter'])).toThrow('Unknown agent "painter"')
    expect(() => resolveAgentProfiles(['painter'])).toThrow('designer, reviewer, typesetter')
  })
  test('keeps the designer at the full offered set', () => {
    expect(namesFor('designer')).toEqual(offered.map((tool) => tool.name))
  })
  test('limits the reviewer to tools that change nothing', () => {
    const reviewer = findAgentProfile('reviewer')
    if (!reviewer) throw new Error('Unknown agent "reviewer"')
    const tools = toolsForAgent(offered, reviewer)
    expect(tools.length).toBeGreaterThan(0)
    for (const tool of tools) expect(tool.execution.mutation).toBe('none')
    expect(tools.map((tool) => tool.name)).not.toContain('create_page')
  })
  test('limits the typesetter to its named tools and turns', () => {
    expect(namesFor('typesetter').sort()).toEqual(
      ['describe', 'find_nodes', 'get_node', 'get_selection', 'render', 'set_text', 'set_text_properties']
    )
    expect(findAgentProfile('typesetter')?.maxSteps).toBe(12)
  })
  test('cannot add a tool the run withheld', () => {
    const sneaky = { ...AGENT_PROFILES[0], id: 'sneaky', only: ['eval'] }
    expect(toolsForAgent(offered, sneaky)).toEqual([])
    expect(namesFor('reviewer')).not.toContain('eval')
  })
  test('tells each agent who it is and what came before it', () => {
    const reviewer = findAgentProfile('reviewer')
    if (!reviewer) throw new Error('Unknown agent "reviewer"')
    expect(agentSystemPrompt(reviewer, 'Base.')).toStartWith('Base. You are the reviewer:')
    expect(agentPrompt('Make it', [])).toBe('Make it')
    const rounds: AgentRunRound[] = [{ agent: 'designer', text: 'Added a card.', steps: 2, tools: [] }]
    const next = agentPrompt('Make it', rounds)
    expect(next).toContain('designer: Added a card.')
    expect(next).toStartWith('Make it')
  })
})
