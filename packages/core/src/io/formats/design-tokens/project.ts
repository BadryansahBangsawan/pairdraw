import { isAbsolute, normalize, posix } from 'pathe'
import * as v from 'valibot'

import type { SceneGraph } from '@open-pencil/scene-graph'

import { importTokensIntoGraph } from '#core/io/formats/design-tokens/apply'
import { readCSSDesignTokens } from '#core/io/formats/design-tokens/css/read'
import { defaultTokenImportOptions, planTokenImport } from '#core/io/formats/design-tokens/plan'
import type {
  DesignTokenBundle,
  DesignTokenReadIssue,
  DesignTokenSourceFile
} from '#core/io/formats/design-tokens/read'

/** A stylesheet or manifest the folder reader already loaded. Paths stay inside the folder. */
export type DesignSystemSourceFile = DesignTokenSourceFile

export type DesignSystemIssue =
  | DesignTokenReadIssue
  | { kind: 'invalid-manifest'; path: string }
  | { kind: 'unsupported-config'; path: string }
  | { kind: 'escaped-path'; path: string }
  | { kind: 'file-too-large'; path: string }
  | { kind: 'too-many-files'; path: string }
  | { kind: 'total-too-large'; path: string }
  | { kind: 'unreadable'; path: string }
  | { kind: 'components-not-imported'; path: string }
  | { kind: 'unsupported-value'; path: string; name: string; reason: string }

/** Files and notes a folder walk hands to the importer. The walk itself stays in Node. */
export interface DesignSystemFolder {
  files: DesignSystemSourceFile[]
  issues: DesignSystemIssue[]
  /** Set when the folder has component source, which this import does not read. */
  componentsPath?: string
}

export interface DesignSystemImportResult {
  collectionIds: string[]
  variableIds: string[]
  issues: DesignSystemIssue[]
}

/** Files larger than this are reported and not read. */
export const DESIGN_SYSTEM_MAX_FILE_BYTES = 1_048_576

/** How many stylesheets and manifests a folder read keeps. The next one is reported and the walk stops. */
export const DESIGN_SYSTEM_MAX_FILES = 200

/** Total bytes of files a folder read keeps. The file that would pass this is reported and the walk stops. */
export const DESIGN_SYSTEM_MAX_TOTAL_BYTES = 8 * DESIGN_SYSTEM_MAX_FILE_BYTES

const CONFIG_FILE = /^tailwind\.config\.(?:js|ts|mjs|cjs|cts|mts)$/

const manifestSchema = v.looseObject({
  tailwind: v.optional(
    v.looseObject({
      css: v.optional(v.string()),
      config: v.optional(v.string())
    })
  )
})

function sameIssue(left: DesignSystemIssue, right: DesignSystemIssue): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function addIssue(issues: DesignSystemIssue[], issue: DesignSystemIssue): void {
  if (!issues.some((existing) => sameIssue(existing, issue))) issues.push(issue)
}

/** A relative path that cannot climb out of the folder it was given against. */
export function confinedDesignSystemPath(path: string): boolean {
  if (path.trim() === '') return false
  const normalized = normalize(path)
  if (normalized === '.' || isAbsolute(normalized)) return false
  return !normalized.split('/').includes('..')
}

function isConfigFile(path: string): boolean {
  return CONFIG_FILE.test(posix.basename(normalize(path)))
}

function declaresCustomProperties(text: string): boolean {
  return /@theme\b/.test(text) || /(?:^|[^\w-])--[\w-]+\s*:/.test(text)
}

/** shadcn/ui writes the light values on `:root` and the dark values on `.dark`. */
function renameShadcnModes(bundle: DesignTokenBundle): void {
  for (const collection of bundle.collections) {
    const base = collection.modes.find(
      (mode) => mode.isDefault && mode.name === 'Default' && mode.condition === undefined
    )
    const dark = collection.modes.find((mode) => mode.name === 'dark' && mode.condition === '.dark')
    if (!base || !dark) continue
    const taken = new Set(collection.modes.map((mode) => mode.name))
    if (taken.has('Light') || taken.has('Dark')) continue
    base.name = 'Light'
    dark.name = 'Dark'
  }
}

function stylesheets(
  files: readonly DesignSystemSourceFile[],
  named: string | null | undefined,
  issues: DesignSystemIssue[]
): DesignSystemSourceFile[] {
  if (named === null) return []
  const css = files.filter((file) => posix.basename(file.path).endsWith('.css'))
  if (named === undefined) return css.filter((file) => declaresCustomProperties(file.text))
  const match = css.find((file) => posix.normalize(file.path) === named)
  if (!match) addIssue(issues, { kind: 'missing-file', file: named, from: 'components.json' })
  return match ? [match] : []
}

function confineFiles(
  folder: DesignSystemFolder,
  issues: DesignSystemIssue[]
): DesignSystemSourceFile[] {
  const files: DesignSystemSourceFile[] = []
  for (const file of folder.files) {
    if (!confinedDesignSystemPath(file.path)) {
      addIssue(issues, { kind: 'escaped-path', path: file.path })
      continue
    }
    files.push(file)
    if (isConfigFile(file.path)) addIssue(issues, { kind: 'unsupported-config', path: file.path })
  }
  return files
}

function noteTailwindConfig(config: string | undefined, issues: DesignSystemIssue[]): void {
  const path = config?.trim()
  if (!path) return
  if (!confinedDesignSystemPath(path)) {
    addIssue(issues, { kind: 'escaped-path', path })
    return
  }
  if (isConfigFile(path)) addIssue(issues, { kind: 'unsupported-config', path })
}

/** `undefined` scans stylesheets that declare variables. `null` imports none. */
function stylesheetNamedByManifest(
  css: string | undefined,
  issues: DesignSystemIssue[]
): string | null | undefined {
  const path = css?.trim()
  if (!path) return undefined
  if (!confinedDesignSystemPath(path)) {
    addIssue(issues, { kind: 'escaped-path', path })
    return null
  }
  return posix.normalize(path)
}

function manifestChoice(
  files: readonly DesignSystemSourceFile[],
  issues: DesignSystemIssue[]
): { stylesheet: string | null | undefined; path?: string } {
  const manifest = files.find((file) => posix.normalize(file.path) === 'components.json')
  if (!manifest) return { stylesheet: undefined }
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), manifestSchema), manifest.text)
  if (!parsed.success) {
    addIssue(issues, { kind: 'invalid-manifest', path: manifest.path })
    return { stylesheet: undefined, path: manifest.path }
  }
  noteTailwindConfig(parsed.output.tailwind?.config, issues)
  return {
    stylesheet: stylesheetNamedByManifest(parsed.output.tailwind?.css, issues),
    path: manifest.path
  }
}

function importStylesheetFile(
  graph: SceneGraph,
  pageId: string,
  file: DesignSystemSourceFile,
  issues: DesignSystemIssue[]
): { collectionIds: string[]; variableIds: string[] } {
  const bundle = readCSSDesignTokens(graph, file.text, { file: file.path })
  renameShadcnModes(bundle)
  for (const issue of bundle.issues) addIssue(issues, issue)
  const plan = planTokenImport(graph, bundle, defaultTokenImportOptions(graph, bundle))
  for (const skip of plan.skipped) {
    addIssue(issues, {
      kind: 'unsupported-value',
      path: file.path,
      name: skip.name,
      reason: skip.reason
    })
  }
  return importTokensIntoGraph(graph, pageId, plan)
}

/**
 * Imports CSS variables from files already read inside one project folder.
 * A shadcn/ui `:root` and `.dark` pair becomes one collection with Light and Dark modes.
 * JavaScript config is reported and ignored. Component source is recorded and not imported.
 */
export function importDesignSystemFiles(
  graph: SceneGraph,
  folder: DesignSystemFolder
): DesignSystemImportResult {
  const issues = [...folder.issues]
  const files = confineFiles(folder, issues)
  const manifest = manifestChoice(files, issues)
  if (manifest.path || folder.componentsPath) {
    addIssue(issues, {
      kind: 'components-not-imported',
      path: manifest.path ?? folder.componentsPath ?? 'components.json'
    })
  }

  const pageId = graph.getPages()[0]?.id ?? graph.rootId
  const collectionIds: string[] = []
  const variableIds: string[] = []
  for (const file of stylesheets(files, manifest.stylesheet, issues)) {
    const imported = importStylesheetFile(graph, pageId, file, issues)
    collectionIds.push(...imported.collectionIds)
    variableIds.push(...imported.variableIds)
  }
  return { collectionIds, variableIds, issues }
}
