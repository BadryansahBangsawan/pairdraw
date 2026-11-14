import { createHead } from '@unhead/vue/client'
import { createApp, nextTick } from 'vue'

import { ReadOnlyDocumentError } from '@pairdraw/core'
import { createRetainedScopePlugin } from '@pairdraw/vue/lifecycle/retention'

import './app.css'
import { connectCompanionFromLocation } from '@/app/automation/companion/connection'
import { adoptDevCompanion } from '@/app/automation/companion/dev'
import { recordRuntimeError } from '@/app/diagnostics'
import { installCanvasKitBinary, preloadCanvasKit } from '@/app/editor/canvas/canvaskit'
import { preloadFonts } from '@/app/editor/fonts'
import { installBundledFonts } from '@/app/editor/fonts/bundled'
import { observeBootErrors } from '@/app/shell/support/boot'
import { reportBootFailure } from '@/app/shell/support/gate'
import { installWindowIdentity } from '@/app/window/identity'
import { IS_TAURI } from '@/constants'

import App from './App.vue'
import router from './router'

/**
 * Application entry, loaded by `main.ts` only after the support gate passes.
 * Keeping it behind a dynamic import means an unsupported engine never
 * evaluates the app bundle and can still show the gate's guidance.
 */
export async function boot(): Promise<void> {
  // In `bun run dev` the tab uses the development server's agent bridge with no pairing link.
  // It starts first, so its check usually finishes before the editor looks for agents.
  if (!IS_TAURI) void adoptDevCompanion()
  installBundledFonts()
  installCanvasKitBinary()
  preloadCanvasKit()
  preloadFonts()
  // Before the UI mounts: every tab and every document id must already know which window it is in.
  await installWindowIdentity()
  const head = createHead()
  const app = createApp(App)
  const bootErrors = observeBootErrors(app)
  app.use(router).use(head).use(createRetainedScopePlugin()).mount('#app')

  await router.isReady()
  // A link from the companion pairs this tab. Its one-time code leaves the address bar once the
  // router has written its first entry, which would otherwise put it back.
  if (!IS_TAURI) void connectCompanionFromLocation()
  await nextTick()
  const failure = bootErrors.stop()
  if (failure) {
    await reportBootFailure(failure.error)
    return
  }
  // Component errors after boot reach only this handler, not the window; keep them diagnosable.
  app.config.errorHandler = (error, _instance, info) => {
    // A panel's edit to a read-only document does nothing, as in Figma.
    if (error instanceof ReadOnlyDocumentError) return
    recordRuntimeError(error, 'vue', info)
    console.error(error)
  }

  if (!IS_TAURI) {
    void import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({ immediate: true })
      return undefined
    })
  }
}
