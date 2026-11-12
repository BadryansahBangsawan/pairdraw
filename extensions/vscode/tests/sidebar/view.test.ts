import { describe, expect, test } from 'bun:test'

import { COMMAND_IDS, SIDEBAR_ACTIONS } from '#vscode/commands/ids'
import { sidebarHTML } from '#vscode/sidebar/html'

describe('sidebar view', () => {
  test('offers one button per command, each carrying its command ID', () => {
    const html = sidebarHTML('nonce1')
    for (const action of SIDEBAR_ACTIONS) {
      expect(html).toContain(`data-command="${action.command}"`)
      expect(html).toContain(`>${action.title}</button>`)
    }
    expect(SIDEBAR_ACTIONS.map((action) => action.command)).toEqual([
      COMMAND_IDS.openEditor,
      COMMAND_IDS.toggleDesignMode,
      COMMAND_IDS.exportSelection
    ])
  })

  test('allows only its own nonce for scripts and styles', () => {
    const html = sidebarHTML('nonce1')
    expect(html).toContain("script-src 'nonce-nonce1'")
    expect(html).toContain("style-src 'nonce-nonce1'")
    expect(html).toContain("default-src 'none'")
  })
})
