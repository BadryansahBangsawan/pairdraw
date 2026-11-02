import { until } from '@vueuse/core'
import { ref } from 'vue'

import {
  agentAutoConnect,
  type AgentAutoConnect,
  type AutoConnectOutcome
} from '@/app/ai/agents/auto/session'
import { agentHostAvailable } from '@/app/ai/agents/host/current'
import { aiModelSettings } from '@/app/ai/models/store'
import { appRuntimeConfig } from '@/app/runtime/config'
import { updateAISetupState } from '@/app/settings/preferences/store'

import { isUnconfiguredModelSettings } from './apply'

export const aiSetupDialogOpen = ref(false)

/** Opens guided setup at its first question. */
export function openAISetup(): void {
  aiSetupDialogOpen.value = true
}

/** Opens guided setup and resolves once it closes, whether finished or dismissed. */
export async function runAISetup(): Promise<void> {
  openAISetup()
  await until(aiSetupDialogOpen).toBe(false)
}

/** Closing guided setup in any way counts as done. */
export function closeAISetup(): void {
  aiSetupDialogOpen.value = false
  updateAISetupState('done')
}

export interface FirstRunDetectionOptions {
  /** Runs that start with their own data, such as tests, where the app must not look. */
  skip: boolean
  /** The model settings a fresh install starts with, until someone sets a model up. */
  untouched: () => boolean
  /** Whether agents can run here now; reactive, as a web app's companion pairs later. */
  hostAvailable: () => boolean
  autoConnect: Pick<AgentAutoConnect, 'detect'>
  /** Records that AI setup is finished, so nothing offers it again. */
  markSetupDone: () => void
}

/**
 * Looks for a coding agent on this computer while a fresh install has no AI model, and switches
 * the chat to one that needs nothing more; one that needs a sign-in or an install waits in the
 * chat column. Opens nothing: guided setup opens only when a prompt is sent and no agent was
 * found. A web app waits for its companion to pair first. Resolves with the outcome, or null
 * when it did not look.
 */
export function createFirstRunDetection({
  skip,
  untouched,
  hostAvailable,
  autoConnect,
  markSetupDone
}: FirstRunDetectionOptions) {
  return async function detectAgentsOnFirstRun(): Promise<AutoConnectOutcome | null> {
    if (skip) return null
    if (!untouched()) {
      markSetupDone()
      return null
    }
    if (!hostAvailable()) await until(hostAvailable).toBe(true)
    // Something set up while the companion paired is the person's choice.
    if (!untouched()) return null
    return autoConnect.detect()
  }
}

export const detectAgentsOnFirstRun = createFirstRunDetection({
  // The native test binary starts every run with an empty data store; tests start their own.
  skip: import.meta.env.MODE === 'native-test' || appRuntimeConfig.test,
  untouched: () => isUnconfiguredModelSettings(aiModelSettings.value),
  hostAvailable: agentHostAvailable,
  autoConnect: agentAutoConnect,
  markSetupDone: () => updateAISetupState('done')
})
