import { onMounted } from 'vue'

import { useAIMessages } from '@pairdraw/vue/i18n'

import { agentCommands } from '@/app/ai/agents/acp/commands'
import {
  agentCommandCandidates,
  chatCommandCandidates,
  referenceCandidates
} from '@/app/ai/chat/references/candidates'
import { useAIChat } from '@/app/ai/chat/use'
import { enabledSkills, refreshSkills } from '@/app/ai/skills/library'
import { getActiveEditorStoreOrNull } from '@/app/editor/active-store'
import { useSkillMessages } from '@/components/settings/skills/messages'

import { commandCompletion, referenceCompletion } from './complete'

/**
 * What `/` and `@` offer in a message field. An ACP agent runs its own skills and commands; the
 * built-in chat and Pi run the user's skills.
 */
export function useComposerCompletions() {
  const ai = useAIMessages()
  const skillMessages = useSkillMessages()
  const { providerID } = useAIChat()

  function acpAgentId(): string | null {
    return providerID.value.startsWith('acp:') ? providerID.value.slice('acp:'.length) : null
  }
  const sections = () => ({
    node: ai.value.chatReferenceLayers,
    page: ai.value.chatReferencePages,
    skill: ai.value.chatReferenceSkills,
    citation: ai.value.chatReferenceCitations,
    command: ai.value.chatReferenceCommands
  })

  // Skills installed since the app started are offered without opening Settings first.
  onMounted(() => void refreshSkills())

  return [
    commandCompletion(() => {
      const agentId = acpAgentId()
      // `/review` asks the Review model whatever holds the chat, so it stands in for an agent's
      // own command of that name.
      const review = { name: 'review', description: ai.value.reviewCommand, hint: null }
      if (agentId) {
        const own = (agentCommands.value[agentId] ?? []).filter(({ name }) => name !== review.name)
        return agentCommandCandidates([review, ...own])
      }
      const compact = { name: 'compact', description: ai.value.compactCommand, hint: null }
      return chatCommandCandidates(
        [review, compact],
        enabledSkills.value,
        skillMessages.description
      )
    }, sections),
    referenceCompletion((query) => {
      const store = getActiveEditorStoreOrNull()
      if (!store) return []
      return referenceCandidates(store.graph, store.state.currentPageId, enabledSkills.value, query)
    }, sections)
  ]
}
