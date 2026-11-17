import { createTab, switchTab, type Tab } from '@/app/tabs'

/**
 * An edit with no document id, while Home or a New file tab is in front, uses a document tab.
 * Leave this false to keep the person where they are. Set it true to switch to that tab.
 */
const FOCUS_UNTARGETED_EDIT: boolean = false

/** A new document for that edit. Home and New file keep the front unless the flag above says so. */
export function documentTabForUntargetedEdit(): Tab {
  const tab = createTab(undefined, undefined, { active: false })
  if (FOCUS_UNTARGETED_EDIT) switchTab(tab.id)
  return tab
}
