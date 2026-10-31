import { isConfigured } from '@/app/ai/chat/storage'
import { runAISetup } from '@/app/ai/models/settings/onboarding/dialog'

/**
 * Whether the chat can send. When it cannot yet, guided setup opens first, and the chat can send
 * once that finished with a model the chat can use; dismissing it leaves the chat as it was.
 */
export async function ensureChatConfigured(): Promise<boolean> {
  if (isConfigured.value) return true
  await runAISetup()
  return isConfigured.value
}
