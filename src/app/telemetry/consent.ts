import { computed, ref } from 'vue'

import type { ConsentSource } from '@pairdraw/feedback/contract'
import { randomHex } from '@pairdraw/scene-graph/random'
import { locale } from '@pairdraw/vue/i18n'

import { appPreferences, updateSharingPreferences } from '@/app/settings/preferences/store'

import { FEEDBACK_ENABLED } from './config'
import { sharingClient } from './instance'
import { sharingDisabledByEnvironment, sharingState } from './state'

/** Whether this build asks about usage stats at all: official builds, environment permitting. */
const askable = ref(false)

/**
 * Where the app asks on its own: `prompt`, once the window shows what it opened. The feedback
 * contract still accepts `welcome` from versions that asked after a first-run welcome.
 */
export type UsageStatsPromptSource = Exclude<ConsentSource, 'settings' | 'welcome'>

/** Where the question is open, or `null`. */
export const usageStatsPrompt = ref<UsageStatsPromptSource | null>(null)

export const usageStatsConsent = computed(() => appPreferences.value.sharing.usageStats)

/**
 * Starting to share makes a new random ID and records where the person agreed; stopping deletes
 * the ID and anything queued.
 */
export function setUsageStatsConsent(granted: boolean, source: ConsentSource): void {
  updateSharingPreferences({ usageStats: granted ? 'granted' : 'denied' })
  sharingState.value = {
    ...sharingState.value,
    installId: granted ? (sharingState.value.installId ?? randomHex(16)) : null
  }
  usageStatsPrompt.value = null
  if (!granted) {
    sharingClient.discardPendingUsage()
    return
  }
  sharingClient.trackUsage({ name: 'usage_stats_enabled', source })
  sharingClient.trackUsage({ name: 'app_opened', locale: locale.get() })
}

/** Opens the question unless this build or environment sends nothing, or it was answered. */
export function offerUsageStatsPrompt(source: UsageStatsPromptSource): void {
  if (!askable.value || usageStatsConsent.value !== 'unset') return
  usageStatsPrompt.value = source
}

export async function resolveUsageStatsQuestion(): Promise<void> {
  askable.value = FEEDBACK_ENABLED && !(await sharingDisabledByEnvironment())
}
