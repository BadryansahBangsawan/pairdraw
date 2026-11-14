import type { ACPAgentDef } from '@pairdraw/core/constants'

import { signInWithAgent, type ToolsProbe } from '@/app/ai/agents/acp/auth/session'

import type { AgentHost, AgentSignIn } from './types'

/** Starts a session as a chat does: in the host's agent workspace, linked to Pairdraw's tools. */
export function chatToolsProbe(cwd: () => Promise<string>): ToolsProbe {
  return {
    cwd,
    link: async () => {
      const [{ getAutomationAuthToken }, { linkOwnTools }] = await Promise.all([
        import('@/app/automation/mcp/spawn'),
        import('@/app/ai/agents/acp/tools')
      ])
      return linkOwnTools(await getAutomationAuthToken())
    }
  }
}

/** A sign-in the agent runs itself inside its ACP session, such as Codex's ChatGPT login. */
export function signInInsideAgent(
  agent: ACPAgentDef,
  methodId: string,
  spawn: AgentHost['spawn']
): AgentSignIn {
  const controller = new AbortController()
  const done = signInWithAgent(agent, methodId, controller.signal, { spawn })
  // A caller that only cancels must not see an unhandled rejection.
  done.catch(() => undefined)
  return {
    done,
    async cancel() {
      controller.abort()
    }
  }
}
