import { uniq } from 'es-toolkit/array'
import { mapValues } from 'es-toolkit/object'
import { isEmptyObject } from 'es-toolkit/predicate'

import { IMPORTED_IMAGE_PREFIX, isDataURL, isDocumentAssetPath } from './assets'
import type { PenDocument, PenNode, PenOverride, PenVariable } from './schema'
import { isVarRef } from './variables'

/** A `.pen` document another one imports, as the importing document names its contents. */
export interface PenImport {
  /** The path the importing document names it with, relative to that document. */
  path: string
  /** Its layers, components, and variables under the alias, from `importedDocument`. */
  doc: PenDocument
}

/** The documents a document imports, by the alias it names each one with. */
export type PenImports = ReadonlyMap<string, PenImport>

/**
 * The name an image an imported document draws goes by in the document importing it as `alias`:
 * a file beside the imported document, or one a document it imports draws, gets the alias, so it
 * never meets a file of the same name beside the importer. A data URL carries the image itself
 * and keeps its name; a URL of any other kind names nothing a host loads.
 */
function importedImageURL(alias: string, url: string): string {
  if (isDataURL(url)) return url
  if (isDocumentAssetPath(url) || url.startsWith(IMPORTED_IMAGE_PREFIX)) {
    return `${IMPORTED_IMAGE_PREFIX}${alias}/${url}`
  }
  return url
}

/** Fields that hold layers or layer IDs, which `renameOverride` renames itself. */
const STRUCTURAL_FIELDS: ReadonlySet<string> = new Set([
  'id',
  'ref',
  'slot',
  'children',
  'descendants'
])

/** How an imported document's names read in the document importing it. */
interface Renaming {
  id: (id: string) => string
  /** A value of the imported document's own, with its variables and image files renamed. */
  value: (value: unknown) => unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function renaming(alias: string, variables: ReadonlySet<string>): Renaming {
  const id = (raw: string) => `${alias}:${raw}`
  const value = (raw: unknown): unknown => {
    // Only the document's own variables: text such as `$12.00` names no variable to rename.
    if (isVarRef(raw)) return variables.has(raw.slice(1)) ? `$${id(raw.slice(1))}` : raw
    if (Array.isArray(raw)) return raw.map(value)
    if (!isRecord(raw)) return raw
    const renamed = mapValues(raw, (field) => value(field))
    if (raw.type === 'image' && typeof raw.url === 'string') {
      renamed.url = importedImageURL(alias, raw.url)
    }
    return renamed
  }
  return { id, value }
}

function renameOverride(override: PenOverride, names: Renaming): PenOverride {
  const renamed: PenOverride = {}
  for (const [key, field] of Object.entries(override)) {
    if (!STRUCTURAL_FIELDS.has(key)) renamed[key] = names.value(field)
  }
  if (override.id !== undefined) renamed.id = names.id(override.id)
  if (override.ref !== undefined) renamed.ref = names.id(override.ref)
  if (Array.isArray(override.slot)) renamed.slot = override.slot.map(names.id)
  else if (override.slot !== undefined) renamed.slot = override.slot
  if (override.children) {
    renamed.children = override.children.map((child) => renameNode(child, names))
  }
  if (override.descendants) {
    // A key is a path of layer IDs, each inside the copy the one before it names.
    renamed.descendants = Object.fromEntries(
      Object.entries(override.descendants).map(([path, inner]) => [
        path.split('/').map(names.id).join('/'),
        renameOverride(inner, names)
      ])
    )
  }
  return renamed
}

function renameNode(node: PenNode, names: Renaming): PenNode {
  return { ...renameOverride(node, names), type: node.type, id: names.id(node.id) }
}

/** Each theme axis with the values any of the documents gives it, the importer's first. */
function mergeThemes(themes: readonly PenDocument['themes'][]): PenDocument['themes'] {
  const merged: Record<string, string[]> = {}
  for (const axes of themes) {
    for (const [axis, values] of Object.entries(axes ?? {})) {
      merged[axis] = uniq([...(merged[axis] ?? []), ...values])
    }
  }
  return isEmptyObject(merged) ? undefined : merged
}

/**
 * A document with the documents it imports read into it: their variables, theme axes, and layers,
 * which it names as `<alias>:<id>` and `$<alias>:<variable>`, after its own. The document's own
 * variables win a name both have.
 */
export function withImports(doc: PenDocument, imports: PenImports): PenDocument {
  if (imports.size === 0) return doc
  const docs = [...imports.values()].map((entry) => entry.doc)
  const variables: Record<string, PenVariable> = {}
  for (const imported of docs) Object.assign(variables, imported.variables)
  Object.assign(variables, doc.variables)
  return {
    ...doc,
    imports: undefined,
    themes: mergeThemes([doc.themes, ...docs.map((imported) => imported.themes)]),
    variables,
    children: [...doc.children, ...docs.flatMap((imported) => imported.children)]
  }
}

/**
 * A document as the document importing it as `alias` from `path` names it: the documents it
 * imports read into it by `withImports`, then every layer ID, component reference, override path,
 * variable, and image file it names prefixed with the alias, as pen.dev names an imported
 * document's components `alias:id` and its variables `$alias:name`.
 */
export function importedDocument(
  alias: string,
  path: string,
  doc: PenDocument,
  imports: PenImports
): PenImport {
  const flat = withImports(doc, imports)
  const names = renaming(alias, new Set(Object.keys(flat.variables ?? {})))
  const variables: Record<string, PenVariable> = {}
  for (const [name, variable] of Object.entries(flat.variables ?? {})) {
    const value = names.value(variable.value)
    variables[names.id(name)] = {
      ...variable,
      value: isVariableValue(value) ? value : variable.value
    }
  }
  return {
    path,
    doc: {
      ...flat,
      variables,
      children: flat.children.map((node) => renameNode(node, names))
    }
  }
}

/** Renaming keeps a variable's value in its shape; this tells the type checker so. */
function isVariableValue(value: unknown): value is PenVariable['value'] {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    (Array.isArray(value) && value.every(isRecord))
  )
}
