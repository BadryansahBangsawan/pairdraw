import type { Client, Tool as MCPTool } from '@modelcontextprotocol/client'
import {
  dynamicTool,
  getToolName,
  isToolUIPart,
  jsonSchema,
  type JSONSchema7,
  type ToolResultPart,
  type ToolSet,
  type UIMessage
} from 'ai'
import * as v from 'valibot'

import type { MCPConnection } from '../types'

/** One connected server's tools, as the chat offers them. */
export interface MCPServerTools {
  connection: MCPConnection
  client: Pick<Client, 'callTool'>
  tools: MCPTool[]
}

/** A call the person may be asked to approve first, as per-action approval does. */
export interface MCPToolCallRequest {
  /** The name the model calls, `mcp__<server>__<tool>`. */
  name: string
  server: string
  tool: string
  input: Record<string, unknown>
  toolCallId: string
  /** Whether the server says the tool only reads. */
  readOnly: boolean
}

export interface MCPChatToolOptions {
  /** Resolves false to decline the call; every call runs when it is absent. */
  approve?: (request: MCPToolCallRequest) => Promise<boolean>
}

/** Prefix of every external tool's name; the chat's tool rows strip it (`tool-calls/display.ts`). */
const MCP_TOOL_PREFIX = 'mcp__'
/** The longest tool name every provider accepts. */
const MAX_TOOL_NAME_LENGTH = 64
const MAX_SERVER_SLUG_LENGTH = 20
/** Longer text from a server is cut, so one result cannot fill the model's context. */
const MAX_RESULT_TEXT_LENGTH = 50_000

/** What the model reads when the person declined a call. */
const MCP_TOOL_DECLINED =
  'The user declined this action, so nothing was done. Do not retry it; ask what to do instead.'

/** The server's part of a tool name: lowercase letters, digits, and dashes, never underscores. */
function mcpServerSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SERVER_SLUG_LENGTH)
    .replace(/-+$/, '')
  return slug || 'server'
}

function toolNamePart(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]/g, '_') || 'tool'
}

/** The name the model calls a server's tool by, unique within `taken`. */
export function mcpChatToolName(server: string, tool: string, taken: Set<string>): string {
  const base = `${MCP_TOOL_PREFIX}${mcpServerSlug(server)}__${toolNamePart(tool)}`.slice(
    0,
    MAX_TOOL_NAME_LENGTH
  )
  let name = base
  for (let suffix = 2; taken.has(name); suffix++) {
    const tail = `_${suffix}`
    name = `${base.slice(0, MAX_TOOL_NAME_LENGTH - tail.length)}${tail}`
  }
  return name
}

/** Providers need an object schema with properties, which a tool taking nothing may omit. */
function inputSchema(tool: MCPTool): JSONSchema7 {
  const { properties, ...rest } = tool.inputSchema
  // The server's JSON Schema, typed by the MCP SDK as plain JSON values.
  const schema = rest as JSONSchema7
  return {
    ...schema,
    type: 'object',
    properties: (properties ?? {}) as NonNullable<JSONSchema7['properties']>
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const contentSchema = v.variant('type', [
  v.object({ type: v.literal('text'), text: v.string() }),
  v.object({ type: v.literal('image'), data: v.string(), mimeType: v.string() }),
  v.object({ type: v.literal('audio'), data: v.string(), mimeType: v.string() }),
  v.object({
    type: v.literal('resource'),
    resource: v.looseObject({ uri: v.string(), text: v.optional(v.string()) })
  }),
  v.object({ type: v.literal('resource_link'), uri: v.string(), name: v.optional(v.string()) })
])
const toolResultSchema = v.looseObject({
  content: v.optional(v.array(v.unknown())),
  structuredContent: v.optional(v.unknown()),
  isError: v.optional(v.boolean())
})

type ModelOutput = ToolResultPart['output']
type ModelContent = Extract<ModelOutput, { type: 'content' }>['value'][number]

function clip(text: string): string {
  return text.length > MAX_RESULT_TEXT_LENGTH
    ? `${text.slice(0, MAX_RESULT_TEXT_LENGTH)}\n[truncated]`
    : text
}

function modelContent(item: unknown): ModelContent | null {
  const parsed = v.safeParse(contentSchema, item)
  if (!parsed.success) return null
  const content = parsed.output
  if (content.type === 'text') return { type: 'text', text: clip(content.text) }
  if (content.type === 'image' || content.type === 'audio') {
    return { type: 'file', mediaType: content.mimeType, data: { type: 'data', data: content.data } }
  }
  if (content.type === 'resource') {
    return { type: 'text', text: clip(content.resource.text ?? `Resource ${content.resource.uri}`) }
  }
  return { type: 'text', text: `Resource ${content.name ?? ''} ${content.uri}`.trim() }
}

/** The text of a result, as an error message or a fallback. */
function resultText(result: unknown): string {
  const parsed = v.safeParse(toolResultSchema, result)
  if (!parsed.success) return ''
  return (parsed.output.content ?? [])
    .flatMap((item) => {
      const content = modelContent(item)
      return content?.type === 'text' ? [content.text] : []
    })
    .join('\n')
}

/** A tool result as the model reads it: text and media, or the structured result as JSON. */
export function mcpModelOutput(result: unknown): ModelOutput {
  const parsed = v.safeParse(toolResultSchema, result)
  if (!parsed.success) return { type: 'text', value: clip(String(result)) }
  const content = (parsed.output.content ?? []).flatMap((item) => {
    const converted = modelContent(item)
    return converted ? [converted] : []
  })
  if (content.length > 0) return { type: 'content', value: content }
  const { structuredContent } = parsed.output
  if (structuredContent !== undefined) {
    return { type: 'text', value: clip(JSON.stringify(structuredContent)) }
  }
  return { type: 'text', value: '' }
}

/**
 * Offers each connected server's tools to the chat's model as dynamic tools named
 * `mcp__<server>__<tool>`. A call goes to that server; a result it marks as an error fails the
 * call, so the model sees it as one.
 */
export function buildMCPChatTools(
  servers: MCPServerTools[],
  { approve }: MCPChatToolOptions = {}
): ToolSet {
  const tools: ToolSet = {}
  const taken = new Set<string>()
  for (const { connection, client, tools: serverTools } of servers) {
    for (const tool of serverTools) {
      const name = mcpChatToolName(connection.name, tool.name, taken)
      taken.add(name)
      const description = tool.description ?? tool.title ?? tool.name
      tools[name] = dynamicTool({
        description: `${description}\n\n(Tool “${tool.name}” of the MCP server “${connection.name}”.)`,
        inputSchema: jsonSchema(inputSchema(tool)),
        execute: async (input, { abortSignal, toolCallId }) => {
          const args = isRecord(input) ? input : {}
          const allowed = approve
            ? await approve({
                name,
                server: connection.name,
                tool: tool.name,
                input: args,
                toolCallId,
                readOnly: tool.annotations?.readOnlyHint === true
              })
            : true
          if (!allowed) return { content: [{ type: 'text', text: MCP_TOOL_DECLINED }] }
          const result = await client.callTool(
            { name: tool.name, arguments: args },
            abortSignal ? { signal: abortSignal } : undefined
          )
          if (result.isError) throw new Error(resultText(result) || 'The MCP tool failed.')
          return result
        },
        toModelOutput: ({ output }) => mcpModelOutput(output)
      })
    }
  }
  return tools
}

/**
 * Stand-ins for the external tools that earlier messages called, for converting history only:
 * their results reach the model in the same form as when they were new (media as files, long
 * text cut), even after the server was disconnected, renamed, or turned off. Never offered.
 */
export function mcpHistoryTools(messages: UIMessage[]): ToolSet {
  const tools: ToolSet = {}
  for (const message of messages) {
    for (const part of message.parts) {
      if (!isToolUIPart(part)) continue
      const name = getToolName(part)
      if (!name.startsWith(MCP_TOOL_PREFIX) || name in tools) continue
      tools[name] = dynamicTool({
        description: 'An external MCP tool an earlier message called.',
        inputSchema: jsonSchema({ type: 'object', properties: {} }),
        execute: async () => {
          throw new Error('This MCP tool is no longer available.')
        },
        toModelOutput: ({ output }) => mcpModelOutput(output)
      })
    }
  }
  return tools
}
