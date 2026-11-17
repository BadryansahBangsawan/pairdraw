import { compact } from 'es-toolkit/array'

import { SKILL_NAME, skillResourceURI } from '#mcp/skill/content'
import { createToolDescriptors } from '#mcp/tool/manifest'
import type { ToolPolicy } from '#mcp/tool/metadata'
import { isToolEnabled } from '#mcp/tool/policy'
import type { MCPAgentKind } from '#mcp/tool/registration'

export interface ServerInstructionsOptions {
  policy: ToolPolicy
  /** Whether an MCP root exposes the file tools, as `registerTools` decides. */
  filesystemEnabled: boolean
  /** Who the session serves: an external client, or an app chat whose prompt already has the reference. */
  agentKind: MCPAgentKind
}

const SKILL_FILE_URI = skillResourceURI('SKILL.md')
const REFERENCE_PATH = 'references/design-authoring.md'
const REFERENCE_URI = skillResourceURI(REFERENCE_PATH)

function skillParagraph(enabled: (name: string) => boolean): string {
  const designs = enabled('render')
  const lead = designs ? 'Before you design' : 'Before you use these tools'
  if (!enabled('read_skill')) {
    return `${lead}, read the ${SKILL_NAME} skill from the resources ${SKILL_FILE_URI} and ${REFERENCE_URI}.`
  }
  const reference = designs ? ' before you use render' : ''
  return `${lead}, read the ${SKILL_NAME} skill: call read_skill for SKILL.md, then read_skill with path "${REFERENCE_PATH}"${reference}. Clients without that tool can read the same files as the resources ${SKILL_FILE_URI} and ${REFERENCE_URI}.`
}

function closedRecovery(enabled: (name: string) => boolean): string {
  const actions = compact([
    enabled('new_document') && 'new_document',
    enabled('open_file') && 'open_file'
  ])
  if (actions.length === 0) return ''
  return ` After that document is closed, pass document_id from list_documents, or call ${actions.join(' or ')}.`
}

function usageParagraph(enabled: (name: string) => boolean, policy: ToolPolicy): string {
  const undo = enabled('undo')
  return compact([
    enabled('list_documents') &&
      `When several documents may be open, call list_documents first and pass its document_id and page_id to later calls. Each session keeps the document it edits. Home is not a document. Closing without document_id only closes a document this session opened.${closedRecovery(enabled)}`,
    policy.scope === 'document' &&
      enabled('export_image') &&
      'Check visual changes with export_image.',
    undo && `${enabled('redo') ? 'undo and redo step' : 'undo steps'} back only your own changes.`,
    enabled('get_codegen_prompt') &&
      'Call get_codegen_prompt before turning a design into frontend code.'
  ]).join(' ')
}

/**
 * What the server tells a client when it connects, naming only the tools its policy and scope
 * expose. Clients such as Codex show only the start of it, so the first paragraphs stand on their
 * own and stay under 512 characters. App chats get no skill paragraph: their system prompt already
 * carries the design authoring reference.
 */
export function createServerInstructions({
  policy,
  filesystemEnabled,
  agentKind
}: ServerInstructionsOptions): string {
  const exposed = new Set(
    createToolDescriptors(filesystemEnabled)
      .filter((descriptor) => isToolEnabled(descriptor, policy))
      .map((descriptor) => descriptor.name)
  )
  const enabled = (name: string) => exposed.has(name)
  return compact([
    policy.scope === 'selection'
      ? 'Pairdraw is a design editor. These tools read only the layers selected in its running app and cannot change the document.'
      : 'Pairdraw is a design editor. These tools read and edit the documents open in its running app.',
    agentKind === 'mcp' && skillParagraph(enabled),
    usageParagraph(enabled, policy)
  ]).join('\n\n')
}
