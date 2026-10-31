import { IS_TAURI } from '@open-pencil/core/constants'

import { tauriAgentHost } from './tauri'
import type { AgentHost } from './types'

/** Whether this app can run coding agents: the desktop app runs them itself. */
export const agentHostAvailable = IS_TAURI

/** The host the app runs coding agents through. */
export function agentHost(): AgentHost {
  return tauriAgentHost
}
