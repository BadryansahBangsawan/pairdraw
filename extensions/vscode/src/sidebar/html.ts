import { SIDEBAR_ACTIONS } from '../commands/ids'

function escapeHTML(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** The sidebar page: one button per action, each posting its command ID to the extension. */
export function sidebarHTML(nonce: string): string {
  const buttons = SIDEBAR_ACTIONS.map(
    (action) =>
      `<button type="button" data-command="${escapeHTML(action.command)}">${escapeHTML(action.title)}</button>`
  ).join('\n')
  const csp = [
    "default-src 'none'",
    `style-src 'nonce-${nonce}'`,
    `script-src 'nonce-${nonce}'`
  ].join('; ')
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${escapeHTML(csp)}">
<style nonce="${nonce}">
body { padding: 0 8px; font-family: var(--vscode-font-family); color: var(--vscode-foreground); }
button { display: block; width: 100%; margin: 6px 0; padding: 6px; cursor: pointer; text-align: left; border: 1px solid var(--vscode-button-border, transparent); background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
button:hover { background: var(--vscode-button-secondaryHoverBackground); }
</style>
</head>
<body>
${buttons}
<script nonce="${nonce}">
const api = acquireVsCodeApi()
for (const button of document.querySelectorAll('button[data-command]')) {
  button.addEventListener('click', () => api.postMessage({ command: button.dataset.command }))
}
</script>
</body>
</html>
`
}
