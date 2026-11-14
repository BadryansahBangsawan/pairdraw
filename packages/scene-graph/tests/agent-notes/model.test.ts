import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import {
  AGENT_NOTE_MAX_LENGTH,
  agentNotesFromDraft,
  readAgentNotes,
  withAgentNotes
} from '@pairdraw/scene-graph/agent-notes'
import { PAIRDRAW_PLUGIN_ID } from '@pairdraw/scene-graph/plugin-data'

function frame() {
  const graph = new SceneGraph()
  const node = graph.createNode('FRAME', graph.getPages()[0].id, { name: 'Button' })
  return { graph, node }
}

describe('agent notes', () => {
  test('a layer keeps its notes as plugin data and reads them back', () => {
    const { graph, node } = frame()
    graph.updateNode(node.id, {
      pluginData: withAgentNotes(node, { context: '  Opens the sign-up dialog ', prompt: '' })
    })
    const stored = graph.getNode(node.id)
    expect(stored && readAgentNotes(stored)).toEqual({ context: 'Opens the sign-up dialog' })
  })

  test('blank notes remove the entry and keep other plugin data', () => {
    const { graph, node } = frame()
    const other = { pluginId: 'someone-else', key: 'k', value: 'v' }
    graph.updateNode(node.id, {
      pluginData: [other, ...withAgentNotes(node, { prompt: 'Make it louder' })]
    })
    const noted = graph.getNode(node.id)
    if (!noted) throw new Error('missing node')
    expect(readAgentNotes(noted)).toEqual({ prompt: 'Make it louder' })

    graph.updateNode(node.id, { pluginData: withAgentNotes(noted, { context: ' ', prompt: '' }) })
    const cleared = graph.getNode(node.id)
    expect(cleared && readAgentNotes(cleared)).toBeNull()
    expect(cleared?.pluginData).toEqual([other])
  })

  test('a long note is cut to the length agents read rather than refused', () => {
    const notes = agentNotesFromDraft({ context: 'a'.repeat(AGENT_NOTE_MAX_LENGTH + 50) })
    expect(notes?.context?.length).toBe(AGENT_NOTE_MAX_LENGTH)
  })

  test('a draft reads as stored, without blank notes', () => {
    expect(agentNotesFromDraft({ context: ' Opens checkout ', prompt: '' })).toStrictEqual({
      context: 'Opens checkout'
    })
  })

  test('blank drafts are no notes', () => {
    expect(agentNotesFromDraft({})).toBeNull()
    expect(agentNotesFromDraft({ context: '\n ', prompt: '' })).toBeNull()
  })

  test('unreadable stored notes read as none', () => {
    const { node } = frame()
    const pluginData = [{ pluginId: PAIRDRAW_PLUGIN_ID, key: 'agentNotes', value: '{"bad":' }]
    expect(readAgentNotes({ pluginData })).toBeNull()
    expect(readAgentNotes({ pluginData: [{ ...pluginData[0], value: '{}' }] })).toBeNull()
    expect(readAgentNotes(node)).toBeNull()
  })
})
