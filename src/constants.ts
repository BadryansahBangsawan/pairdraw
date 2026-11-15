export { IS_BROWSER, IS_TAURI } from '@pairdraw/core/constants'

import type { ExportFormatId } from '@pairdraw/scene-graph/export-format'
import type { Color } from '@pairdraw/scene-graph/primitives'

/**
 * The product name people see in the interface. Packages, commands, storage keys, and other
 * identifiers keep the `pairdraw` and `Pairdraw` names.
 */
export const APP_NAME = 'Pairdraw'

/**
 * Whether people can share a document in a live room: the Share popover, joining by link, the
 * room's call, and the name shown to others. Off in Pairdraw. The presence layer itself stays,
 * because AI agents show their cursors through it.
 */
export const COLLABORATION_INCLUDED: boolean = false

/** Whether Home offers a new board, the sticky-note canvas. Off in Pairdraw; boards still open. */
export const BOARD_INCLUDED: boolean = false

/**
 * Whether the app offers the PowerPoint and draw.io exports. Off in Pairdraw, which exports
 * images, PDF, SVG, HTML, and its own documents.
 */
export const EXTRA_EXPORT_FORMATS_INCLUDED: boolean = false

/**
 * Whether the design check marks issues on the canvas, beside layers, and beside pages. Off in
 * Pairdraw: those marks re-checked the whole document after every edit, which slowed long agent
 * runs. The Lint panel still checks the page while it is open.
 */
export const DESIGN_ISSUES_ON_CANVAS_INCLUDED: boolean = false

/** The node export formats `EXTRA_EXPORT_FORMATS_INCLUDED` leaves out of the Export section. */
export const EXTRA_EXPORT_FORMAT_IDS: readonly ExportFormatId[] = ['pptx', 'drawio']

/**
 * The collaboration namespace. It names the shared document format and how peers send it, so
 * builds that sync the layer tree or variables differently, or encode what they send
 * differently, never join each other's rooms; change it with either.
 */
export const COLLAB_APP_ID = 'pairdraw/7'

// 32 base36 characters provide roughly 165 bits of entropy. The room ID is a
// bearer credential and must resist offline enumeration from public signaling topics.
export const ROOM_ID_LENGTH = 32
export const ROOM_ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'
/** How long a room tab tries to reach the service that introduces peers before saying it cannot. */
export const ROOM_UNREACHABLE_MS = 20_000
/** How often a room tab rechecks its connection while it waits for the file. */
export const ROOM_STATUS_TICK_MS = 500

/** The origin of a configured address, or null when it is unset or not a URL. */
function configuredOrigin(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

/**
 * The origin of a hosted Pairdraw web app, named at build time by `VITE_PAIRDRAW_WEB_APP_URL`.
 * Null when the build names none, the default: desktop sign-ins then return through `pairdraw://`
 * links, and room links shared from the desktop app open in the desktop app.
 */
export const WEB_APP_ORIGIN = configuredOrigin(
  typeof __PAIRDRAW_WEB_APP_URL__ === 'string' ? __PAIRDRAW_WEB_APP_URL__ : null
)
/**
 * The hosted Pairdraw Cloud server a build offers first when connecting, named at build time by
 * `VITE_PAIRDRAW_OFFICIAL_CLOUD_URL`. Null when the build names none: then the app offers only
 * self-hosted servers, by the address someone types or a link from that server.
 */
export const OFFICIAL_CLOUD_URL: string | null =
  (typeof __PAIRDRAW_OFFICIAL_CLOUD_URL__ === 'string' && __PAIRDRAW_OFFICIAL_CLOUD_URL__) || null
/** Whether this is the editor a Cloud server serves on its own address (`bun run build:cloud`). */
export const IS_CLOUD_SITE = typeof __PAIRDRAW_CLOUD_SITE__ === 'boolean' && __PAIRDRAW_CLOUD_SITE__
/** Where the desktop app's installers are published. */
export const DESKTOP_DOWNLOAD_URL =
  'https://github.com/BadryansahBangsawan/pairdraw/releases/latest'
export const NODE_DOWNLOAD_URL = 'https://nodejs.org/en/download'

/**
 * A guide in the repository's `packages/docs`, read on GitHub, since Pairdraw has no website of
 * its own: `path` without `.md`, and `anchor` as GitHub derives it from the heading's text, which
 * includes a VitePress `{#id}`.
 */
export function docsURL(path: string, anchor?: string): string {
  const page = `https://github.com/BadryansahBangsawan/pairdraw/blob/master/packages/docs/${path}.md`
  return anchor ? `${page}#${anchor}` : page
}

/**
 * Guides. Settings links each integration section to its guide with one "Learn more" at the end
 * of the section description; alerts link only to the fix, never to docs.
 */
export const MCP_SERVER_DOCS_URL = docsURL('programmable/mcp-server')
/** The guide to Pairdraw Cloud, linked from the Cloud server's own pages. */
export const CLOUD_DOCS_URL = docsURL('user-guide/pairdraw-cloud')
export const WEBMCP_DOCS_URL = docsURL(
  'programmable/mcp-server',
  'browser-native-webmcp-experimental-webmcp'
)
export const MCP_CLIENT_SETUP_DOCS_URL = docsURL(
  'programmable/mcp-server',
  'set-up-from-the-desktop-app-client-setup'
)
export const MCP_CONNECTIONS_DOCS_URL = docsURL('programmable/ai-chat', 'external-mcp-connections')
export const CODING_AGENTS_GUIDE_URL = docsURL('programmable/coding-agents')
export const PI_GUIDE_URL = docsURL('programmable/coding-agents', 'pi')

/** The published release page, with its full notes, for a desktop version. */
export function releaseNotesURL(version: string): string {
  return `https://github.com/BadryansahBangsawan/pairdraw/releases/tag/v${version}`
}

export const PEER_COLORS: Color[] = [
  { r: 0.96, g: 0.26, b: 0.21, a: 1 },
  { r: 0.13, g: 0.59, b: 0.95, a: 1 },
  { r: 0.3, g: 0.69, b: 0.31, a: 1 },
  { r: 1.0, g: 0.76, b: 0.03, a: 1 },
  { r: 0.61, g: 0.15, b: 0.69, a: 1 },
  { r: 1.0, g: 0.34, b: 0.13, a: 1 },
  { r: 0.0, g: 0.74, b: 0.83, a: 1 },
  { r: 0.91, g: 0.12, b: 0.39, a: 1 }
]

export const ASSET_GRID_THUMBNAIL_SIZE = 96
export const ASSET_LIST_THUMBNAIL_SIZE = 40
export const ASSET_THUMBNAIL_RENDER_SCALE = 2

export const HALF_FRAC = 3 / 7
export const HUD_TOP = 12 + 32 + 6 + 32 + 12

export const SWIPE_THRESHOLD = 30
export const SWIPE_VELOCITY_THRESHOLD = 500
export const DRAWER_SPRING_STIFFNESS = 800
export const DRAWER_SPRING_DAMPING = 50

export const ACTION_TOAST_DURATION = 800

export const ACP_PERMISSION_TIMEOUT_MS = 60_000
/** How long a request waits unanswered before a notification says an agent needs you. */
export const AGENT_INPUT_NOTIFY_DELAY_MS = 6_000
