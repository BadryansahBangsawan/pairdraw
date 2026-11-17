import { params } from '@nanostores/i18n'

import { i18n } from '#vue/i18n/create'

export const automationMessageDefaults = {
  restoreToolDefaults: 'Restore defaults',
  aiToolAccessDescription:
    'Choose tools for direct AI model connections. ACP and Pi agents use MCP access instead.',
  mcpToolAccessDescription:
    'Choose tools advertised by the local server to connected agents and clients.',
  aiToolsNotice:
    'Changes apply to your next message. Tool switches are not a sandbox: enabled script tools can still perform other design operations.',
  mcpFailureNotInstalled: 'MCP server is not installed',
  mcpFailureNotInstalledHint:
    'To keep the Pairdraw download small, the MCP server is installed separately.',
  mcpFailureOutdated: 'MCP server does not match this version of Pairdraw',
  mcpFailureOutdatedHint: params(
    'The installed MCP server is {running}, and this version of Pairdraw needs {version}. The server is installed separately to keep the download small, so it does not update with the app.'
  ),
  mcpInstallByHand: 'Install it from a terminal, or copy a prompt that asks your agent to do it.',
  mcpCopyAgentPrompt: 'Copy prompt for your agent',
  mcpUpdating: 'Updating…',
  mcpFailurePermission: 'Pairdraw cannot start the MCP server',
  mcpFailurePermissionHint:
    'The system denied the command. Reinstall Pairdraw with its shell permissions, or start the server manually.',
  mcpFailureExited: 'MCP server stopped during startup',
  mcpFailureExitedHint: 'The process exited before it became ready.',
  mcpFailureRestartExhausted: 'MCP server kept stopping',
  mcpFailureRestartExhaustedHint:
    'It was started again several times and did not stay running. Restart it from Settings, or restart the app.',
  mcpFailureTimeout: 'MCP server did not respond in time',
  mcpFailureTimeoutHint: 'It did not become ready within the startup timeout.',
  mcpFailureRejected: 'MCP server rejected the local connection',
  mcpFailureRejectedHint: 'Restart the MCP server to issue a new token.',
  mcpFailureMalformed: 'MCP server returned an unexpected response',
  mcpFailureMalformedHint:
    'Restart it. If this keeps happening, copy the details and report the problem.',
  mcpFailureUnreachable: 'MCP server is not reachable',
  mcpFailureUnreachableHint: params(
    'Nothing answers at {endpoint}. Restart the server; if another app uses this address, close it first.'
  ),
  mcpFailureUnknown: 'MCP server could not start',
  mcpFailureUnknownHint: 'Start it again, or check the diagnostic details below.',
  mcpFailureDetails: 'Details',
  mcpFailureCopy: 'Copy details',
  localServer: 'Local server',
  localServerDesktopOnly:
    'The local MCP server runs with the Pairdraw desktop app. In the browser, use WebMCP below.',
  webmcpDescription:
    'Let browser agents use this document directly, without a local MCP server or bearer token. Local server settings do not apply here.',
  browserAccess: 'Browser agent access',
  accessOff: 'Off',
  accessInspect: 'Inspect',
  accessEdit: 'Edit',
  accessOffDescription: 'No tools are exposed to browser agents.',
  accessInspectDescription: 'Agents can inspect the document but cannot change it.',
  accessEditDescription:
    'Agents can also edit existing properties, text, and variable values. Edits are undoable; creating or deleting content, scripts, and file access are excluded.',
  webmcpFailed: 'WebMCP could not start',
  webmcpUnsupported:
    'This browser does not expose WebMCP. Use a supported Chrome version and enable WebMCP testing, then relaunch the browser.',
  noMatchingTools: 'No tools match your search.',
  connections: 'MCP connections',
  connectionsDescription:
    'Give the AI chat and coding agents access to trusted tools and services.',
  addConnection: 'Add connection',
  addServerConnection: 'Add MCP connection',
  editConnection: 'Edit MCP connection',
  connectionName: 'Connection name',
  connectionNameHint: 'Use a unique name, up to 80 characters. The name pairdraw is reserved.',
  connectionNameInvalid: 'Choose a unique name of at most 80 characters, other than pairdraw.',
  serverURLHint:
    'The server must support Streamable HTTP. Use HTTPS. HTTP is allowed only for localhost or a loopback address. Do not include credentials in the URL.',
  serverURL: 'MCP server URL',
  enableConnection: 'Enable for AI chat and agents',
  bearerToken: 'Bearer token',
  bearerTokenPlaceholder: 'Enter bearer token',
  bearerTokenRequired: 'Enter a bearer token before enabling this connection.',
  deleteConnection: 'Delete connection',
  deleteConnectionDescription: 'Delete this MCP connection and remove its saved credentials?',
  noConnections: 'No external MCP connections configured.',
  transportType: 'Connection type',
  transportHTTP: 'Remote server',
  transportStdio: 'Local command',
  transportStdioDesktopOnly: 'Local commands run only in the Pairdraw desktop app.',
  command: 'Command',
  commandHint:
    'The program that starts the server, such as npx or uvx. Pairdraw asks before it runs a command for the first time.',
  commandRequired: 'Enter the command that starts the server.',
  commandArguments: 'Arguments',
  commandArgumentsHint: 'One argument per line.',
  environment: 'Environment variables',
  environmentHint: 'One NAME=value per line. Values are saved with your other credentials.',
  environmentSavedHint:
    'Variables are saved. Enter new ones to replace them, or leave this empty to keep them.',
  environmentInvalid:
    'Use NAME=value lines. Names use letters, digits, and underscores; PATH and variables that load code are not allowed.',
  authenticationType: 'Authentication',
  authenticationNone: 'None',
  authenticationBearer: 'Bearer token',
  authenticationOAuth: 'OAuth sign-in',
  oauthHint: 'For hosted servers that ask you to sign in, such as Notion or Linear.',
  oauthSignIn: 'Sign in',
  oauthSignInAgain: 'Sign in again',
  oauthSignOut: 'Sign out',
  oauthSignedIn: 'Signed in',
  oauthNotSignedIn: 'Not signed in',
  oauthSaveFirst: 'Save the connection, then sign in.',
  oauthWaiting: 'Finish signing in in your browser…',
  oauthReopen: 'Open sign-in page again',
  oauthCancelled: 'Sign-in was cancelled.',
  oauthExpired: 'Sign-in took too long. Try again.',
  oauthBlocked:
    'The browser blocked the sign-in window. Allow pop-ups for Pairdraw, then try again.',
  oauthFailed:
    'Sign-in did not finish. Check that the server supports OAuth sign-in, then try again.',
  connectionTestSaveFirst: 'Save your changes before testing.',
  connectionTestSuccess: params('Connected. Tools available: {count}.'),
  connectionTestSignIn: 'The server needs you to sign in.',
  connectionTestCredential: 'Enter the bearer token, then save.',
  connectionTestDeclined: 'Running the command was not allowed.',
  connectionTestFailed: 'Could not connect. Check the address or command, then try again.',
  description: 'Monitor and restart the local MCP server used by agents and automation.',
  status: 'Status',
  port: 'Port',
  address: 'Address',
  version: 'Version',
  authentication: 'Require authentication',
  authenticationDescription:
    'Protect the localhost MCP endpoint with a bearer token. Disable only on a trusted machine. Restart the server to apply changes.',
  selectionScope: 'Share only the selection',
  selectionScopeDescription:
    'Let MCP clients read only the layers you select, with get_selection, get_node, get_page_tree, describe, and export_image, and no other tools. Restart the server to apply changes.',
  rootDirectory: 'MCP root directory',
  rootDirectoryDefault: 'Server default directory',
  chooseRootDirectory: 'Choose folder',
  useDefaultRoot: 'Use default',
  rootDirectoryDescription:
    'File tools are limited to this folder. Restart the MCP server to apply changes.',
  tools: 'Available tools',
  toolsEnabled: params('{enabled} of {total} enabled'),
  searchTools: 'Search tools',
  readOnlyTools: 'Read-only tools',
  sideEffectTools: 'Tools with side effects',
  toolsRestartNotice:
    'Restart the MCP server, then reconnect stdio clients, to apply tool availability changes.',
  externalRestartNotice:
    'This server is managed by another process. Restart that process to apply changes.',
  restart: 'Restart MCP server',
  externallyManaged: 'Managed externally',
  starting: 'Starting…',
  statusIdle: 'Not initialized',
  statusStarting: 'Starting',
  statusRunning: 'Running',
  statusStopped: 'Stopped',
  statusError: 'Error',
  mcpClientsTitle: 'Other apps',
  mcpClientsDescription: params(
    'Add the {server} server to agents you run outside Pairdraw; they start it with {command}. Only that entry changes, and each file is backed up before its first change.'
  ),
  mcpClientsRefresh: 'Check again',
  mcpClientToggle: params('Connect {client}'),
  mcpClientNotInstalled: 'Not found on this computer',
  mcpClientCustom: 'Added with a different command',
  mcpClientManual: 'Added by hand; edit the file to change it',
  mcpClientInvalid: 'The file has errors; fix it to change this here',
  mcpClientUnreadable: 'The file cannot be read',
  mcpClientAdded: params('Added to {client}'),
  mcpClientRemoved: params('Removed from {client}'),
  mcpClientRestartHint: params('Restart {client}, or reload its servers, to apply the change.'),
  mcpClientBackup: params('The original file is kept as {path}.'),
  mcpClientFailed: params('Could not change {client}'),
  mcpClientFailedChanged: 'The file changed while it was being edited. Try again.',
  mcpClientFailedInvalid: 'The file has errors, so it was left unchanged. Fix it, then try again.',
  mcpClientFailedManual:
    'The entry was written by hand in a form that is not changed here. Edit the file instead.',
  mcpClientFailedTooLarge: 'The file is too large to edit here.',
  mcpClientFailedWrite: 'The file could not be written and was left unchanged.'
} as const

export const automationMessages = i18n('automation', automationMessageDefaults)
