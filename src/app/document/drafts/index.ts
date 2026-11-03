export { createDocumentDraft } from '@/app/document/drafts/controller'
export type { DocumentDraftController, DraftWriter } from '@/app/document/drafts/controller'
export {
  DRAFT_PROVIDER_ID,
  deleteDraft,
  draftExists,
  draftsAvailable,
  draftsWorkspaceSource,
  listDrafts,
  onDraftsChanged,
  readDraft,
  readDraftThumbnail,
  touchDraft,
  writeDraft
} from '@/app/document/drafts/store'
export type { DraftChange, DraftMeta, DraftWriteInput } from '@/app/document/drafts/store'
