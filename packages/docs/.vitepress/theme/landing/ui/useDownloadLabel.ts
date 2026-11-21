import { computed, type ComputedRef } from 'vue'

import { useLandingMessages } from '../content/messages'
import { fill } from '../content/messages/fill'
import { PLATFORM_NAMES } from '../download/format'
import type { VisitorSystem } from '../download/visitor'

/**
 * "Download for macOS" on a Mac and so on, once the browser says which system it runs on. The
 * page is rendered ahead of time for macOS, the system the design names, and a phone or an
 * unknown system gets the plain label.
 */
export function useDownloadLabel(system: () => VisitorSystem | null): ComputedRef<string> {
  const messages = useLandingMessages()
  return computed(() => {
    const visitor = system()
    const platform = visitor ? visitor.platform : 'mac'
    return platform
      ? fill(messages.value.hero.download, { platform: PLATFORM_NAMES[platform] })
      : messages.value.hero.downloadAny
  })
}
