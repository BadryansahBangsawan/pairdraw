/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vanillajs" />
/// <reference types="unplugin-icons/types/vue" />

declare const __PAIRDRAW_APP_VERSION__: string
/** Whether this is the editor a Cloud server serves on its own address (`bun run build:cloud`). */
declare const __PAIRDRAW_CLOUD_SITE__: boolean
/** `VITE_PAIRDRAW_OFFICIAL_CLOUD_URL`: the hosted Cloud server a build offers, or null for none. */
declare const __PAIRDRAW_OFFICIAL_CLOUD_URL__: string | null
/** `VITE_PAIRDRAW_WEB_APP_URL`: a hosted web app a build names, or null for none. */
declare const __PAIRDRAW_WEB_APP_URL__: string | null
declare const __PAIRDRAW_LOCAL_AUTOMATION_TOKEN__: string | null
declare const __PAIRDRAW_LOCAL_AUTOMATION_URL__: string
declare const __PAIRDRAW_LOCAL_AUTOMATION_HTTP_URL__: string
/**
 * The session `bun run dev` gave its MCP server's agent bridge, so this tab starts coding agents
 * without a pairing link (`src/app/automation/companion/dev.ts`). Null in builds, Cloud mode,
 * Tauri and Portless development, and with `PAIRDRAW_DEV_AGENTS=0`.
 */
declare const __PAIRDRAW_LOCAL_AGENT_SESSION__: { token: string; agentToken: string } | null

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

/** A module bundled with its imports into one classic script, as a string (`vite/inline-script.ts`). */
declare module '*?script' {
  const source: string
  export default source
}
