import type { AgentAccount } from '@/app/ai/agents/setup/accounts'

/**
 * A coding agent's account as setup reads it, for stories: Claude's adapter reporting no login,
 * with a sign-in it can run, unless `overrides` says otherwise.
 */
export function agentAccount(overrides: Partial<AgentAccount> = {}): AgentAccount {
  return {
    checking: false,
    status: { kind: 'none', label: 'Not logged in' },
    adapter: { name: '@agentclientprotocol/claude-agent-acp', version: '0.93.0' },
    canSignIn: true,
    signingIn: false,
    signInURL: null,
    acceptsCode: false,
    tools: null,
    error: null,
    ...overrides
  }
}
