import { detachedTab, getTabsSnapshot, replaceTabs, type Tab } from '@/app/tabs'

/**
 * Shows the store a Home or New file tab is holding as a document. The tab keeps its id, so an
 * agent still editing that document keeps its target. Home stays pinned on a fresh store: the
 * pinned tab never becomes the design.
 */
export function showHeldDocument(tab: Tab): Tab {
  if (tab.kind === 'document') return tab
  const wasHome = tab.kind === 'home'
  const shown: Tab = { id: tab.id, store: tab.store, kind: 'document' }
  const replaced = getTabsSnapshot().map((entry) => (entry.id === tab.id ? shown : entry))
  replaceTabs(wasHome ? [detachedTab('home'), ...replaced] : replaced)
  return shown
}
