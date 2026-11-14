import { omitBy } from 'es-toolkit/object'
import * as v from 'valibot'

import { readPluginData, withPluginData } from '../plugin-data/field'
import { PAIRDRAW_PLUGIN_DATA } from '../plugin-data/fields'
import type { SceneNode } from '../types'
import { AGENT_NOTE_MAX_LENGTH, agentNotesSchema, type AgentNotes } from './schema'

/** Notes as a form edits them: any field may be blank, which leaves that note out. */
export interface AgentNotesDraft {
  context?: string
  prompt?: string
}

/** The notes a layer carries for agents, or null when it has none or they are unreadable. */
export function readAgentNotes(node: Pick<SceneNode, 'pluginData'>): AgentNotes | null {
  return readPluginData(node.pluginData, PAIRDRAW_PLUGIN_DATA.agentNotes) ?? null
}

/** `text` cut to the length an agent reads, so a long paste is kept rather than refused. */
export function clampAgentNote(text: string): string {
  return text.trim().slice(0, AGENT_NOTE_MAX_LENGTH).trim()
}

/**
 * The notes a draft holds, trimmed and cut to length, or null when every note is blank. Blank
 * notes are left out rather than kept as `undefined`, so the result equals what reading it back
 * from plugin data gives.
 */
export function agentNotesFromDraft(draft: AgentNotesDraft): AgentNotes | null {
  const notes = omitBy(
    { context: clampAgentNote(draft.context ?? ''), prompt: clampAgentNote(draft.prompt ?? '') },
    (note) => note === ''
  )
  const parsed = v.safeParse(agentNotesSchema, notes)
  return parsed.success ? parsed.output : null
}

/** The node's plugin data with its notes replaced by the draft's, or removed when it is blank. */
export function withAgentNotes(
  node: Pick<SceneNode, 'pluginData'>,
  draft: AgentNotesDraft | null
): SceneNode['pluginData'] {
  const notes = draft ? agentNotesFromDraft(draft) : null
  return withPluginData(node.pluginData, PAIRDRAW_PLUGIN_DATA.agentNotes, notes ?? undefined)
}
