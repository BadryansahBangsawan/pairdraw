import type { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'

import type { AttachmentPresentation } from '@/app/ai/attachment/presentation/types'
import type { ConversationPins } from '@/app/ai/chat/pins/types'
import type { ToolChange } from '@/app/ai/tools/changes/types'

import type { ChatDocumentEditor } from './document'

export type HistoryChat = Pick<Chat<UIMessage>, 'messages' | 'status' | 'stop'>

export interface HistoryRuntime<TChat extends HistoryChat> {
  getEditor(): ChatDocumentEditor
  ensureChat(messages?: UIMessage[], sessionId?: string): Promise<TChat | null>
  resetChat(): Promise<void>
  backend(): ConversationMeta['backend']
  profileId(): string | null
  /**
   * Makes the model profile a reopened conversation last used the chat's model again; one that
   * no longer exists leaves the current model.
   */
  restoreProfile(profileId: string): void
  /** What a model profile runs on, or null when it no longer exists. */
  profileBackend(profileId: string): ConversationMeta['backend'] | null
}

export interface ConversationMeta {
  id: string
  documentId: string
  documentName: string
  title: string
  titleSource: 'fallback' | 'manual' | 'generated'
  createdAt: string
  updatedAt: string
  /** The model profile the conversation last used, which reopening it selects again. */
  profileId: string | null
  backend: 'direct' | 'acp' | 'harness'
  interrupted: boolean
}

export interface ConversationMessage {
  message: UIMessage
  displayText?: string
  attachments: AttachmentPresentation[]
  /** Absent in conversations saved before changes were recorded. */
  toolChanges?: ToolChange[]
}

export interface Conversation extends ConversationMeta {
  messages: ConversationMessage[]
  /**
   * The style kit and reference images pinned to the conversation, stored apart from its list
   * row since they hold images. Absent when nothing was ever pinned.
   */
  pins?: ConversationPins
}

export interface ConversationStore {
  list(documentId?: string): Promise<ConversationMeta[]>
  read(id: string): Promise<Conversation | null>
  write(conversation: Conversation): Promise<void>
  rename(id: string, title: string): Promise<void>
  /** Records the model profile a saved conversation uses, leaving its messages and time alone. */
  setProfile(id: string, profileId: string): Promise<void>
  remove(id: string): Promise<void>
  /** Forgets a conversation that became empty again, which may still be written later. */
  discard(id: string): Promise<void>
  resolveFile(handle: FileSystemFileHandle): Promise<string>
  reassignDocument(from: string, to: string, name: string): Promise<void>
  getSelected(documentId: string): Promise<string | null>
  select(documentId: string, id: string): Promise<void>
}
