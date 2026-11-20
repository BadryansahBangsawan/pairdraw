import { memoize } from 'es-toolkit/function'
import TS_CHARACTERS from 'opencc-js/dict/TSCharacters'

import { ResourceCache } from '#core/cache/resource'
import {
  CJK_FALLBACK_FAMILIES_LINUX,
  CJK_FALLBACK_FAMILIES_MACOS,
  CJK_FALLBACK_FAMILIES_WINDOWS,
  CJK_GOOGLE_FONTS
} from '#core/constants'

export type FontFallbackScript =
  | 'cjk'
  | 'cjk-sc'
  | 'cjk-tc'
  | 'cjk-jp'
  | 'cjk-kr'
  | 'arabic'
  | 'hebrew'
  | 'thai'
  | 'devanagari'

/** The fallbacks for scripts written in letters, which the renderer tries before the CJK ones. */
export const LETTER_FALLBACK_SCRIPTS = [
  'arabic',
  'hebrew',
  'thai',
  'devanagari'
] as const satisfies readonly FontFallbackScript[]

export type LetterFallbackScript = (typeof LETTER_FALLBACK_SCRIPTS)[number]

/** Characters of the writing systems that need a fallback font, by their Unicode script. */
export const ARABIC_CHARACTER = /\p{Script=Arabic}/u
export const HEBREW_CHARACTER = /\p{Script=Hebrew}/u
export const THAI_CHARACTER = /\p{Script=Thai}/u
export const DEVANAGARI_CHARACTER = /\p{Script=Devanagari}/u
export const HANGUL_CHARACTER = /\p{Script=Hangul}/u
export const KANA_CHARACTER = /[\p{Script=Hiragana}\p{Script=Katakana}]/u
export const HAN_CHARACTER = /\p{Script=Han}/u
export const CJK_CHARACTER =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
/**
 * What CJK text draws from its fallback: every character Unicode lists as used with a CJK script
 * (its letters, punctuation, strokes, and Bopomofo), and the East Asian presentation forms, which
 * it lists with none: vertical, compatibility, halfwidth and fullwidth forms.
 */
export const CJK_FALLBACK_CHARACTER =
  /[\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}\p{scx=Hangul}\p{scx=Bopomofo}\u3000\ufe10-\ufe1f\ufe30-\ufe4f\uff00-\uffef]/u

/**
 * Whether `script`'s fallback is loaded to draw `character`: the text's characters of its
 * writing system, and the Han, punctuation, and forms the CJK languages share, but not another
 * language's letters, which that language's fallback loads for.
 */
export function fallbackDrawsCharacter(script: FontFallbackScript, character: string): boolean {
  switch (script) {
    case 'arabic':
      return ARABIC_CHARACTER.test(character)
    case 'hebrew':
      return HEBREW_CHARACTER.test(character)
    case 'thai':
      return THAI_CHARACTER.test(character)
    case 'devanagari':
      return DEVANAGARI_CHARACTER.test(character)
  }
  if (!CJK_FALLBACK_CHARACTER.test(character)) return false
  if (script === 'cjk') return true
  if (HANGUL_CHARACTER.test(character)) return script === 'cjk-kr'
  if (KANA_CHARACTER.test(character)) return script === 'cjk-jp'
  return true
}

/**
 * Han characters written only in Traditional Chinese: those OpenCC's Traditional-to-Simplified
 * character table changes. A guide to which fallback to load first, not language identification.
 */
const TRADITIONAL_ONLY_HAN = new Set(
  TS_CHARACTERS.split('|').flatMap((entry) => {
    const [traditional, ...simplified] = entry.split(' ')
    return simplified.includes(traditional) ? [] : [traditional]
  })
)

export function isTraditionalOnlyHan(character: string): boolean {
  return TRADITIONAL_ONLY_HAN.has(character)
}

/** The fallback a character needs, if any; a language picks among the Chinese and Japanese ones. */
export function fontFallbackScriptForCharacter(
  char: string,
  language?: string | null
): FontFallbackScript | null {
  if (ARABIC_CHARACTER.test(char)) return 'arabic'
  if (HEBREW_CHARACTER.test(char)) return 'hebrew'
  if (THAI_CHARACTER.test(char)) return 'thai'
  if (DEVANAGARI_CHARACTER.test(char)) return 'devanagari'
  if (HANGUL_CHARACTER.test(char)) return 'cjk-kr'
  if (KANA_CHARACTER.test(char)) return 'cjk-jp'
  const languageScript = cjkFallbackScriptForLanguage(language)
  if (languageScript && HAN_CHARACTER.test(char)) return languageScript
  if (isTraditionalOnlyHan(char)) return 'cjk-tc'
  if (HAN_CHARACTER.test(char)) return 'cjk-sc'
  return null
}

/**
 * The CJK fallback a BCP 47 language tag's script asks for, as Unicode's likely subtags fill it in.
 * Text asks once per character, so each tag is read once.
 */
export function cjkFallbackScriptForLanguage(
  language: string | null | undefined
): Extract<FontFallbackScript, 'cjk-sc' | 'cjk-tc' | 'cjk-jp' | 'cjk-kr'> | null {
  return language ? languageFallback(language) : null
}

/** How many language tags keep their answer; a document names a handful. */
const CACHED_LANGUAGE_TAGS = 64

const languageFallback = memoize(
  (
    language: string
  ): Extract<FontFallbackScript, 'cjk-sc' | 'cjk-tc' | 'cjk-jp' | 'cjk-kr'> | null => {
    let locale: Intl.Locale
    try {
      locale = new Intl.Locale(language.replaceAll('_', '-'))
    } catch {
      return null
    }
    // `Hani` names Han without telling Simplified from Traditional, so the region does.
    if (locale.script === 'Hani')
      locale = new Intl.Locale(locale.language, { region: locale.region })
    const { script } = locale.maximize()
    return script ? (LANGUAGE_SCRIPT_FALLBACKS[script] ?? null) : null
  },
  { cache: new ResourceCache({ maxEntries: CACHED_LANGUAGE_TAGS }) }
)

const LANGUAGE_SCRIPT_FALLBACKS: Partial<
  Record<string, Extract<FontFallbackScript, 'cjk-sc' | 'cjk-tc' | 'cjk-jp' | 'cjk-kr'>>
> = { Hans: 'cjk-sc', Hant: 'cjk-tc', Jpan: 'cjk-jp', Kore: 'cjk-kr' }

export interface FontFallbackManifestEntry {
  script: FontFallbackScript
  localFamilies: string[]
  remoteFamilies: string[]
}

export const ARABIC_LOCAL_FALLBACK_FAMILIES = [
  'Noto Naskh Arabic',
  'Noto Sans Arabic',
  'Geeza Pro',
  'Arial',
  'Tahoma',
  'Amiri'
]

export const ARABIC_REMOTE_FALLBACK_FAMILIES = ['Noto Naskh Arabic', 'Noto Sans Arabic']

export function cjkLocalFallbackFamilies(userAgent?: string): string[] {
  if (!userAgent) return [...CJK_FALLBACK_FAMILIES_LINUX]
  if (userAgent.includes('Mac')) return [...CJK_FALLBACK_FAMILIES_MACOS]
  if (userAgent.includes('Windows')) return [...CJK_FALLBACK_FAMILIES_WINDOWS]
  return [...CJK_FALLBACK_FAMILIES_LINUX]
}

function platformFamilies(
  userAgent: string | undefined,
  families: Record<'mac' | 'windows' | 'linux', string[]>
): string[] {
  if (!userAgent) return families.linux
  if (userAgent.includes('Mac')) return families.mac
  if (userAgent.includes('Windows')) return families.windows
  return families.linux
}

function cjkScriptLocalFallbackFamilies(
  script: Extract<FontFallbackScript, 'cjk-sc' | 'cjk-tc' | 'cjk-jp' | 'cjk-kr'>,
  userAgent?: string
): string[] {
  switch (script) {
    case 'cjk-tc':
      return platformFamilies(userAgent, {
        mac: ['PingFang TC', 'Heiti TC', 'PingFang SC', 'Hiragino Sans'],
        windows: ['Microsoft JhengHei', 'Microsoft YaHei', 'Microsoft YaHei UI', 'SimSun'],
        linux: ['Noto Sans CJK TC', 'Noto Sans CJK SC', 'Droid Sans Fallback']
      })
    case 'cjk-jp':
      return platformFamilies(userAgent, {
        mac: ['Hiragino Sans', 'PingFang SC', 'PingFang TC'],
        windows: ['Yu Gothic', 'Microsoft YaHei', 'Microsoft JhengHei'],
        linux: ['Noto Sans CJK JP', 'Noto Sans CJK SC', 'Droid Sans Fallback']
      })
    case 'cjk-kr':
      return platformFamilies(userAgent, {
        mac: ['Apple SD Gothic Neo', 'PingFang SC', 'Hiragino Sans'],
        windows: ['Malgun Gothic', 'Microsoft YaHei', 'Yu Gothic'],
        linux: ['Noto Sans CJK KR', 'Noto Sans CJK SC', 'Droid Sans Fallback']
      })
    default:
      return platformFamilies(userAgent, {
        mac: ['PingFang SC', 'Heiti SC', 'PingFang TC', 'Hiragino Sans'],
        windows: ['Microsoft YaHei', 'Microsoft YaHei UI', 'SimHei', 'SimSun'],
        linux: ['Noto Sans CJK SC', 'WenQuanYi Micro Hei', 'Droid Sans Fallback']
      })
  }
}

/**
 * Installed fonts that draw Hebrew, Thai, and Devanagari on each system, then the Noto family
 * Google Fonts serves for it, so text in these scripts draws without bundling their fonts.
 */
const LETTER_SCRIPT_FAMILIES: Record<
  Exclude<LetterFallbackScript, 'arabic'>,
  { local: Record<'mac' | 'windows' | 'linux', string[]>; remote: string[] }
> = {
  hebrew: {
    local: {
      mac: ['Arial Hebrew', 'Lucida Grande'],
      windows: ['Segoe UI', 'Arial', 'David'],
      linux: ['Noto Sans Hebrew', 'DejaVu Sans']
    },
    remote: ['Noto Sans Hebrew']
  },
  thai: {
    local: {
      mac: ['Thonburi', 'Sukhumvit Set', 'Ayuthaya'],
      windows: ['Leelawadee UI', 'Tahoma'],
      linux: ['Noto Sans Thai', 'Loma']
    },
    remote: ['Noto Sans Thai']
  },
  devanagari: {
    local: {
      mac: ['Kohinoor Devanagari', 'Devanagari Sangam MN', 'Devanagari MT'],
      windows: ['Nirmala UI', 'Mangal'],
      linux: ['Noto Sans Devanagari', 'Lohit Devanagari']
    },
    remote: ['Noto Sans Devanagari']
  }
}

function letterScriptEntry(
  script: Exclude<LetterFallbackScript, 'arabic'>,
  userAgent?: string
): FontFallbackManifestEntry {
  const families = LETTER_SCRIPT_FAMILIES[script]
  return {
    script,
    localFamilies: [...platformFamilies(userAgent, families.local)],
    remoteFamilies: [...families.remote]
  }
}

const CJK_SCRIPT_REMOTE_FAMILIES: Record<
  Extract<FontFallbackScript, 'cjk-sc' | 'cjk-tc' | 'cjk-jp' | 'cjk-kr'>,
  string[]
> = {
  'cjk-sc': ['Noto Sans SC'],
  'cjk-tc': ['Noto Sans TC', 'Noto Sans SC'],
  'cjk-jp': ['Noto Sans JP', 'Noto Sans SC'],
  'cjk-kr': ['Noto Sans KR', 'Noto Sans SC']
}

export function fontFallbackManifest(
  userAgent?: string
): Record<FontFallbackScript, FontFallbackManifestEntry> {
  return {
    cjk: {
      script: 'cjk',
      localFamilies: cjkLocalFallbackFamilies(userAgent),
      remoteFamilies: [...CJK_GOOGLE_FONTS]
    },
    'cjk-sc': {
      script: 'cjk-sc',
      localFamilies: cjkScriptLocalFallbackFamilies('cjk-sc', userAgent),
      remoteFamilies: CJK_SCRIPT_REMOTE_FAMILIES['cjk-sc']
    },
    'cjk-tc': {
      script: 'cjk-tc',
      localFamilies: cjkScriptLocalFallbackFamilies('cjk-tc', userAgent),
      remoteFamilies: CJK_SCRIPT_REMOTE_FAMILIES['cjk-tc']
    },
    'cjk-jp': {
      script: 'cjk-jp',
      localFamilies: cjkScriptLocalFallbackFamilies('cjk-jp', userAgent),
      remoteFamilies: CJK_SCRIPT_REMOTE_FAMILIES['cjk-jp']
    },
    'cjk-kr': {
      script: 'cjk-kr',
      localFamilies: cjkScriptLocalFallbackFamilies('cjk-kr', userAgent),
      remoteFamilies: CJK_SCRIPT_REMOTE_FAMILIES['cjk-kr']
    },
    arabic: {
      script: 'arabic',
      localFamilies: [...ARABIC_LOCAL_FALLBACK_FAMILIES],
      remoteFamilies: [...ARABIC_REMOTE_FALLBACK_FAMILIES]
    },
    hebrew: letterScriptEntry('hebrew', userAgent),
    thai: letterScriptEntry('thai', userAgent),
    devanagari: letterScriptEntry('devanagari', userAgent)
  }
}

export function fontFallbackEntry(
  script: FontFallbackScript,
  userAgent?: string
): FontFallbackManifestEntry {
  return fontFallbackManifest(userAgent)[script]
}
