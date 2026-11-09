import { VitePWA } from 'vite-plugin-pwa'

/**
 * The editor service worker. The previous setup generated the SW from Workbox's own template
 * (`vite-plugin-pwa`'s default `generateSW` strategy). Workbox builds that template's `import`
 * lines from absolute filesystem paths (`'.../workbox-core/clientsClaim.mjs'`), and a checkout
 * under a path with an apostrophe (e.g. `/Volumes/Badry's SSD/...`) ends the single-quoted
 * string early, so the SW build fails to parse. No supported option changes that string form —
 * `modulePathPrefix` and `inlineWorkboxRuntime` do not affect it. `injectManifest` instead takes
 * the hand-authored `src/sw.ts` (bare workbox specifiers resolved by Rollup) and injects the
 * precache manifest into it, so neither path contains a quoted absolute import.
 */
export function openPencilPwaPlugin() {
  return VitePWA({
    registerType: 'autoUpdate',
    devOptions: { enabled: false },
    strategies: 'injectManifest',
    srcDir: 'src',
    filename: 'sw.ts',
    injectManifest: {
      // The precache manifest glob is relative to the built `dist/`, same as the generated SW.
      maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
      globPatterns: ['**/*.{js,css,html,wasm,png,svg,ico,ttf,webmanifest}']
    },
    manifest: {
      name: 'Pairdraw',
      short_name: 'Pairdraw',
      description: 'Open-source design editor',
      display: 'standalone',
      orientation: 'any',
      start_url: '/',
      scope: '/',
      // A manifest holds one color for both themes; this is the dark --color-canvas.
      theme_color: '#141416',
      background_color: '#141416',
      categories: ['design', 'productivity'],
      icons: [
        { src: '/brand/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/brand/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        {
          src: '/brand/pwa-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    }
  })
}
