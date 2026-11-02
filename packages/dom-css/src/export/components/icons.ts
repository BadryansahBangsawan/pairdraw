import { groupBy } from 'es-toolkit/array'
import { upperFirst } from 'es-toolkit/string'

import { es } from '@open-pencil/emit'

import { claimName } from '../storybook/names'
import type { ComponentModel, ComponentNode } from './model'

/**
 * Where generated components take their icons from: Iconify, which draws every set, or one
 * set's own package. An icon the chosen package does not have stays an Iconify icon.
 */
export const ICON_PACKAGES = [
  'iconify',
  'lucide',
  'heroicons',
  'react-icons',
  'fontawesome'
] as const
export type IconPackage = (typeof ICON_PACKAGES)[number]

export function isIconPackage(value: unknown): value is IconPackage {
  return ICON_PACKAGES.some((id) => id === value)
}

export type IconFramework = 'react' | 'vue'

/** The packages a framework's components can take icons from; react-icons is React's alone. */
export function iconPackagesFor(framework: IconFramework): IconPackage[] {
  return ICON_PACKAGES.filter((id) => id !== 'react-icons' || framework === 'react')
}

/** One name a module exports, and the name the component's script knows it by. */
export interface IconImport {
  source: string
  imported: string
  local: string
}

/**
 * How a component draws an icon from a package: as the icon's own component, or, for Font
 * Awesome, as `FontAwesomeIcon` given the icon's definition.
 */
export type IconDrawing =
  | { type: 'component'; import: IconImport }
  | { type: 'fontawesome'; import: IconImport; component: IconImport }

/** `arrow-down-0-1` → `ArrowDown01`, as the icon packages name their exports. */
function pascalName(name: string): string {
  return name
    .split('-')
    .filter((part) => part.length > 0)
    .map(upperFirst)
    .join('')
}

const one = (source: string, imported: string): IconImport => ({
  source,
  imported,
  local: imported
})

function lucide(name: string, framework: IconFramework): IconImport {
  // Each Lucide package also exports every icon prefixed, apart from any component of the design.
  return one(
    framework === 'react' ? 'lucide-react' : 'lucide-vue-next',
    `Lucide${pascalName(name)}`
  )
}

/** Heroicons 2 names on Iconify: `x` outline, `x-solid`, `x-20-solid` mini, `x-16-solid` micro. */
const HEROICON_STYLES = [
  { suffix: '-20-solid', folder: '20/solid', reactIcons: 'HiMini' },
  { suffix: '-16-solid', folder: '16/solid', reactIcons: 'HiMicro' },
  { suffix: '-solid', folder: '24/solid', reactIcons: 'Hi' }
] as const

function heroicon(name: string): { base: string; folder: string; reactIcons: string } {
  const style = HEROICON_STYLES.find(({ suffix }) => name.endsWith(suffix))
  if (!style) return { base: name, folder: '24/outline', reactIcons: 'HiOutline' }
  return { base: name.slice(0, -style.suffix.length), ...style }
}

/** Iconify sets that `react-icons` ships, by the module and the prefix of its export names. */
const REACT_ICONS_SETS: Partial<Record<string, { module: string; prefix: string }>> = {
  lucide: { module: 'lu', prefix: 'Lu' },
  tabler: { module: 'tb', prefix: 'Tb' },
  feather: { module: 'fi', prefix: 'Fi' },
  ri: { module: 'ri', prefix: 'Ri' },
  bi: { module: 'bs', prefix: 'Bs' },
  ph: { module: 'pi', prefix: 'Pi' },
  'radix-icons': { module: 'rx', prefix: 'Rx' },
  'simple-icons': { module: 'si', prefix: 'Si' },
  'fa6-solid': { module: 'fa6', prefix: 'Fa' },
  'fa6-brands': { module: 'fa6', prefix: 'Fa' },
  'fa6-regular': { module: 'fa6', prefix: 'FaReg' }
}

function reactIcon(prefix: string, name: string): IconImport | null {
  if (prefix === 'heroicons') {
    const { base, reactIcons } = heroicon(name)
    return one('react-icons/hi2', `${reactIcons}${pascalName(base)}`)
  }
  const set = REACT_ICONS_SETS[prefix]
  return set ? one(`react-icons/${set.module}`, `${set.prefix}${pascalName(name)}`) : null
}

/** Font Awesome's free packages by the Iconify sets of versions 5 and 6. */
const FONTAWESOME_STYLES: Partial<Record<string, { source: string; suffix: string }>> = {
  'fa6-solid': { source: '@fortawesome/free-solid-svg-icons', suffix: '' },
  'fa-solid': { source: '@fortawesome/free-solid-svg-icons', suffix: '' },
  'fa6-regular': { source: '@fortawesome/free-regular-svg-icons', suffix: 'Regular' },
  'fa-regular': { source: '@fortawesome/free-regular-svg-icons', suffix: 'Regular' },
  'fa6-brands': { source: '@fortawesome/free-brands-svg-icons', suffix: '' },
  'fa-brands': { source: '@fortawesome/free-brands-svg-icons', suffix: '' }
}

function fontAwesome(prefix: string, name: string, framework: IconFramework): IconDrawing | null {
  const style = FONTAWESOME_STYLES[prefix]
  if (!style) return null
  const imported = `fa${pascalName(name)}`
  return {
    type: 'fontawesome',
    // Solid and regular share names, so a regular icon is known by a name of its own.
    import: { source: style.source, imported, local: `${imported}${style.suffix}` },
    component: one(
      framework === 'react' ? '@fortawesome/react-fontawesome' : '@fortawesome/vue-fontawesome',
      'FontAwesomeIcon'
    )
  }
}

/**
 * How `icon`, an Iconify `prefix:name`, is drawn from `iconPackage` in a component for
 * `framework`; null when that package lacks the icon's set, so Iconify draws it.
 */
export function iconDrawing(
  icon: string,
  iconPackage: IconPackage,
  framework: IconFramework
): IconDrawing | null {
  const separator = icon.indexOf(':')
  if (separator <= 0) return null
  const prefix = icon.slice(0, separator)
  const name = icon.slice(separator + 1)
  if (!name) return null
  switch (iconPackage) {
    case 'lucide':
      return prefix === 'lucide' ? { type: 'component', import: lucide(name, framework) } : null
    case 'heroicons': {
      if (prefix !== 'heroicons') return null
      const { base, folder } = heroicon(name)
      const source = `@heroicons/${framework}/${folder}`
      return { type: 'component', import: one(source, `${pascalName(base)}Icon`) }
    }
    case 'react-icons': {
      // react-icons is React's alone.
      const found = framework === 'react' ? reactIcon(prefix, name) : null
      return found ? { type: 'component', import: found } : null
    }
    case 'fontawesome':
      return fontAwesome(prefix, name, framework)
    default:
      return null
  }
}

/** The components a component's markup uses in place of its layers. */
function referencedComponents(node: ComponentNode, found: string[]): string[] {
  if (node.type === 'reference') found.push(node.component)
  if (node.type === 'element') for (const child of node.children) referencedComponents(child, found)
  return found
}

/**
 * Names the icons a component imports apart from every other name its code knows: the
 * component itself, its group item, the components it uses, and `reserved`, such as Iconify's.
 * A layer named `Bell Icon` holding Heroicons' bell would otherwise import `BellIcon` beside
 * declaring it; the import is aliased instead, and each module's icon keeps one name.
 */
export function iconNamer(
  component: ComponentModel,
  reserved: readonly string[]
): (drawing: IconDrawing) => IconDrawing {
  const taken = new Set([
    component.name,
    ...(component.item ? [component.item.name] : []),
    ...referencedComponents(component.tree, []),
    ...reserved
  ])
  const locals = new Map<string, string>()
  const named = (entry: IconImport): IconImport => {
    const key = `${entry.source}\0${entry.imported}`
    let local = locals.get(key)
    if (local === undefined) {
      local = claimName(entry.local, taken)
      locals.set(key, local)
    }
    return { ...entry, local }
  }
  return (drawing) =>
    drawing.type === 'fontawesome'
      ? { ...drawing, import: named(drawing.import), component: named(drawing.component) }
      : { ...drawing, import: named(drawing.import) }
}

/** Every import a component's icons need, one declaration per module, in a stable order. */
export function iconImportDeclarations(imports: readonly IconImport[]): es.SyntaxNode[] {
  const byLocal = new Map(imports.map((entry) => [entry.local, entry]))
  const bySource = groupBy([...byLocal.values()], (entry) => entry.source)
  return Object.keys(bySource)
    .sort()
    .map((source) => ({
      type: 'ImportDeclaration',
      importKind: 'value',
      specifiers: (bySource[source] ?? [])
        .toSorted((a, b) => a.local.localeCompare(b.local))
        .map((entry) => ({
          type: 'ImportSpecifier',
          imported: es.identifier(entry.imported),
          local: es.identifier(entry.local)
        })),
      source: es.string(source)
    }))
}

/** The imports a drawing needs. */
export function drawingImports(drawing: IconDrawing): IconImport[] {
  return drawing.type === 'fontawesome' ? [drawing.import, drawing.component] : [drawing.import]
}
