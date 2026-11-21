import { tryOnScopeDispose } from '@vueuse/core'
import { computed, ref, watch, type Ref } from 'vue'

import {
  createMCPConnectionDraft,
  mcpConnectionCredentialStatus,
  mcpConnectionSettings,
  removeMCPConnection,
  saveMCPConnectionDraft,
  setMCPConnectionCredential,
  type MCPConnectionDraft
} from '@/app/integrations/mcp'
import { settingsErrorMessage } from '@/app/settings/credentials/errors'
import type { CredentialStatus } from '@/app/settings/credentials/types'
import type { SettingsSaveResult } from '@/app/settings/save-result'

import { enqueueMCPConnectionMutation } from '../mutations'
import { signOutOfMCPConnection } from '../oauth/sign-in'
import { mcpConnectionEnvStatus, writeMCPConnectionEnv } from '../stdio/credentials'
import type { MCPConnectionID } from '../types'
import { planMCPCredentials } from './plan'

const connectionServices = {
  status: mcpConnectionCredentialStatus,
  save: saveMCPConnectionDraft,
  setCredential: setMCPConnectionCredential,
  remove: removeMCPConnection,
  envStatus: mcpConnectionEnvStatus,
  setEnv: writeMCPConnectionEnv,
  signOut: (id: MCPConnectionID) => signOutOfMCPConnection(id)
}

export type MCPConnectionServices = typeof connectionServices

/**
 * Edits one MCP connection: its settings, and the credentials kept apart from them (the bearer
 * token, a local command's variables, and the OAuth sign-in, which switching away discards).
 */
export function useMCPConnectionSettings(
  draft: Ref<MCPConnectionDraft>,
  tokenDraft: Ref<string>,
  automation: Readonly<Ref<{ bearerTokenRequired: string }>>,
  overrides: Partial<MCPConnectionServices> = {}
) {
  const services: MCPConnectionServices = { ...connectionServices, ...overrides }
  const tokenStatus = ref<CredentialStatus>('missing')
  const credentialCleared = ref(false)
  /** The variables typed for a local command, `NAME=value` per line; never saved settings. */
  const envDraft = ref('')
  const envStatus = ref<CredentialStatus>('missing')
  const envCleared = ref(false)
  const error = ref('')
  const saveResult = ref<SettingsSaveResult | null>(null)
  const pending = ref(0)
  const busy = computed(() => pending.value > 0)

  let version = 0
  let disposed = false

  tryOnScopeDispose(() => {
    disposed = true
    version++
    tokenDraft.value = ''
    envDraft.value = ''
  })

  const savedConnection = computed(() =>
    mcpConnectionSettings.value.connections.find((connection) => connection.id === draft.value.id)
  )

  function current(request: number): boolean {
    return !disposed && request === version
  }

  function resetCredentials(): void {
    credentialCleared.value = false
    tokenDraft.value = ''
    tokenStatus.value = 'missing'
    envCleared.value = false
    envDraft.value = ''
    envStatus.value = 'missing'
    error.value = ''
  }

  function startAdd(): void {
    version++
    saveResult.value = null
    draft.value = createMCPConnectionDraft()
    resetCredentials()
  }

  async function startEdit(id: string): Promise<boolean> {
    const connection = mcpConnectionSettings.value.connections.find((item) => item.id === id)
    if (!connection) return false

    const request = ++version
    pending.value++
    saveResult.value = null
    draft.value = createMCPConnectionDraft(connection)
    resetCredentials()

    try {
      const status = await services.status(connection.id)
      const env =
        connection.transport.type === 'stdio' ? await services.envStatus(connection.id) : 'missing'
      if (!current(request)) return false

      tokenStatus.value = status
      envStatus.value = env
      return true
    } catch (cause) {
      if (!current(request)) return false

      error.value = settingsErrorMessage(cause)
      return true
    } finally {
      pending.value--
    }
  }

  async function save(): Promise<SettingsSaveResult> {
    const progress = { persisted: false }
    saveResult.value = null
    const request = ++version
    pending.value++
    const id: MCPConnectionID = draft.value.id ?? `mcp-${crypto.randomUUID()}`
    draft.value.id = id
    const target = { ...draft.value, id }
    const previous = savedConnection.value
    const token = tokenDraft.value
    const clearToken = credentialCleared.value
    const envText = envDraft.value
    const clearEnv = envCleared.value
    error.value = ''

    try {
      const plan = planMCPCredentials(target, previous, envText, clearEnv)
      if (plan.bearer && target.enabled && !token.trim() && tokenStatus.value !== 'configured') {
        throw new Error(automation.value.bearerTokenRequired)
      }

      await enqueueMCPConnectionMutation(id, async () => {
        const connection = services.save({ ...target, enabled: false }, plan.options)
        progress.persisted = true
        if (!plan.bearer || (clearToken && !token.trim())) {
          await services.setCredential(connection.id, '')
        } else if (token.trim()) await services.setCredential(connection.id, token)
        else if (target.enabled && (await services.status(connection.id)) !== 'configured') {
          throw new Error(automation.value.bearerTokenRequired)
        }
        if (plan.env) await services.setEnv(connection.id, plan.env)
        else if (plan.clearEnv) await services.setEnv(connection.id, {})
        if (plan.signOut) await services.signOut(connection.id)
        services.save({ ...target, id: connection.id }, plan.options)
      })
      if (!current(request)) return 'partial'

      if (tokenDraft.value === token) tokenDraft.value = ''
      if (envDraft.value === envText) envDraft.value = ''
      if (plan.env) envStatus.value = 'configured'
      else if (plan.clearEnv || target.transportType !== 'stdio') envStatus.value = 'missing'
      envCleared.value = false
      saveResult.value = 'saved'
      return 'saved'
    } catch (cause) {
      const result = progress.persisted ? 'partial' : 'failed'
      if (current(request)) {
        error.value = settingsErrorMessage(cause)
        saveResult.value = result
      }
      return result
    } finally {
      pending.value--
    }
  }

  function clearCredential(): void {
    if (busy.value) return
    credentialCleared.value = true
    draft.value.enabled = false
    tokenDraft.value = ''
    tokenStatus.value = 'missing'
    error.value = ''
  }

  /** Discards the saved variables when the connection is next saved. */
  function clearEnvironment(): void {
    if (busy.value) return
    envCleared.value = true
    envDraft.value = ''
    envStatus.value = 'missing'
    error.value = ''
  }

  async function remove(): Promise<boolean> {
    saveResult.value = null
    const id = draft.value.id
    if (!id) return false

    const request = ++version
    pending.value++
    error.value = ''

    try {
      await enqueueMCPConnectionMutation(id, () => services.remove(id))
      return current(request)
    } catch (cause) {
      if (current(request)) error.value = settingsErrorMessage(cause)
      return false
    } finally {
      pending.value--
    }
  }

  watch(
    () => draft.value.authenticationType,
    (type) => {
      if (type !== 'bearer') tokenDraft.value = ''
    }
  )

  return {
    draft,
    busy,
    cancel: startAdd,
    tokenStatus,
    credentialCleared,
    envDraft,
    envStatus,
    envCleared,
    error,
    saveResult,
    savedConnection,
    startAdd,
    startEdit,
    save,
    clearCredential,
    clearEnvironment,
    remove
  }
}
