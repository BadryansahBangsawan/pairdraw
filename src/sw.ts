/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

import { NOT_EDITOR_PAGES } from '@open-pencil/vite-config/pwa/routes'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// `registerType: 'autoUpdate'` with vite-plugin-pwa's generateSW set workbox
// `skipWaiting: true` and `clientsClaim: true` (see plugin resolveOptions). With
// `injectManifest` the hand-authored SW must do both so an updated worker activates
// without waiting for all tabs to close, matching the documented autoUpdate pattern.
void self.skipWaiting()
clientsClaim()

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [...NOT_EDITOR_PAGES]
  })
)
