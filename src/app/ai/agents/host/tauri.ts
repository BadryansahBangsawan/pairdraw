import type { ACPAgentDef } from '@open-pencil/core/constants'

import { checkAgentAuth, signInWithAgent, type ToolsProbe } from '@/app/ai/agents/acp/auth/session'
import { startTerminalSignIn } from '@/app/ai/agents/acp/auth/terminal'
import { spawnACPProcess } from '@/app/ai/agents/acp/process'
import {
  agentWorkspace,
  installAgentAdapter,
  installCanvasBridge,
  installHarnessCompanion,
  lookupAgents
} from '@/app/ai/agents/setup/native'

import type { AgentHost, AgentSignIn, AgentStreams } from './types'

async function spawn(
  agent: ACPAgentDef,
  { logId = agent.id, onExit }: Parameters<AgentHost['spawn']>[1] = {}
): Promise<AgentStreams> {
  let closing = false
  const { child, input, output } = await spawnACPProcess({
    command: agent.command,
    args: agent.args,
    logId,
    destroying: () => closing,
    onUnexpectedClose: () => onExit?.()
  })
  return {
    input,
    output,
    async close() {
      closing = true
      await child.kill().catch(() => undefined)
    }
  }
}

/** Starts a session as a chat does: in the agent workspace, linked to OpenPencil's tools. */
const chatTools: ToolsProbe = {
  cwd: agentWorkspace,
  link: async () => {
    const [{ getAutomationAuthToken }, { linkOwnTools }] = await Promise.all([
      import('@/app/automation/mcp/spawn'),
      import('@/app/ai/agents/acp/tools')
    ])
    return linkOwnTools(await getAutomationAuthToken())
  }
}

async function signIn(
  agent: ACPAgentDef,
  { methodId, onURL }: Parameters<AgentHost['signIn']>[1]
): Promise<AgentSignIn> {
  if (agent.signIn?.via === 'terminal') {
    const login = await startTerminalSignIn(agent, agent.signIn.args, onURL)
    return {
      done: login.done.then(() => null),
      submitCode: login.submitCode,
      cancel: login.cancel
    }
  }
  // The agent runs the login itself, such as Codex's ChatGPT login, and reports the new login.
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

/** Agents the desktop shell runs through its pinned shell scope (`desktop/capabilities/**`). */
export const tauriAgentHost: AgentHost = {
  detect: lookupAgents,
  async install(target, { searchPath, manager }) {
    if (target.kind === 'adapter') return installAgentAdapter(target.agent, searchPath)
    if (target.companion === 'mcp') return installCanvasBridge(searchPath, manager)
    return installHarnessCompanion(searchPath, manager)
  },
  signIn,
  check: (agent) => checkAgentAuth(agent, { spawn, tools: chatTools }),
  spawn,
  workspace: agentWorkspace
}
