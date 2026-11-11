import type * as vscode from 'vscode'

/**
 * The scaffold registers nothing yet: the custom editor, commands, and view land in their own
 * slices, and each registers its disposables here.
 */
// eslint-disable-next-line no-empty-function -- An extension host entrypoint is required even before the first registration.
export function activate(_context: vscode.ExtensionContext): void {}
