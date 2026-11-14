import { isEqual, uniq } from 'es-toolkit'
import * as v from 'valibot'
import { computed, ref, toRaw, watch } from 'vue'

import { appCredentialServices } from '@/app/settings/credentials/app'
import { credentialRef } from '@/app/settings/credentials/reference'
import type { CredentialRef, CredentialStatus } from '@/app/settings/credentials/types'

import { isAllowedMCPEnvName, parseMCPArguments } from './stdio/env'
import { readMCPConnectionSettingsStorage, writeMCPConnectionSettingsStorage } from './storage'
import type {
  MCPAuthentication,
  MCPConnection,
  MCPConnectionDraft,
  MCPConnectionID,
  MCPConnectionSettings,
  MCPConnectionTransport
} from './types'

export const MCP_CONNECTION_NAME_MAX_LENGTH = 80
const MAX_URL_LENGTH = 2048
const MAX_COMMAND_LENGTH = 1024
const MAX_ARGUMENTS = 64
const MAX_ARGUMENT_LENGTH = 4096
const MCP_CONNECTION_ID_PATTERN = /^mcp-[a-z0-9._-]{1,60}$/

const storedCredentialRefSchema = v.object({
  integrationId: v.string(),
  profileId: v.string(),
  field: v.string()
})
const storedAuthenticationSchema = v.variant('type', [
  v.object({ type: v.literal('bearer'), credentialRef: storedCredentialRefSchema }),
  v.object({ type: v.literal('oauth'), credentialRef: storedCredentialRefSchema })
])

/**
 * A stored credential counts only when it points at this connection's own credential; a local
 * command authenticates through its environment instead.
 */
function parseAuthentication(
  value: unknown,
  id: MCPConnectionID,
  transport: MCPConnectionTransport
): MCPAuthentication {
  if (transport.type === 'stdio') return { type: 'none' }
  const stored = v.safeParse(storedAuthenticationSchema, value)
  if (!stored.success) return { type: 'none' }
  const expected =
    stored.output.type === 'bearer'
      ? mcpConnectionCredentialRef(id)
      : mcpConnectionOAuthCredentialRef(id)
  return isEqual(stored.output.credentialRef, expected)
    ? { type: stored.output.type, credentialRef: expected }
    : { type: 'none' }
}

const transportSchema = v.variant('type', [
  v.object({
    type: v.literal('streamable-http'),
    url: v.pipe(
      v.string(),
      v.trim(),
      v.check((url) => isValidMCPConnectionURL(url))
    )
  }),
  v.object({
    type: v.literal('stdio'),
    command: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(MAX_COMMAND_LENGTH)),
    args: v.fallback(
      v.pipe(
        v.array(v.pipe(v.string(), v.maxLength(MAX_ARGUMENT_LENGTH))),
        v.maxLength(MAX_ARGUMENTS)
      ),
      []
    ),
    envNames: v.fallback(
      v.pipe(
        v.array(v.string()),
        v.transform((names) => uniq(names.filter(isAllowedMCPEnvName)))
      ),
      []
    )
  })
])

const connectionSchema = v.object({
  id: v.pipe(v.string(), v.regex(MCP_CONNECTION_ID_PATTERN)),
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1),
    v.transform((name) => name.slice(0, MCP_CONNECTION_NAME_MAX_LENGTH))
  ),
  enabled: v.fallback(v.boolean(), false),
  transport: transportSchema,
  authentication: v.optional(v.unknown())
})

function parseConnection(value: unknown): MCPConnection | null {
  const parsed = v.safeParse(connectionSchema, value)
  if (!parsed.success) return null
  const { authentication, ...connection } = parsed.output
  const id = connection.id as MCPConnectionID
  return {
    ...connection,
    id,
    authentication: parseAuthentication(authentication, id, connection.transport)
  }
}

const settingsSchema = v.object({ version: v.literal(1), connections: v.array(v.unknown()) })

export function parseMCPConnectionSettings(value: unknown): MCPConnectionSettings {
  const settings = v.safeParse(settingsSchema, value)
  if (!settings.success) return { version: 1, connections: [] }
  const connections: MCPConnection[] = []
  const ids = new Set<string>()
  const names = new Set<string>()
  for (const candidate of settings.output.connections) {
    const connection = parseConnection(candidate)
    if (!connection || ids.has(connection.id)) continue
    const normalizedName = connection.name.toLowerCase()
    if (normalizedName === 'pairdraw' || names.has(normalizedName)) continue
    ids.add(connection.id)
    names.add(normalizedName)
    connections.push(connection)
  }
  return { version: 1, connections }
}

function isValidMCPConnectionURL(url: string): boolean {
  try {
    validateMCPConnectionURL(url)
    return true
  } catch {
    return false
  }
}

export function validateMCPConnectionURL(value: string): URL {
  if (!value || value.length > MAX_URL_LENGTH) throw new Error('Enter a valid MCP server URL')
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Enter a valid MCP server URL')
  }
  if (url.username || url.password) throw new Error('MCP server URLs cannot contain credentials')
  const loopback =
    url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]'
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error('MCP servers must use HTTPS, except on loopback addresses')
  }
  return url
}

/** Whether a local command line can be saved: a program and at most a few dozen arguments. */
export function isValidMCPCommand(command: string, args: string[] = []): boolean {
  const program = command.trim()
  return (
    program.length > 0 &&
    program.length <= MAX_COMMAND_LENGTH &&
    args.length <= MAX_ARGUMENTS &&
    args.every((arg) => arg.length <= MAX_ARGUMENT_LENGTH)
  )
}

export const mcpConnectionSettings = ref<MCPConnectionSettings>(
  parseMCPConnectionSettings(readMCPConnectionSettingsStorage())
)

watch(mcpConnectionSettings, (settings) => writeMCPConnectionSettingsStorage(settings), {
  deep: true
})

export const enabledMCPConnections = computed(() =>
  mcpConnectionSettings.value.connections.filter((connection) => connection.enabled)
)

export function mcpConnectionCredentialRef(id: MCPConnectionID): CredentialRef {
  return credentialRef('mcp', 'bearer-token', id)
}

/** The connection's OAuth client registration and tokens, as one JSON credential. */
export function mcpConnectionOAuthCredentialRef(id: MCPConnectionID): CredentialRef {
  return credentialRef('mcp', 'oauth', id)
}

/** The values of a local command's environment variables, as one JSON credential. */
export function mcpConnectionEnvCredentialRef(id: MCPConnectionID): CredentialRef {
  return credentialRef('mcp', 'env', id)
}

/** Every credential a connection may own, which removing it clears. */
export function mcpConnectionCredentialRefs(id: MCPConnectionID): CredentialRef[] {
  return [
    mcpConnectionCredentialRef(id),
    mcpConnectionOAuthCredentialRef(id),
    mcpConnectionEnvCredentialRef(id)
  ]
}

export function createMCPConnectionDraft(connection?: MCPConnection): MCPConnectionDraft {
  const transport = connection?.transport
  return {
    id: connection?.id ?? null,
    name: connection?.name ?? '',
    enabled: connection?.enabled ?? false,
    transportType: transport?.type ?? 'streamable-http',
    url: transport?.type === 'streamable-http' ? transport.url : '',
    command: transport?.type === 'stdio' ? transport.command : '',
    args: transport?.type === 'stdio' ? transport.args.join('\n') : '',
    authenticationType: connection?.authentication.type ?? 'none'
  }
}

export interface SaveMCPConnectionOptions {
  /** The names of the local command's variables when they change; kept otherwise. */
  envNames?: string[]
}

function draftTransport(
  draft: MCPConnectionDraft,
  previous: MCPConnection | undefined,
  options: SaveMCPConnectionOptions
): MCPConnectionTransport {
  if (draft.transportType === 'streamable-http') {
    return {
      type: 'streamable-http',
      url: validateMCPConnectionURL(draft.url.trim()).toString()
    }
  }
  const args = parseMCPArguments(draft.args)
  if (!isValidMCPCommand(draft.command, args)) throw new Error('Enter the command to run')
  const previousNames = previous?.transport.type === 'stdio' ? previous.transport.envNames : []
  const envNames = options.envNames ?? previousNames
  if (!envNames.every(isAllowedMCPEnvName)) throw new Error('Environment variable is not allowed')
  return { type: 'stdio', command: draft.command.trim(), args, envNames: uniq(envNames) }
}

function draftAuthentication(
  draft: MCPConnectionDraft,
  id: MCPConnectionID,
  transport: MCPConnectionTransport
): MCPAuthentication {
  if (transport.type === 'stdio') return { type: 'none' }
  if (draft.authenticationType === 'bearer') {
    return { type: 'bearer', credentialRef: mcpConnectionCredentialRef(id) }
  }
  if (draft.authenticationType === 'oauth') {
    return { type: 'oauth', credentialRef: mcpConnectionOAuthCredentialRef(id) }
  }
  return { type: 'none' }
}

export function saveMCPConnectionDraft(
  draft: MCPConnectionDraft,
  options: SaveMCPConnectionOptions = {}
): MCPConnection {
  const name = draft.name.trim()
  if (!name) throw new Error('Connection name is required')
  if (name.length > MCP_CONNECTION_NAME_MAX_LENGTH) throw new Error('Connection name is too long')
  if (name.toLowerCase() === 'pairdraw') throw new Error('The pairdraw name is reserved')
  const duplicateName = mcpConnectionSettings.value.connections.some(
    (connection) =>
      connection.id !== draft.id && connection.name.toLowerCase() === name.toLowerCase()
  )
  if (duplicateName) throw new Error('Connection names must be unique')
  if (draft.id && !MCP_CONNECTION_ID_PATTERN.test(draft.id)) {
    throw new Error('Connection ID is invalid')
  }
  const id = draft.id ?? (`mcp-${crypto.randomUUID()}` as MCPConnectionID)
  const index = mcpConnectionSettings.value.connections.findIndex((item) => item.id === id)
  const previous = index === -1 ? undefined : mcpConnectionSettings.value.connections[index]
  const transport = draftTransport(draft, previous, options)
  const connection: MCPConnection = {
    id,
    name,
    enabled: draft.enabled,
    transport,
    authentication: draftAuthentication(draft, id, transport)
  }
  if (index === -1) mcpConnectionSettings.value.connections.push(connection)
  else mcpConnectionSettings.value.connections[index] = connection
  return connection
}

export function setMCPConnectionCredential(id: MCPConnectionID, value: string): Promise<void> {
  const token = value.trim()
  const reference = mcpConnectionCredentialRef(id)
  return token
    ? appCredentialServices.manager.set(reference, token)
    : appCredentialServices.manager.clear(reference)
}

export function mcpConnectionCredentialStatus(id: MCPConnectionID): Promise<CredentialStatus> {
  return appCredentialServices.manager.status(mcpConnectionCredentialRef(id))
}

export async function removeMCPConnection(id: MCPConnectionID): Promise<void> {
  for (const reference of mcpConnectionCredentialRefs(id)) {
    await appCredentialServices.manager.clear(reference)
  }
  mcpConnectionSettings.value.connections = mcpConnectionSettings.value.connections.filter(
    (connection) => connection.id !== id
  )
}

export function replaceMCPConnectionSettings(settings: MCPConnectionSettings): void {
  mcpConnectionSettings.value = structuredClone(settings)
}

export function mcpConnectionSettingsSnapshot(): MCPConnectionSettings {
  return structuredClone(toRaw(mcpConnectionSettings.value))
}
