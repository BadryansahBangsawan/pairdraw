import { computed } from 'vue'

import { designModelProfiles } from '@/app/ai/models'
import { runAgentId } from '@/app/ai/tools'
import { presenceOf } from '@/app/presence/registry'
import { activeTab, getTabsSnapshot, switchTab } from '@/app/tabs'

import { useAIChat } from '../use'
import { awayRunLocation, type ChatRunLocation } from './target'

export type { ChatRunLocation }

export function useChatRunLocation() {
  const { history } = useAIChat()
  return computed<ChatRunLocation | null>(() => {
    // A reply in another document keeps its conversation in front, with where to find it.
    if (history.away.value) {
      const conversation = history.current.value
      const editor = history.documentEditor()
      const tab = editor && getTabsSnapshot().find((entry) => entry.store === editor)
      // The agent's callsign when its presence shows, otherwise the model the conversation uses,
      // which a chat whose transport never started a run still names.
      const agent =
        tab &&
        presenceOf(tab.store).agents.value.find((entry) => entry.id === runAgentId(tab.store))
      const profile = conversation?.profileId
        ? designModelProfiles().find((entry) => entry.id === conversation.profileId)
        : undefined
      return awayRunLocation(tab ?? undefined, agent?.name ?? profile?.name, switchTab)
    }
    const tab = activeTab.value
    if (tab?.kind !== 'document') return null
    const store = tab.store
    const agentId = runAgentId(store)
    const agent = presenceOf(store).agents.value.find((entry) => entry.id === agentId)
    if (!agent || agent.status === 'idle' || !agent.pageId) return null
    const pageId = agent.pageId
    if (pageId === store.state.currentPageId) return null
    const page = store.graph.getNode(pageId)?.name
    if (!page) return null
    return { agent: agent.name, page, open: () => void store.switchPage(pageId) }
  })
}
