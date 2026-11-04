import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import * as v from 'valibot'

import { repoPath, workspaceRoot } from '#tests/helpers/paths'

/**
 * unplugin-vue-components turns `icon-lucide-grid-2x2` into the component `IconLucideGrid2x2`, and
 * unplugin-icons' resolver kebabs that back into `grid2x2`. Neither is an icon or alias in lucide,
 * so the icon failed to load at runtime. Check every tag against the installed set, deriving the
 * name the same way the build does.
 */
const ICON_TAG_RE = /<icon-lucide-([a-z0-9-]+)/g

const iconSetSchema = v.object({
  icons: v.record(v.string(), v.unknown()),
  aliases: v.optional(v.record(v.string(), v.unknown()))
})

const iconSet = v.parse(
  v.pipe(v.string(), v.parseJson(), iconSetSchema),
  readFileSync(repoPath('node_modules', '@iconify-json', 'lucide', 'icons.json'), 'utf8')
)
const known = new Set([...Object.keys(iconSet.icons), ...Object.keys(iconSet.aliases ?? {})])

/** The variants `@iconify/utils` tries, from `lib/loader/utils.js` `getPossibleIconNames`. */
function possibleIconNames(icon: string): string[] {
  return [
    icon,
    icon.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
    icon.replace(/([a-z])(\d+)/g, '$1-$2')
  ]
}

/** PascalCase from the tag, then the resolver's kebab form, then the name without `icon-lucide-`. */
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

function vueFiles(): string[] {
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
  for (const file of vueFiles()) {
    for (const match of readFileSync(file, 'utf8').matchAll(ICON_TAG_RE)) {
      const tag = `icon-lucide-${match[1]}`
      const icon = iconNameOf(tag)
      if (possibleIconNames(icon).some((name) => known.has(name))) continue
      broken.push(`${tag} (resolves to ${icon}) in ${relative(workspaceRoot(), file)}`)
    }
  }
  expect(broken).toEqual([])
})
