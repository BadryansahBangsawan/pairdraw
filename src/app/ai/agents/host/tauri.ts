import type { ACPAgentDef } from '@pairdraw/core/constants'

import { checkAgentAuth } from '@/app/ai/agents/acp/auth/session'
import { startTerminalSignIn } from '@/app/ai/agents/acp/auth/terminal'
import { spawnACPProcess } from '@/app/ai/agents/acp/process'
import {
  agentWorkspace,
  installAgentAdapter,
  installCanvasBridge,
  installHarnessCompanion,
  lookupAgents
} from '@/app/ai/agents/setup/native'

import { chatToolsProbe, signInInsideAgent } from './shared'
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
  return signInInsideAgent(agent, methodId, spawn)
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
  check: (agent) => checkAgentAuth(agent, { spawn, tools: chatToolsProbe(agentWorkspace) }),
  spawn,
  workspace: agentWorkspace
}
