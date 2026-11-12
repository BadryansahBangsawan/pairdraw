import { params } from '@nanostores/i18n'

import { i18n } from '#vue/i18n/create'

/** How a chat's agent works: its session's model, reasoning, and mode, folder, and approvals. */
export const agentMessageDefaults = {
  sessionModel: 'Model',
  sessionReasoning: 'Reasoning effort',
  sessionMode: 'Mode',
  sessionControlFailed: params('{agent} could not switch to {value}.'),
  projectFolder: 'Project folder',
  projectFolderNone: 'No project folder',
  projectFolderIn: params('{agent} works in {folder}'),
  projectFolderOutside: params('{agent} works in Pairdraw’s own folder, outside your projects.'),
  projectFolderChoose: 'Choose project folder…',
  projectFolderClear: 'Stop using this folder',
  projectFolderConfirmTitle: params('Let {agent} work in {folder}?'),
  projectFolderConfirmDescription: params(
    '{agent} can read every file in {path} and write code there. It asks before changing files unless its mode allows edits without asking. The next message starts a new session in this folder.'
  ),
  projectFolderConfirmMode: params('It starts there in {mode}, its default mode.'),
  projectFolderConfirm: 'Use folder',
  projectFolderCancel: 'Cancel',
  projectFolderFailed: 'Could not open the folder picker.',
  approveActions: 'Ask before changes',
  approveActionsHint:
    'The built-in AI asks before each action that changes the document or uses an MCP server tool not marked read-only. Coding agents ask through their own permission requests.',
  approvalRequest: params('The AI wants to run {tool}, which changes the document.'),
  approvalRequestExternal: params('The AI wants to run {tool} from the MCP server {server}.'),
  approvalRequestPage: params('The AI wants to run {tool} on {page}, which changes that page.'),
  approveOnce: 'Allow',
  approveAlways: params('Always allow {tool} in this chat'),
  approveReject: 'Deny'
} as const

export const agentMessages = i18n('agents', agentMessageDefaults)
