import { ref } from 'vue'

import type { ACPAgentDef, ACPAgentID } from '@open-pencil/core/constants'

import type { AgentAuthCheck } from '@/app/ai/agents/acp/auth/session'
import type { AgentAuthMethod, AgentAuthStatus } from '@/app/ai/agents/acp/auth/status'
import { agentHost, agentHostAvailable } from '@/app/ai/agents/host/current'
import type { AgentHost, AgentSignIn } from '@/app/ai/agents/host/types'

/** What setup knows about the account a coding agent uses. */
export interface AgentAccount {
  checking: boolean
  /** Undefined until checked; null when the agent does not report its login. */
  status: AgentAuthStatus | null | undefined
  /** The ACP program that answered, null when it did not say. */
  adapter: AgentAuthCheck['adapter']
  /** The agent offers the auth method setup signs in with. */
  canSignIn: boolean
  signingIn: boolean
  /** A sign-in page to open by hand, when the login printed one. */
  signInURL: string | null
  /** The sign-in reads a code pasted from its page. */
  acceptsCode: boolean
  /** Whether a session reached OpenPencil's tools; null until a signed-in check says. */
  tools: AgentAuthCheck['tools']
  error: 'check' | 'sign-in' | null
}

const NOT_CHECKED: AgentAccount = {
  checking: false,
  status: undefined,
  adapter: null,
  canSignIn: false,
  signingIn: false,
  signInURL: null,
  acceptsCode: false,
  tools: null,
  error: null
}

type Accounts = Partial<Record<ACPAgentID, AgentAccount>>

export function createAgentAccounts(options: {
  enabled: boolean
  /** The host that starts the agents, to read their login and sign them in. */
  host: Pick<AgentHost, 'check' | 'signIn'>
}) {
  const { host } = options
  const accounts = ref<Accounts>({})
  const methods = new Map<ACPAgentID, AgentAuthMethod[]>()
  const checks = new Map<ACPAgentID, Promise<void>>()
  const signIns = new Map<ACPAgentID, Pick<AgentSignIn, 'cancel' | 'submitCode'>>()

  function account(id: ACPAgentID): AgentAccount {
    return accounts.value[id] ?? NOT_CHECKED
  }

  function update(id: ACPAgentID, patch: Partial<AgentAccount>) {
    accounts.value = { ...accounts.value, [id]: { ...account(id), ...patch } }
  }

  function signInMethod(agent: ACPAgentDef): AgentAuthMethod | undefined {
    const wanted = agent.signIn
    if (!wanted) return undefined
    const method = methods.get(agent.id)?.find((candidate) => candidate.id === wanted.method)
    if (wanted.via === 'terminal' && method?.type !== 'terminal') return undefined
    return method
  }

  /** Starts the agent and records the login it reports; joins a check already running. */
  function check(agent: ACPAgentDef): Promise<void> {
    if (!options.enabled) return Promise.resolve()
    const running = checks.get(agent.id)
    if (running) return running
    update(agent.id, { checking: true, error: null })
    const pending = host
      .check(agent)
      .then((result) => {
        methods.set(agent.id, result.methods)
        update(agent.id, {
          status: result.status,
          adapter: result.adapter,
          tools: result.tools,
          canSignIn: signInMethod(agent) !== undefined
        })
        return undefined
      })
      .catch(() => update(agent.id, { error: 'check' }))
      .finally(() => {
        update(agent.id, { checking: false })
        checks.delete(agent.id)
      })
    checks.set(agent.id, pending)
    return pending
  }

  async function signIn(agent: ACPAgentDef): Promise<void> {
    if (!options.enabled || account(agent.id).signingIn) return
    if (!methods.has(agent.id)) await check(agent)
    const method = signInMethod(agent)
    if (!method) {
      update(agent.id, { error: 'sign-in' })
      return
    }
    update(agent.id, { signingIn: true, signInURL: null, acceptsCode: false, error: null })
    // A field, so the cancel callback's write is visible to the checks below.
    const run = { cancelled: false, signedIn: false }
    try {
      const login = await host.signIn(agent, {
        methodId: method.id,
        onURL: (url) => update(agent.id, { signInURL: url })
      })
      signIns.set(agent.id, {
        cancel: () => {
          run.cancelled = true
          return login.cancel()
        },
        submitCode: login.submitCode
      })
      if (login.submitCode) update(agent.id, { acceptsCode: true })
      const status = await login.done
      if (status) update(agent.id, { status })
      run.signedIn = true
    } catch {
      if (!run.cancelled) update(agent.id, { error: 'sign-in' })
    } finally {
      signIns.delete(agent.id)
      update(agent.id, { signingIn: false, signInURL: null, acceptsCode: false })
    }
    // The agent reports the new login when it starts again.
    if (run.signedIn) await check(agent)
  }

  async function cancelSignIn(id: ACPAgentID): Promise<void> {
    await signIns.get(id)?.cancel()
  }

  async function submitCode(id: ACPAgentID, code: string): Promise<void> {
    await signIns.get(id)?.submitCode?.(code)
  }

  /** A login the agent reported elsewhere, such as during a chat. */
  function report(id: ACPAgentID, status: AgentAuthStatus) {
    update(id, { status })
  }

  return { supported: options.enabled, account, check, signIn, cancelSignIn, submitCode, report }
}

export const agentAccounts = createAgentAccounts({
  enabled: agentHostAvailable,
  host: agentHost()
})
