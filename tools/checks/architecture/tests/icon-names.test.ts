/**
 * Verifies every `icon-lucide-*` template tag resolves to an icon present in the installed
 * `@iconify-json/lucide` set (either directly, or via an alias).
 *
 * unplugin-vue-components + unplugin-icons turn the PascalCase component name into a kebab icon
 * name before asking `@iconify/utils` to load it. The loader's `getPossibleIconNames` then expands
 * that name with the variants from `node_modules/@iconify/utils/lib/loader/utils.js`. If none of
 * the variants is a direct icon or alias, the runtime fails to render the icon (`Icon <prefix>/<name>`
 * not found`) — this test catches that class of bug ahead of boot.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { repoPath, workspaceRoot } from '#tests/helpers/paths'

const ICON_TAG_RE = /<icon-lucide-([a-z0-9-]+)/g

const lucide = JSON.parse(
  readFileSync(repoPath('node_modules', '@iconify-json', 'lucide', 'icons.json'), 'utf8')
) as { icons: Record<string, unknown>; aliases?: Record<string, unknown> }
const known = new Set([
  ...Object.keys(lucide.icons),
  ...Object.keys(lucide.aliases ?? {})
])

/** Replicate `@iconify/utils` loader: the tag's kebab form plus the two casing variants. */
function possibleIconNames(icon: string): string[] {
  return [
    icon,
    icon.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
    icon.replace(/([a-z])(\d+)/g, '$1-$2')
  ]
}

/**
 * Mirror unplugin-vue-components (PascalCase from kebab) → unplugin-icons/resolver (camelToKebab)
 * → icon name (strip prefix).
 */
function iconNameOf(tag: string): string {
  const pascal = tag
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')
  return pascal
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([a-z])(\d)/g, '$1-$2')
    .toLowerCase()
    .replace(/^icon-lucide-/, '')
}

function collectVueFiles(): string[] {
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) walk(path)
      else if (entry.endsWith('.vue')) files.push(path)
    }
  }
  walk(repoPath('src'))
  walk(repoPath('packages'))
  return files
}

test('every icon-lucide tag names an icon the installed set has', () => {
  const broken: string[] = []
  for (const file of collectVueFiles()) {
    for (const match of readFileSync(file, 'utf8').matchAll(ICON_TAG_RE)) {
      const tag = `icon-lucide-${match[1]}`
      const icon = iconNameOf(tag)
      if (possibleIconNames(icon).some((name) => known.has(name))) continue
      broken.push(`${tag} (resolves to ${icon}) in ${relative(workspaceRoot(), file)}`)
    }
  }
  expect(broken).toEqual([])
})
