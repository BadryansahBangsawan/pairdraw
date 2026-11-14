import { IS_TAURI } from '@pairdraw/core/constants'

import { companion } from '@/app/automation/companion/connection'
import { isTauri } from '@/app/tauri/env'

import { companionAgentHost } from './companion'
import { tauriAgentHost } from './tauri'
import type { AgentHost } from './types'

/**
 * Whether this app can run coding agents now: the desktop app runs them itself, and the web app
 * through a paired companion. Reactive, since a tab can pair or lose its companion at any time.
 */
export function agentHostAvailable(): boolean {
  return IS_TAURI || companion.connected()
}

/** Whether this app runs Pi, which needs the desktop app's Harness companion. */
export const piHostAvailable = IS_TAURI

/**
 * The host the app runs coding agents through: the desktop shell, or the web app's companion.
 * Read from the webview at the call, as the MCP runtime does, so a shell mocked in tests counts.
 */
export function agentHost(): AgentHost {
  return isTauri() ? tauriAgentHost : companionAgentHost
}
