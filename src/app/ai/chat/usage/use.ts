import type { UIMessage } from 'ai'
import { computed, type Ref } from 'vue'

import { showTokenUsage } from '@/app/ai/chat/preferences'

import { chatUsage, estimatedCostUsd, type TurnUsage } from './aggregate'
import { useDesignModelPricing } from './pricing'

export interface ChatUsageMeter {
  /** Whether the meter is shown: the setting is on and a turn reported usage. */
  visible: boolean
  /** How many assistant turns reported usage. */
  turns: number
  /** The conversation's summed tokens, or null before any turn reported. */
  total: TurnUsage | null
  /** The estimated cost in US dollars, or null when the model's price is unknown. */
  costUsd: number | null
}

/**
 * The conversation's running token total and estimated cost, shown only while the setting is on
 * and a turn has reported usage. A coding agent's tokens carry no dollar price, so its cost stays
 * null and the meter shows tokens alone.
 */
export function useChatUsage(messages: Readonly<Ref<readonly UIMessage[]>>): ChatUsageMeter {
  const pricing = useDesignModelPricing()
  const usage = computed(() => chatUsage(messages.value))
  const visible = computed(() => showTokenUsage.value && usage.value.total !== null)
  const costUsd = computed(() =>
    usage.value.total ? estimatedCostUsd(usage.value.total, pricing.value) : null
  )
  return {
    get visible() {
      return visible.value
    },
    get turns() {
      return usage.value.turns
    },
    get total() {
      return usage.value.total
    },
    get costUsd() {
      return costUsd.value
    }
  }
}
