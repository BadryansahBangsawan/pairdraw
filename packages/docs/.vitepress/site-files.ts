import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

/** Where the generated fallbacks start, so a second build does not append them twice. */
export const FALLBACK_MARKER = '# Untranslated pages fall back to their English text'

/** The page a Markdown file builds, as VitePress names it with `cleanUrls`: no `.md`, no `.html`. */
export function pageRoute(file: string): string {
  const withoutExtension = file.split(sep).join('/').replace(/\.md$/, '')
  const isIndex = withoutExtension === 'index' || withoutExtension.endsWith('/index')
  const path = isIndex ? withoutExtension.replace(/(?:^|\/)index$/, '') : withoutExtension
  if (path === '') return '/'
  return `/${path}${isIndex ? '/' : ''}`
}

function markdownFiles(root: string, skip: ReadonlySet<string>): string[] {
  const found: string[] = []
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || skip.has(entry.name)) continue
        visit(path)
      } else if (entry.name.endsWith('.md')) {
        found.push(relative(root, path).split(sep).join('/'))
      }
    }
  }
  if (existsSync(root) && statSync(root).isDirectory()) visit(root)
  return found.sort()
}

export interface PageTree {
  /** The English pages, as routes. */
  english: readonly string[]
  /** Each locale's own pages, as routes under its prefix. */
  locales: Record<string, ReadonlySet<string>>
}

/**
 * The pages a docs tree builds, by language. A locale holds the pages it translated: the same
 * Markdown path under its prefix. A locale-only page stays in the tree but no fallback names it.
 */
export function pageTree(docsRoot: string, locales: readonly string[]): PageTree {
  const english = markdownFiles(docsRoot, new Set(locales)).map(pageRoute).sort()
  const trees = Object.fromEntries(
    locales.map((locale) => {
      const prefix = `/${locale}`
      const routes = markdownFiles(join(docsRoot, locale), new Set()).map(
        (file) => `${prefix}${pageRoute(file)}`
      )
      return [locale, new Set(routes)]
    })
  )
  return { english, locales: trees }
}

/**
 * A 302 for each locale page that has no translation, pointing at the English page. A switcher
 * links every locale from every page, so without these its links 404 on untranslated pages.
 */
export function localeFallbacks(tree: PageTree, locales: readonly string[]): string[] {
  const rules = new Set<string>()
  for (const route of tree.english) {
    for (const locale of locales) {
      const translated = `${route === '/' ? `/${locale}/` : `/${locale}${route}`}`
      if (tree.locales[locale]?.has(translated)) continue
      rules.add(`${translated} ${route} 302`)
    }
  }
  return [...rules].sort()
}

/**
 * The robots file a published site serves. A build without a site address has none, so a preview
 * is never pointed at the live sitemap.
 */
export function robotsTxt(siteUrl: string | null): string | null {
  if (!siteUrl) return null
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`
}

/**
 * Writes what only a built site can know into `dist`: the language fallbacks appended to the
 * copied `_redirects`, and robots.txt naming the sitemap. Running it twice adds no second copy.
 */
export function writeSiteFiles(
  dist: string,
  tree: PageTree,
  locales: readonly string[],
  siteUrl: string | null
): { fallbacks: number; robots: boolean } {
  const redirectsPath = resolve(dist, '_redirects')
  const existing = existsSync(redirectsPath) ? readFileSync(redirectsPath, 'utf8') : ''
  const rules = localeFallbacks(tree, locales)
  if (rules.length > 0 && !existing.includes(FALLBACK_MARKER)) {
    const appended = `${existing}${existing.endsWith('\n') || existing === '' ? '' : '\n'}\n${FALLBACK_MARKER}\n${rules.join('\n')}\n`
    writeFileSync(redirectsPath, appended, 'utf8')
  }
  const robots = robotsTxt(siteUrl)
  if (robots) writeFileSync(resolve(dist, 'robots.txt'), robots, 'utf8')
  return { fallbacks: rules.length, robots: robots !== null }
}
