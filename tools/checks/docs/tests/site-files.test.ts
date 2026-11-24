import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  FALLBACK_MARKER,
  localeFallbacks,
  pageRoute,
  pageTree,
  robotsTxt,
  writeSiteFiles
} from '#docs-config/site-files'

async function fixture() {
  const docsRoot = await mkdtemp(join(tmpdir(), 'pairdraw-docs-site-files-'))
  return docsRoot
}

async function page(root: string, path: string) {
  const file = join(root, path)
  await mkdir(join(file, '..'), { recursive: true })
  await writeFile(file, '# Page', 'utf8')
}

/** English: home, a page, a section index, a builder page. German: three of them, one only there. */
async function tree() {
  const root = await fixture()
  for (const path of [
    'index.md',
    'getting-started.md',
    'user-guide/index.md',
    'development/ai-chat.md'
  ])
    await page(root, path)
  for (const path of [
    'de/getting-started.md',
    'de/user-guide/index.md',
    'de/development/ai-chat.md',
    'de/AGENTS.md'
  ])
    await page(root, path)
  return pageTree(root, ['de', 'ru'])
}

describe('pageRoute', () => {
  test('names a page as the site serves it', () => {
    expect(pageRoute('index.md')).toBe('/')
    expect(pageRoute('getting-started.md')).toBe('/getting-started')
    expect(pageRoute('user-guide/index.md')).toBe('/user-guide/')
    expect(pageRoute('development/ai-chat.md')).toBe('/development/ai-chat')
  })
})

describe('pageTree', () => {
  test('reads each language’s own pages, and a locale-only page stays in its tree', async () => {
    const pages = await tree()

    expect(pages.english).toEqual(['/', '/development/ai-chat', '/getting-started', '/user-guide/'])
    expect([...(pages.locales.de ?? [])].sort()).toEqual([
      '/de/AGENTS',
      '/de/development/ai-chat',
      '/de/getting-started',
      '/de/user-guide/'
    ])
    expect([...(pages.locales.ru ?? [])]).toEqual([])
  })
})

describe('localeFallbacks', () => {
  test('sends a missing translation to the English page, and leaves a present one alone', async () => {
    const rules = localeFallbacks(await tree(), ['de', 'ru'])

    expect(rules).toEqual([
      '/de/ / 302',
      '/ru/ / 302',
      '/ru/development/ai-chat /development/ai-chat 302',
      '/ru/getting-started /getting-started 302',
      '/ru/user-guide/ /user-guide/ 302'
    ])
  })

  test('sends every page of a locale that translated none', async () => {
    const rules = localeFallbacks(await tree(), ['ru'])

    expect(rules).toHaveLength(4)
    expect(rules).toContain('/ru/getting-started /getting-started 302')
    expect(rules).toContain('/ru/ / 302')
  })
})

describe('robotsTxt', () => {
  test('allows the site and names its sitemap only where one is published', () => {
    expect(robotsTxt(null)).toBeNull()
    expect(robotsTxt('')).toBeNull()
    expect(robotsTxt('https://pairdraw.dev')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://pairdraw.dev/sitemap.xml\n'
    )
  })
})

describe('writeSiteFiles', () => {
  test('appends the fallbacks once and writes robots.txt only for a published site', async () => {
    const dist = await fixture()
    await writeFile(join(dist, '_redirects'), '# Legacy routes\n/old /new 301\n', 'utf8')
    const pages = await tree()

    const first = writeSiteFiles(dist, pages, ['de', 'ru'], null)
    const second = writeSiteFiles(dist, pages, ['de', 'ru'], null)

    expect(first).toEqual({ fallbacks: 5, robots: false })
    expect(second.fallbacks).toBe(5)
    const redirects = await readFile(join(dist, '_redirects'), 'utf8')
    expect(redirects.startsWith('# Legacy routes\n/old /new 301\n')).toBe(true)
    expect(redirects.split(FALLBACK_MARKER)).toHaveLength(2)
    expect(redirects).toContain('/ru/getting-started /getting-started 302')
    expect(await readdir(dist)).not.toContain('robots.txt')

    const published = writeSiteFiles(dist, pages, ['de', 'ru'], 'https://pairdraw.dev')
    expect(published).toEqual({ fallbacks: 5, robots: true })
    expect(await readFile(join(dist, 'robots.txt'), 'utf8')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://pairdraw.dev/sitemap.xml\n'
    )
  })
})
