import { defineConfig, type PlaywrightTestConfig } from '@playwright/test'

import { EDITOR_SETUP_TIMEOUT_MS } from './tests/helpers/timeouts'

const appPort = process.env.PAIRDRAW_TEST_PORT ?? '1420'
const mcpPort = process.env.PAIRDRAW_TEST_MCP_PORT ?? '7600'
for (const port of [appPort, mcpPort]) {
  if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
    throw new Error('Browser test ports must be integers between 1024 and 65535')
  }
}
if (Number(appPort) === Number(mcpPort)) throw new Error('App and MCP test ports must differ')
const origin = `http://localhost:${appPort}`
const reuse = process.env.PAIRDRAW_TEST_REUSE_SERVER
if (reuse !== undefined && reuse !== '0' && reuse !== '1') {
  throw new Error('PAIRDRAW_TEST_REUSE_SERVER must be 0 or 1')
}

const server = process.env.PAIRDRAW_TEST_SERVER ?? 'all'
if (!['app', 'storybook', 'all'].includes(server)) {
  throw new Error('PAIRDRAW_TEST_SERVER must be app, storybook, or all')
}
const storybookPort = 6017
if (server === 'all' && [appPort, mcpPort].some((port) => Number(port) === storybookPort)) {
  throw new Error('App, MCP, and Storybook test ports must differ')
}

const appDefaults = {
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.3
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.3
    }
  },
  use: {
    baseURL: origin,
    // Tests start past the first-run AI setup offer, whose own spec clears this, and without the
    // prompt an empty page offers over the canvas, which `tests/e2e/chat/canvas-prompt.spec.ts`
    // turns on, and AI edits do not animate, so a canvas snapshot never catches one mid-way
    // (`tests/app/ai/motion/edits.test.ts`). They draw in the blue accent the canvas snapshots
    // were recorded in; the default Pairdraw accent is covered by `tests/app/settings/preferences/store.test.ts`. Both side panels
    // are kept open, as most specs read or edit through them; a fresh profile's canvas without
    // them is covered by `tests/e2e/panels/on-demand.spec.ts`.
    storageState: {
      cookies: [],
      origins: [
        {
          origin,
          localStorage: [
            {
              name: 'pairdraw:preferences:v1',
              value: JSON.stringify({
                version: 1,
                appearance: { accent: { kind: 'preset', preset: 'blue' } },
                onboarding: { aiSetup: 'done' },
                chat: { canvasPrompt: false, animateEdits: false },
                workspace: { layersOpen: true }
              })
            }
          ]
        }
      ]
    },
    testIdAttribute: 'data-test-id',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    launchOptions: {
      args: ['--enable-unsafe-swiftshader']
    }
  }
} satisfies Pick<PlaywrightTestConfig, 'expect' | 'use'>

export default defineConfig({
  testDir: './tests',
  // A test may boot the editor itself, so it gets the boot budget the helpers wait with. A test
  // that needs longer for its own work raises it where it does that work.
  timeout: EDITOR_SETUP_TIMEOUT_MS,
  workers: 1,
  projects: [
    {
      ...appDefaults,
      name: 'pairdraw',
      testDir: './tests/e2e',
      testIgnore: ['**/native/**', '**/storybook/**'],
      fullyParallel: false
    },
    {
      ...appDefaults,
      name: 'pairdraw-webkit',
      testDir: './tests/e2e',
      testIgnore: ['**/native/**', '**/storybook/**'],
      testMatch: [
        '**/*.webkit.spec.ts',
        '**/design/panel.spec.ts',
        '**/design/retained-panel.spec.ts',
        '**/export/basic.spec.ts',
        '**/fonts/settings.spec.ts'
      ],
      use: {
        ...appDefaults.use,
        browserName: 'webkit'
      }
    },
    {
      ...appDefaults,
      name: 'figma',
      testDir: './tests/figma'
    },
    {
      name: 'storybook-chromium',
      testDir: './tests/e2e/storybook',
      timeout: 30_000,
      use: {
        baseURL: `http://localhost:${storybookPort}`,
        viewport: { width: 800, height: 600 },
        deviceScaleFactor: 1,
        contextOptions: { reducedMotion: 'reduce' }
      }
    }
  ],
  webServer: [
    ...(server === 'storybook'
      ? []
      : [
          {
            command: `bun run dev --port ${appPort} --strictPort`,
            cwd: import.meta.dirname,
            url: origin,
            env: {
              PAIRDRAW_DEV_ORIGIN: origin,
              PAIRDRAW_DEV_MCP_PORT: mcpPort,
              PORTLESS_URL: '',
              // Tests never find, or start, the coding agents on the machine that runs them. A
              // reused server keeps its own environment, so start it with PAIRDRAW_DEV_AGENTS=0.
              PAIRDRAW_DEV_AGENTS: '0'
            },
            reuseExistingServer: !process.env.CI && reuse === '1'
          }
        ]),
    ...(server === 'app'
      ? []
      : [
          {
            command: `bun run storybook -- --port ${storybookPort} --ci --no-open`,
            cwd: import.meta.dirname,
            url: `http://localhost:${storybookPort}`,
            reuseExistingServer: false,
            timeout: 120_000
          }
        ])
  ]
})
