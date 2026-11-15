import type {
  GoogleFamilyOptions,
  providers,
  RemoteFontSource,
  ResolveFontOptions,
  Unifont
} from 'unifont'

import type { WebFontProviderId } from '#core/text/web-font/resolver'

export type WebFontProvider =
  | ReturnType<typeof providers.google>
  | ReturnType<typeof providers.googleicons>
  | ReturnType<typeof providers.fontsource>
  | ReturnType<typeof providers.bunny>
  | ReturnType<typeof providers.fontshare>
/** One or more providers behind a provider setting. */
export type WebFontProviders = [WebFontProvider, ...WebFontProvider[]]
export type WebUnifont = Unifont<WebFontProviders>
export type WebFontResolveOptions = Pick<
  ResolveFontOptions<{ google?: GoogleFamilyOptions }>,
  'weights' | 'styles' | 'formats' | 'subsets' | 'variableAxis' | 'options'
>

type UnifontProviders = typeof providers

/**
 * The unifont providers behind each provider setting. Google serves its Material Symbols from
 * its icon catalogue, as variable fonts with every axis, so its setting covers both.
 */
const providerFactories = {
  google: (from: UnifontProviders): WebFontProviders => [from.google(), from.googleicons()],
  fontsource: (from: UnifontProviders): WebFontProviders => [from.fontsource()],
  bunny: (from: UnifontProviders): WebFontProviders => [from.bunny()],
  fontshare: (from: UnifontProviders): WebFontProviders => [from.fontshare()]
} satisfies Record<WebFontProviderId, (from: UnifontProviders) => WebFontProviders>

/** Unifont, with its CSS parser, loads with the first font looked up rather than with the editor. */
export async function createProviderUnifont(provider: WebFontProviderId): Promise<WebUnifont> {
  const { createUnifont, providers: unifontProviders } = await import('unifont')
  // In a page unifont sends provider requests to its hosted proxy; ours go through the host's
  // fetch, which reaches the providers itself.
  return createUnifont(providerFactories[provider](unifontProviders), {
    throwOnError: false,
    apiBase: false
  })
}

export function isRemoteFontSource(
  source: RemoteFontSource | { name: string }
): source is RemoteFontSource {
  return 'url' in source
}
