import type { StoredOAuthClientInformation, StoredOAuthTokens } from '@modelcontextprotocol/client'
import * as v from 'valibot'

import { appCredentialServices } from '@/app/settings/credentials/app'

import { mcpConnectionOAuthCredentialRef } from '../store'
import type { MCPConnectionID } from '../types'

/** What one connection's sign-in keeps: its client registration and its latest tokens. */
export interface MCPOAuthState {
  client?: StoredOAuthClientInformation
  /** The redirect the client was registered with; a client for another one is registered anew. */
  redirectURL?: string
  tokens?: StoredOAuthTokens
  /** When the tokens arrived, in milliseconds since the epoch, to tell when they expire. */
  obtainedAt?: number
}

/** Where sign-ins are kept; the credential store in the app, memory in tests. */
export interface MCPOAuthStore {
  read(id: MCPConnectionID): Promise<MCPOAuthState>
  write(id: MCPConnectionID, state: MCPOAuthState): Promise<void>
  clear(id: MCPConnectionID): Promise<void>
}

const storedClientSchema = v.looseObject({ client_id: v.string() })
const storedTokensSchema = v.looseObject({
  access_token: v.string(),
  token_type: v.string(),
  refresh_token: v.optional(v.string()),
  expires_in: v.optional(v.number()),
  scope: v.optional(v.string())
})
const storedStateSchema = v.object({
  client: v.optional(storedClientSchema),
  redirectURL: v.optional(v.string()),
  tokens: v.optional(storedTokensSchema),
  obtainedAt: v.optional(v.number())
})
const storedStateJSONSchema = v.pipe(v.string(), v.parseJson(), storedStateSchema)

function isStoredClient(value: unknown): value is StoredOAuthClientInformation {
  return v.is(storedClientSchema, value)
}

function isStoredTokens(value: unknown): value is StoredOAuthTokens {
  return v.is(storedTokensSchema, value)
}

/** Reads a saved sign-in; anything unreadable counts as signed out. */
export function parseMCPOAuthState(text: string | null): MCPOAuthState {
  if (!text) return {}
  const parsed = v.safeParse(storedStateJSONSchema, text)
  if (!parsed.success) return {}
  const { client, tokens, redirectURL, obtainedAt } = parsed.output
  const state: MCPOAuthState = {}
  if (isStoredClient(client)) state.client = client
  if (redirectURL) state.redirectURL = redirectURL
  if (isStoredTokens(tokens)) state.tokens = tokens
  if (obtainedAt !== undefined) state.obtainedAt = obtainedAt
  return state
}

export const credentialMCPOAuthStore: MCPOAuthStore = {
  async read(id) {
    return parseMCPOAuthState(
      await appCredentialServices.resolver.resolve(mcpConnectionOAuthCredentialRef(id))
    )
  },
  async write(id, state) {
    await appCredentialServices.manager.set(
      mcpConnectionOAuthCredentialRef(id),
      JSON.stringify(state)
    )
  },
  async clear(id) {
    await appCredentialServices.manager.clear(mcpConnectionOAuthCredentialRef(id))
  }
}

/** Refreshed this long before they expire, so a request never carries a token that just died. */
const EXPIRY_MARGIN_MS = 60_000

/** Whether the saved access token can still be sent as it is. */
export function mcpOAuthTokensFresh(state: MCPOAuthState, now = Date.now()): boolean {
  const { tokens, obtainedAt } = state
  if (!tokens) return false
  if (tokens.expires_in === undefined || obtainedAt === undefined) return true
  return obtainedAt + tokens.expires_in * 1000 - EXPIRY_MARGIN_MS > now
}
