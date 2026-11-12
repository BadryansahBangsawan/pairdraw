import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'

import * as v from 'valibot'

import { repoPath } from '#tests/helpers/paths'

/**
 * The browser page loads whatever the user points it at, so it must hold none of the app's
 * permissions: a page that could invoke our commands could read files and credentials. Tauri
 * gives a window only what a capability file grants it, so the browser label has to appear in
 * none of them, and no second window may be created from the config.
 */
const capabilityFiles = readdirSync(repoPath('desktop/capabilities')).filter((name) =>
  name.endsWith('.json')
)

const permissionSchema = v.union([v.string(), v.object({ identifier: v.string() })])

const capabilitySchema = v.object({
  windows: v.optional(v.array(v.string())),
  webviews: v.optional(v.array(v.string())),
  remote: v.optional(v.unknown()),
  permissions: v.optional(v.array(permissionSchema))
})

function readCapability(name: string) {
  const text = readFileSync(repoPath('desktop/capabilities', name), 'utf8')
  return v.parse(v.pipe(v.string(), v.parseJson(), capabilitySchema), text)
}

function capabilityWindows(name: string): string[] {
  const parsed = readCapability(name)
  return [...(parsed.windows ?? []), ...(parsed.webviews ?? [])]
}

function permissionNames(name: string): string[] {
  return (readCapability(name).permissions ?? []).map((permission) =>
    typeof permission === 'string' ? permission : permission.identifier
  )
}

describe('browser window isolation', () => {
  test('no capability file grants the browser window anything', () => {
    expect(capabilityFiles.length).toBeGreaterThan(0)
    for (const name of capabilityFiles) {
      const parsed = readCapability(name)
      expect(capabilityWindows(name)).not.toContain('browser')
      expect(parsed.remote).toBeUndefined()
      expect(permissionNames(name).some((permission) => permission.includes('browser'))).toBe(false)
    }
  })

  test('the config creates only the editor window', () => {
    const configSchema = v.object({
      app: v.optional(
        v.object({
          windows: v.optional(v.array(v.object({ label: v.optional(v.string()) })))
        })
      )
    })
    const text = readFileSync(repoPath('desktop/tauri.conf.json'), 'utf8')
    const config = v.parse(v.pipe(v.string(), v.parseJson(), configSchema), text)
    expect((config.app?.windows ?? []).map((window) => window.label ?? 'main')).toEqual(['main'])
  })

  test('the browser window is created without an initialization script', () => {
    const source = readFileSync(repoPath('desktop/src/system/browser.rs'), 'utf8')
    expect(source).not.toContain('initialization_script')
    // A navigation the page starts is cancelled unless it is an http or https site.
    expect(source).toContain('.on_navigation(|url| browser_navigation_allowed(url))')
    // The page gets its own persistent store, not the editor's and not an incognito session.
    expect(source).toContain('data_store_identifier(BROWSER_DATA_STORE)')
    expect(source).toContain('data_directory(directory)')
    expect(source).not.toContain('.incognito(')
    // A popup it opened would be a window of our app; every one is denied instead.
    expect(source).toContain('NewWindowResponse::Deny')
    // The capturer is read into the page on demand. It is not stored there at load.
    expect(source).toContain('include_str!("browser-capture.js")')
    expect(source).toContain('__openpencilCapturePage')
    expect(source).toContain('__openpencilCaptureElement')
    expect(source).toContain('include_str!("browser-pick.js")')
  })
})
