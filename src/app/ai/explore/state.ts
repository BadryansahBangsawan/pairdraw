import { computed, shallowRef } from 'vue'

import type { ChatSubmission } from '@/app/ai/chat/submission/types'
import {
  DEFAULT_EXPLORE_SETTING,
  exploreRequestOf,
  type ExploreRequest,
  type ExploreSetting
} from '@/app/ai/explore/request'

/**
 * The composer's "Let it cook" choice. It stays until changed, as the thinking level does, so a
 * run of messages can explore together; the composer shows it while it is on.
 */
export const exploreSetting = shallowRef<ExploreSetting>({ ...DEFAULT_EXPLORE_SETTING })

/** What the next message the composer sends asks for, or null while exploring is off. */
export const exploreRequest = computed<ExploreRequest | null>(() =>
  exploreRequestOf(exploreSetting.value)
)

/** The submission as the composer sends it now, asking for what "Let it cook" is set to. */
export function withExploreRequest(submission: ChatSubmission): ChatSubmission {
  const request = exploreRequest.value
  return request ? { ...submission, explore: request } : submission
}
