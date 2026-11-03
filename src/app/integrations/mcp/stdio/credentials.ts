import { isEmptyObject } from 'es-toolkit'
import * as v from 'valibot'

import { appCredentialServices } from '@/app/settings/credentials/app'
import type { CredentialStatus } from '@/app/settings/credentials/types'

import { mcpConnectionEnvCredentialRef } from '../store'
import type { MCPConnectionID } from '../types'
import { isAllowedMCPEnvName, type MCPEnvironment } from './env'

const storedEnvironmentSchema = v.pipe(v.string(), v.parseJson(), v.record(v.string(), v.string()))

/** The saved values of a local command's variables; unreadable or refused names are dropped. */
export async function readMCPConnectionEnv(id: MCPConnectionID): Promise<MCPEnvironment> {
  const text = await appCredentialServices.resolver.resolve(mcpConnectionEnvCredentialRef(id))
  if (!text) return {}
  const parsed = v.safeParse(storedEnvironmentSchema, text)
  if (!parsed.success) return {}
  const env: MCPEnvironment = {}
  for (const [name, value] of Object.entries(parsed.output)) {
    if (isAllowedMCPEnvName(name)) env[name] = value
  }
  return env
}

/** Saves the variables' values, or clears them when there are none. */
export function writeMCPConnectionEnv(id: MCPConnectionID, env: MCPEnvironment): Promise<void> {
  const reference = mcpConnectionEnvCredentialRef(id)
  return isEmptyObject(env)
    ? appCredentialServices.manager.clear(reference)
    : appCredentialServices.manager.set(reference, JSON.stringify(env))
}

export function mcpConnectionEnvStatus(id: MCPConnectionID): Promise<CredentialStatus> {
  return appCredentialServices.manager.status(mcpConnectionEnvCredentialRef(id))
}
