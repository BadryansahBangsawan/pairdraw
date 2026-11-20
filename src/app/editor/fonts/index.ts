import { useLocalStorage } from '@vueuse/core'
import * as v from 'valibot'
import { watch } from 'vue'

import {
  DEFAULT_WEB_FONT_PROVIDER_SETTINGS,
  WEB_FONT_PROVIDER_IDS,
  collectGraphFontRequirements,
  fontManager,
  missingGraphFontScripts,
  type FontFamilyOption,
  type HostFontFamily,
  type LocalFontAccessState,
  type WebFontProviderId,
  UnsupportedFontFormatError
} from '@pairdraw/core/text'
import type { SceneGraph } from '@pairdraw/scene-graph'

import { browserWebFontFetch } from '@/app/editor/fonts/browser-fetch'
import {
  clearDownloadedFontCache as clearTauriDownloadedFontCache,
  createTauriDownloadedFontCache,
  downloadedFontCacheSummary as tauriDownloadedFontCacheSummary
} from '@/app/editor/fonts/cache'
import { migrateRenamedSettingKey, type RenamedSettingKey } from '@/app/settings/renamed-keys'
import { isTauri } from '@/app/tauri/env'
import { tauriFetch } from '@/app/tauri/http'
import { IS_TAURI } from '@/constants'

if (typeof navigator !== 'undefined') {
  fontManager.setFallbackUserAgent(navigator.userAgent)
}

export type FontProviderSettings = Record<WebFontProviderId, boolean>

const ONLINE_FONTS_STORAGE_KEY = 'pairdraw:online-fonts-enabled'
const FONT_PROVIDERS_STORAGE_KEY = 'pairdraw:font-providers'

const storedFontProvidersSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.check((settings) => !Array.isArray(settings)),
  v.record(v.string(), v.boolean())
)

// Pairdraw 0.16 stored both settings under the keys it inherited from OpenPencil.
export const ONLINE_FONTS_KEY_RENAME: RenamedSettingKey = {
  from: 'op-online-fonts-enabled',
  to: ONLINE_FONTS_STORAGE_KEY,
  read: (stored) => (stored === 'true' || stored === 'false' ? stored : null)
}

export const FONT_PROVIDERS_KEY_RENAME: RenamedSettingKey = {
  from: 'op-font-providers',
  to: FONT_PROVIDERS_STORAGE_KEY,
  read: (stored) => {
    const parsed = v.safeParse(storedFontProvidersSchema, stored)
    if (!parsed.success) return null
    const settings: FontProviderSettings = { ...DEFAULT_WEB_FONT_PROVIDER_SETTINGS }
    for (const provider of WEB_FONT_PROVIDER_IDS) {
      settings[provider] = parsed.output[provider] ?? settings[provider]
    }
    return JSON.stringify(settings)
  }
}

migrateRenamedSettingKey(ONLINE_FONTS_KEY_RENAME)
migrateRenamedSettingKey(FONT_PROVIDERS_KEY_RENAME)

export const onlineFontsEnabled = useLocalStorage(ONLINE_FONTS_STORAGE_KEY, true)
export const fontProviderSettings = useLocalStorage<FontProviderSettings>(
  FONT_PROVIDERS_STORAGE_KEY,
  DEFAULT_WEB_FONT_PROVIDER_SETTINGS
)

watch(
  [onlineFontsEnabled, fontProviderSettings],
  () => {
    fontManager.setOnlineFontProviders(
      onlineFontsEnabled.value
        ? Object.fromEntries(
            WEB_FONT_PROVIDER_IDS.map((provider) => [
              provider,
              fontProviderSettings.value[provider] && (isTauri() || provider !== 'google')
            ])
          )
        : {}
    )
  },
  { deep: true, immediate: true }
)

let tauriFontCacheConfigured = false

function configureTauriFontCache() {
  if (tauriFontCacheConfigured || !isTauri()) return
  tauriFontCacheConfigured = true
  fontManager.setDownloadedFontCache(createTauriDownloadedFontCache())
  fontManager.setWebFontFetch(tauriFetch)
  fontManager.setHostFontLoader(loadSystemFont)
}

configureTauriFontCache()
if (!isTauri()) fontManager.setWebFontFetch(browserWebFontFetch)

let tauriFontsCache: HostFontFamily[] | null = null
let tauriFontsPromise: Promise<HostFontFamily[]> | null = null

async function getTauriFonts(): Promise<HostFontFamily[]> {
  if (tauriFontsCache) return tauriFontsCache
  if (!tauriFontsPromise) {
    tauriFontsPromise = import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke<HostFontFamily[]>('list_system_fonts'))
      .then((fonts) => {
        tauriFontsCache = fonts
        // The weight list and family switches read each family's faces from these.
        fontManager.setHostFontCatalog(fonts)
        return fonts
      })
      .catch(() => [])
  }
  return tauriFontsPromise
}

export function preloadFonts(): void {
  configureTauriFontCache()
  // The installed families are listed ahead for the font picker. The page draws them by name
  // already; a face registered under a family's name would stand in for all of its faces.
  if (isTauri()) {
    void getTauriFonts()
    return
  }
  if (onlineFontsEnabled.value) fontManager.preloadWebFontFamilies()
}

export function localFontAccessState(): LocalFontAccessState {
  return isTauri() ? 'granted' : fontManager.localAccessState()
}

export async function requestLocalFontAccess(): Promise<FontFamilyOption[]> {
  if (isTauri()) return listFamilies()
  await fontManager.requestLocalFontAccess()
  return listFamilies()
}

export async function downloadedFontCacheSummary() {
  configureTauriFontCache()
  if (!isTauri()) return { count: 0, byteLength: 0, updatedAt: null }
  return tauriDownloadedFontCacheSummary()
}

export async function clearDownloadedFontCache(): Promise<void> {
  configureTauriFontCache()
  if (!isTauri()) return
  await clearTauriDownloadedFontCache()
}

export async function predownloadFallbackFonts() {
  return fontManager.ensureFallbackPack()
}

export async function listFamilies(): Promise<FontFamilyOption[]> {
  // The font manager lists the installed families once the host has read them.
  await listFonts()
  return fontManager.listFamilyOptions()
}

export async function listFonts(): Promise<HostFontFamily[]> {
  configureTauriFontCache()
  if (isTauri()) {
    return getTauriFonts()
  }
  return []
}

interface FontRenderInvalidator {
  invalidateAllPictures(): void
}

export async function ensureGraphFonts(
  graph: SceneGraph,
  nodeIds: string[],
  renderer?: FontRenderInvalidator | null
): Promise<boolean> {
  fontManager.blockNodesUntilFontsResolve(nodeIds)
  try {
    const generationBefore = fontManager.generation()
    const fontKeys = fontManager.collectFontKeys(graph, nodeIds)
    const requirements = collectGraphFontRequirements(graph, nodeIds)
    const { characters } = requirements
    await Promise.all(fontKeys.map(([family, style]) => loadFont(family, style, characters)))
    const fallbackScripts = missingGraphFontScripts(requirements, {
      treatUnknownCoverageAsMissing: IS_TAURI
    })
    if (fallbackScripts.length > 0) {
      const fallbacks = await fontManager.ensureFallbackPack(fallbackScripts, characters)
      if (Object.values(fallbacks).some((families) => families.length > 0)) {
        clearTextPictures(graph, nodeIds)
      }
    } else if (fontManager.generation() !== generationBefore) {
      clearTextPictures(graph, nodeIds)
    }
    return fontManager.generation() !== generationBefore || fallbackScripts.length > 0
  } finally {
    fontManager.unblockNodes(nodeIds)
    renderer?.invalidateAllPictures()
  }
}

function clearTextPictures(graph: SceneGraph, nodeIds: string[]): void {
  const clear = (id: string) => {
    const node = graph.getNode(id)
    if (!node) return
    if (node.type === 'TEXT') node.textPicture = null
    for (const childId of node.childIds) clear(childId)
  }
  for (const id of nodeIds) clear(id)
}

type NativeFontLoadError = { code?: 'not-found' | 'unsupported-format' | 'failed' }

async function loadSystemFont(family: string, style = 'Regular'): Promise<ArrayBuffer | null> {
  if (!isTauri()) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const data = await invoke<ArrayBuffer>('load_system_font', { family, style })
    if (data.byteLength === 0) return null
    return data
  } catch (error) {
    if ((error as NativeFontLoadError | null)?.code === 'unsupported-format') {
      throw new UnsupportedFontFormatError(family, style)
    }
    return null
  }
}

export async function loadFont(
  family: string,
  style = 'Regular',
  characters = '',
  signal?: AbortSignal
): Promise<ArrayBuffer | null> {
  configureTauriFontCache()
  return fontManager.loadFont(family, style, characters, signal)
}
