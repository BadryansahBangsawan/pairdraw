import { recoveryMessages } from '@pairdraw/vue/i18n'

import { deleteDraft, readDraft, touchDraft } from '@/app/document/drafts'
import type { EditorStore } from '@/app/editor/session'
import { saveDocumentCopy, type DocumentCopyResult } from '@/app/home/save-copy'
import { closeTab, getTabsSnapshot, openKeptDocument, switchTab, type Tab } from '@/app/tabs'

function findDraftTab(id: string): Tab | undefined {
  return getTabsSnapshot().find((tab) => tab.store.getDraftId() === id)
}

/** Opens a draft from Home, or switches to the tab already showing it. */
export async function openDraftInTab(id: string): Promise<EditorStore> {
  const open = findDraftTab(id)
  if (open) {
    switchTab(open.id)
    return open.store
  }
  const draft = await readDraft(id)
  if (!draft) throw new Error(recoveryMessages.get().draftUnavailable)
  const store = await openKeptDocument({
    name: draft.name,
    bytes: draft.figBytes,
    kind: 'document-open',
    adopt: (opened) => opened.adoptDraft(id)
  })
  void touchDraft(id).catch((error: unknown) => {
    console.warn('[Drafts] Noting when the draft was opened failed:', error)
  })
  return store
}

/** Deletes a draft for good; a tab showing it closes with it. */
export async function deleteDraftEverywhere(id: string): Promise<void> {
  const open = findDraftTab(id)
  if (open) {
    // A draft write still in flight would bring the row back once it is deleted.
    await open.store.discardDraft()
    await closeTab(open.id, 'discard')
  }
  await deleteDraft(id)
}

/**
 * Saves a draft from Home to a file the person picks, which takes it out of Drafts, as Save As in
 * the editor does. A draft open in a tab saves from there, with any change not yet in the draft;
 * the tab then shows the file.
 */
export async function saveDraftAs(id: string, name: string): Promise<DocumentCopyResult> {
  const open = findDraftTab(id)
  if (open) {
    switchTab(open.id)
    const saved = await open.store.saveFigFileAs()
    return saved
      ? { status: 'saved', name: open.store.state.documentName }
      : { status: 'cancelled' }
  }
  const result = await saveDocumentCopy({ kind: 'draft', draftId: id, name })
  if (result.status === 'saved') await deleteDraft(id)
  return result
}
