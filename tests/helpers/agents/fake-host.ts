import type { AgentAuthStatus } from '@/app/ai/agents/acp/auth/status'
import type { OwnToolsOutcome } from '@/app/ai/agents/acp/tools'
import type { AgentHost } from '@/app/ai/agents/host/types'
import { createAgentAccounts } from '@/app/ai/agents/setup/accounts'
import { createHostedAgentDiscovery } from '@/app/ai/agents/setup/discovery'
import { APP_VERSION } from '@/app/runtime/version'

/** The MCP server agents reach the canvas through, as the lookup names it. */
export const MCP = 'pairdraw-mcp-http'
export const SIGNED_OUT: AgentAuthStatus = { kind: 'none', label: 'Not logged in' }
export const SIGNED_IN: AgentAuthStatus = { kind: 'account', label: 'Claude Max' }

/** The computer a fake host runs agents on. */
export interface FakeComputer {
  /** Programs on PATH, such as `claude`, `claude-agent-acp`, `npm`, and `MCP`. */
  executables: string[]
  /** npm's global folder is writable without administrator rights. */
  npmWritable?: boolean
  signedIn?: boolean
  /** The login a signed-in agent reports; a Claude Max account unless set. */
  signedInAs?: AgentAuthStatus
  /** The agents report no login at all, as an agent that sends no status does. */
  silent?: boolean
  toolsReachable?: boolean
  /** The sign-in ends without a login, as when the person closes the browser. */
  signInEndsSignedOut?: boolean
  /** Claude Code is set up for a cloud with its `CLAUDE_CODE_USE_*` switches. */
  claudeCodeCloud?: 'bedrock' | 'vertex' | 'foundry'
}

function toolsOutcome(reachable: boolean): OwnToolsOutcome {
  return reachable
    ? { connected: true }
    : { connected: false, reason: 'The MCP server is not running.' }
}

/** Answers a test holds back until it settles them, to act while a lookup or a check runs. */
interface FakeHostHolds {
  detect: Promise<unknown> | null
  check: Promise<unknown> | null
}

/** A host whose computer changes as setup installs and signs in, recording what it was asked. */
export function fakeAgentHost(initial: FakeComputer) {
  const computer = {
    npmWritable: true,
    signedIn: false,
    silent: false,
    toolsReachable: true,
    signInEndsSignedOut: false,
    ...initial,
    executables: new Set(initial.executables)
  }
  const calls: string[] = []
  const holds: FakeHostHolds = { detect: null, check: null }
  const host: AgentHost = {
    async detect() {
      calls.push('detect')
      if (holds.detect) await holds.detect
      const executables = [...computer.executables]
      const versions: Record<string, string> = computer.executables.has(MCP)
        ? { '@pairdraw/mcp': APP_VERSION }
        : {}
      return {
        searchPath: '/test/bin',
        executables: Object.fromEntries(executables.map((name) => [name, `/test/bin/${name}`])),
        versions,
        npmGlobalWritable: computer.executables.has('npm') ? computer.npmWritable : null,
        ...(computer.claudeCodeCloud ? { claudeCodeCloud: computer.claudeCodeCloud } : {})
      }
    },
    async install(target) {
      const name = target.kind === 'adapter' ? target.agent.command : MCP
      calls.push(`install ${name}`)
      computer.executables.add(name)
    },
    async signIn(_agent, { methodId }) {
      calls.push(`sign-in ${methodId}`)
      computer.signedIn = !computer.signInEndsSignedOut
      return { done: Promise.resolve(null), cancel: async () => undefined }
    },
    async check(agent) {
      calls.push('check')
      if (holds.check) await holds.check
      const status = computer.signedIn ? (computer.signedInAs ?? SIGNED_IN) : SIGNED_OUT
      return {
        status: computer.silent ? null : status,
        methods: agent.signIn
          ? [{ id: agent.signIn.method, name: 'Subscription', type: agent.signIn.via }]
          : [],
        adapter: agent.adapterPackage ? { name: agent.adapterPackage, version: '1.0.0' } : null,
        tools: computer.signedIn && !computer.silent ? toolsOutcome(computer.toolsReachable) : null
      }
    },
    async spawn() {
      throw new Error('Connecting does not start a chat.')
    },
    async workspace() {
      return '/test/workspace'
    }
  }
  return { host, computer, calls, holds }
}

/** The lookup and accounts setup keeps for agents on the fake host's computer. */
export function hostedAgentSetup(host: AgentHost, enabled: boolean | (() => boolean) = true) {
  return {
    discovery: createHostedAgentDiscovery(host, {
      enabled,
      restartBridge: async () => undefined
    }),
    accounts: createAgentAccounts({ enabled, host })
  }
}
