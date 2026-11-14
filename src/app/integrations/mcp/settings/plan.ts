import { automationMessages } from '@pairdraw/vue/i18n'

import { parseMCPEnvironment, type MCPEnvironment } from '../stdio/env'
import type { SaveMCPConnectionOptions } from '../store'
import type { MCPConnection, MCPConnectionDraft } from '../types'

/** What saving a connection does to the credentials kept apart from its settings. */
export interface MCPCredentialPlan {
  /** A remote connection authenticating with a bearer token. */
  bearer: boolean
  /** The variables to save for a local command, or null to keep or clear the saved ones. */
  env: MCPEnvironment | null
  /** Whether the saved variables go, as when the person cleared them or left local commands. */
  clearEnv: boolean
  /** The variable names to record in settings; absent keeps the saved names. */
  options: SaveMCPConnectionOptions
  /** Whether the saved OAuth sign-in goes: it belongs to the server it was made with. */
  signOut: boolean
}

/** Reads the variables the person typed; null when there are none to save. */
function enteredEnvironment(text: string): MCPEnvironment | null {
  if (!text.trim()) return null
  const env = parseMCPEnvironment(text)
  if (!env) throw new Error(automationMessages.get().environmentInvalid)
  return env
}

function envNames(remote: boolean, clearEnv: boolean, env: MCPEnvironment | null) {
  if (remote || clearEnv) return { envNames: [] }
  return env ? { envNames: Object.keys(env) } : {}
}

function signedInElsewhere(target: MCPConnectionDraft, previous: MCPConnection | undefined) {
  if (previous?.authentication.type !== 'oauth') return false
  if (target.transportType !== 'streamable-http' || target.authenticationType !== 'oauth') {
    return true
  }
  return (
    previous.transport.type === 'streamable-http' && previous.transport.url !== target.url.trim()
  )
}

/** Plans a save; throws, before anything is saved, when the typed variables are refused. */
export function planMCPCredentials(
  target: MCPConnectionDraft,
  previous: MCPConnection | undefined,
  envText: string,
  envCleared: boolean
): MCPCredentialPlan {
  const remote = target.transportType === 'streamable-http'
  const env = remote ? null : enteredEnvironment(envText)
  return {
    bearer: remote && target.authenticationType === 'bearer',
    env,
    clearEnv: !env && (envCleared || (remote && previous?.transport.type === 'stdio')),
    options: envNames(remote, envCleared, env),
    signOut: signedInElsewhere(target, previous)
  }
}
