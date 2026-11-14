import type {
  OAuthClientMetadata,
  OAuthClientProvider,
  OAuthDiscoveryState
} from '@modelcontextprotocol/client'

import { IS_BROWSER, IS_TAURI } from '@pairdraw/core/constants'

import { desktopRedirectURL } from '@/app/ai/providers/sign-in/redirect'
import { APP_NAME } from '@/constants'

import type { MCPConnectionID } from '../types'
import { credentialMCPOAuthStore, type MCPOAuthStore } from './state'

/** Served from `public/`; it relays the redirect to the editor over this channel. */
const MCP_OAUTH_CALLBACK_PATH = '/oauth/mcp.html'
export const MCP_OAUTH_CALLBACK_CHANNEL = 'pairdraw:mcp-oauth'
/** The desktop app's sign-in link for MCP servers, `pairdraw://oauth/mcp`. */
export const MCP_OAUTH_DEEP_LINK_PROVIDER = 'mcp'
/**
 * Served from `public/` on a hosted web app, when a build names one; it hands the redirect to the
 * desktop app's deep link.
 */
const MCP_OAUTH_DESKTOP_CALLBACK_PATH = '/oauth/mcp-desktop.html'

/** Thrown when a server wants the person to sign in again, which only Settings can start. */
export class MCPSignInRequiredError extends Error {
  constructor() {
    super('The MCP connection needs you to sign in')
    this.name = 'MCPSignInRequiredError'
  }
}

/**
 * Where the authorization server sends the browser back: a page on this origin in the web app,
 * and for the desktop app its `pairdraw://oauth/mcp` link, directly or through a hosted page.
 */
export function mcpOAuthRedirectURL(): string {
  if (IS_TAURI || !IS_BROWSER) {
    return desktopRedirectURL(MCP_OAUTH_DEEP_LINK_PROVIDER, MCP_OAUTH_DESKTOP_CALLBACK_PATH)
  }
  return new URL(MCP_OAUTH_CALLBACK_PATH, window.location.origin).href
}

export interface MCPOAuthProviderOptions {
  redirectURL: string
  /** Opens the authorization page during sign-in; without it a needed sign-in fails instead. */
  onRedirect?: (authorizationURL: URL) => void
  /** The state the redirect must carry back, drawn for one sign-in attempt. */
  state?: string
  store?: MCPOAuthStore
}

/**
 * The OAuth client for one MCP connection, registered with the server's authorization server
 * through dynamic client registration as a public client using PKCE. Its registration and
 * tokens live in the credential store; the PKCE verifier only in this attempt's memory.
 */
export function createMCPOAuthProvider(
  id: MCPConnectionID,
  { redirectURL, onRedirect, state, store = credentialMCPOAuthStore }: MCPOAuthProviderOptions
): OAuthClientProvider {
  let verifier: string | null = null
  // Kept with the verifier, so the code goes only to the authorization server that issued it.
  let discovery: OAuthDiscoveryState | undefined
  const metadata: OAuthClientMetadata = {
    client_name: APP_NAME,
    redirect_uris: [redirectURL],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none'
  }
  const provider: OAuthClientProvider = {
    // eslint-disable-next-line pairdraw/no-mixed-case-acronym-identifiers -- MCP SDK interface name.
    get redirectUrl() {
      return redirectURL
    },
    get clientMetadata() {
      return metadata
    },
    async clientInformation() {
      const saved = await store.read(id)
      // A registration made for another redirect would be refused at the token endpoint.
      return saved.redirectURL === redirectURL ? saved.client : undefined
    },
    async saveClientInformation(client) {
      const saved = await store.read(id)
      await store.write(id, { ...saved, client, redirectURL })
    },
    async tokens() {
      return (await store.read(id)).tokens
    },
    async saveTokens(tokens) {
      const saved = await store.read(id)
      await store.write(id, { ...saved, tokens, obtainedAt: Date.now() })
    },
    redirectToAuthorization(authorizationURL) {
      if (!onRedirect) throw new MCPSignInRequiredError()
      onRedirect(authorizationURL)
    },
    saveCodeVerifier(codeVerifier) {
      verifier = codeVerifier
    },
    codeVerifier() {
      if (!verifier) throw new MCPSignInRequiredError()
      return verifier
    },
    saveDiscoveryState(state) {
      discovery = state
    },
    discoveryState() {
      return discovery
    },
    async invalidateCredentials(scope) {
      if (scope === 'verifier') {
        verifier = null
        return
      }
      if (scope === 'discovery') {
        discovery = undefined
        return
      }
      if (scope === 'all') {
        verifier = null
        discovery = undefined
        await store.clear(id)
        return
      }
      const { client, tokens, ...rest } = await store.read(id)
      await store.write(id, scope === 'client' ? { ...rest, tokens } : { ...rest, client })
    }
  }
  if (state !== undefined) provider.state = () => state
  return provider
}
