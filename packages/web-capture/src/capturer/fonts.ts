import type { WebCaptureFont } from '#web-capture/format'

/** The fonts a capture's text uses, so an importer knows which families to load. */
export interface FontCollector {
  add(style: CSSStyleDeclaration): void
  list(): WebCaptureFont[]
}

/** The family a browser tries first, without the quotes CSS may put around it. */
export function primaryFontFamily(fontFamily: string): string {
  const first = fontFamily.split(',')[0] ?? ''
  return first.trim().replace(/^(['"])(.*)\1$/, '$2')
}

export function createFontCollector(): FontCollector {
  const fonts = new Map<string, WebCaptureFont>()
  return {
    add(style) {
      const family = primaryFontFamily(style.getPropertyValue('font-family'))
      if (!family) return
      const font = {
        family,
        weight: style.getPropertyValue('font-weight') || '400',
        style: style.getPropertyValue('font-style') || 'normal'
      }
      fonts.set(`${font.family}|${font.weight}|${font.style}`, font)
    },
    list: () => [...fonts.values()]
  }
}
