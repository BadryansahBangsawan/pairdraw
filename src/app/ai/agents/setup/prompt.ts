import dedent from 'dedent'

import { ACP_AGENTS, type ACPAgentID } from '@pairdraw/core/constants'

import { MCP_INSTALL_COMMAND } from '@/app/automation/mcp/failure'
import { APP_NAME, CODING_AGENTS_GUIDE_URL } from '@/constants'

const SIGN_IN: Record<ACPAgentID, string> = {
  'claude-code':
    'Make sure I am signed in to Claude Code: run `claude` and use `/login` if it asks me to sign in.',
  codex: 'Make sure I am signed in to Codex: run `codex login` if I am not.',
  'gemini-cli': 'Make sure I am signed in to Gemini CLI: run `gemini` and choose a sign-in method.',
  omp: 'Make sure omp has a model I can use: run `omp` and use `/login`, or add a provider key.'
}

export function codingAgentGuideURL(agentID: ACPAgentID): string {
  return `${CODING_AGENTS_GUIDE_URL}#${agentID}`
}

const NPM_PERMISSIONS = dedent`
  3. If npm fails with a permission error (EACCES), set up a global npm folder in my home directory (for example \`npm config set prefix ~/.npm-global\` and add \`~/.npm-global/bin\` to my PATH) and install again; use sudo only if I agree.
`
const ADMIN_RIGHTS =
  '3. If the install fails because it needs administrator rights, tell me the command to run myself instead; use sudo only if I agree.'

/**
 * Markdown to paste into a coding agent the person already uses, asking it to install what
 * Pairdraw needs to start it. Written for the agent, so it stays in English.
 */
export function codingAgentSetupPrompt(agentID: ACPAgentID): string {
  const agent = ACP_AGENTS.find((candidate) => candidate.id === agentID)
  if (!agent) return ''
  const install = agent.installCommand ?? `Install ${agent.name}`
  // An agent installed with Bun is not an npm install, so npm's permission advice would not apply.
  const npm = !/^bun\b/.test(install)
  const manager = npm ? 'npm' : 'npm or Bun, whichever this computer has'
  const faults = npm ? NPM_PERMISSIONS : ADMIN_RIGHTS
  return dedent`
    Help me connect ${agent.name} to ${APP_NAME}, an open-source design editor. ${APP_NAME} starts ${agent.name} through the Agent Client Protocol and gives it canvas tools through ${APP_NAME}'s local MCP server, so both need to be installed on this computer.

    Please do this for me:

    1. If \`${agent.command}\` is not on my PATH, install it with ${manager}: \`${install}\`
    2. If \`pairdraw-mcp-http\` is not on my PATH, install ${APP_NAME}'s MCP server: \`${MCP_INSTALL_COMMAND}\`
    ${faults}
    4. Confirm both commands are found, for example with \`which ${agent.command}\` and \`which pairdraw-mcp-http\` (\`where\` on Windows). If a global ${npm ? 'npm' : 'package'} folder is missing from my PATH, tell me how to add it.
    5. ${SIGN_IN[agentID]}

    Then tell me what you installed and anything I still need to do myself. I will press "Connect ${agent.name}" or "Retry" in ${APP_NAME}'s AI setup afterwards.

    Setup guide: ${codingAgentGuideURL(agentID)}
  `
}
