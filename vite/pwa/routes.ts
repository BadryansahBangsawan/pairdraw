/**
 * Pages that are not the editor's: OAuth callbacks, which relay a redirect, and, where a Cloud
 * server serves the editor, its API and its own pages, `CLOUD_PORTAL_PAGE_ROOTS` in
 * `@pairdraw/cloud/contract`, which loads only once packages are built. Workbox matches the
 * path with its query, so a page root may be followed by `?` as well as `/`.
 *
 * Single source of truth shared by the Vite PWA config, the hand-authored service worker
 * (`src/sw.ts`, bundled separately by vite-plugin-pwa's injectManifest build), and
 * `tests/integration/cloud/service-worker.test.ts`. Keep this module free of heavy/runtime deps.
 */
export const NOT_EDITOR_PAGES = [
  /^\/oauth\//,
  /^\/api\//,
  /^\/\.well-known\//,
  /^\/(?:welcome|auth|account|admin|u)(?:[/?]|$)/
] as const
