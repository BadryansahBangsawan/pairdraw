/** Where the chat's reply works while the person looks at another page or document. */
export interface ChatRunLocation {
  agent: string
  /** The page of the document in front that the reply works on. */
  page?: string
  /** The other document the reply works in, whose panel shows it while it runs. */
  document?: string
  open: () => void
}

interface RunTab {
  id: string
  store: { state: { documentName: string } }
}

/**
 * Where a reply running in another document is, or null when that document's tab is gone: the
 * agent's name, the document's current name, and how to show its tab.
 */
export function awayRunLocation(
  tab: RunTab | undefined,
  agent: string | undefined,
  open: (tabId: string) => void
): ChatRunLocation | null {
  if (!tab || !agent) return null
  return { agent, document: tab.store.state.documentName, open: () => open(tab.id) }
}
