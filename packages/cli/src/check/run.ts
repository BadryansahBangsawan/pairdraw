import { basename } from 'node:path'

import { toUint8Array } from 'js-base64'
import * as v from 'valibot'

import { createLinter, DESIGN_MEMORY_RULE_IDS } from '@pairdraw/core/lint'
import type { SceneGraph } from '@pairdraw/scene-graph'
import { cachedDesignMemory, type DesignMemoryGroup } from '@pairdraw/scene-graph/design-memory'

import { type CheckConfig, type CheckFailLevel } from '#cli/check/config'
import { framesToCheck } from '#cli/check/plan'
import { tokenDrift, type TokenCheck } from '#cli/check/tokens'
import { loadDocument, populateWholeDocument } from '#cli/headless'
import { findCLITool } from '#cli/session/tools'
import {
  loadHeadlessToolDocument,
  runHeadlessTool,
  type HeadlessToolDocument
} from '#cli/tool-data'

/** One finding, as the report and the comment list it. */
export interface MemoryViolation {
  group: DesignMemoryGroup
  severity: 'error' | 'warning' | 'info'
  nodeId: string
  nodeName: string
  nodePath: string[]
  value: string | number
  nearest: string | number | null
  nearestName: string | null
  /** Absent from the base revision's findings, so this run is what introduced it. */
  new: boolean
}

export interface ResponsiveWarning {
  kind: string
  severity: 'error' | 'warning' | 'info'
  nodeId: string
  nodeName: string
  message: string
}

/** One width a frame was laid out and rendered at. */
export interface FrameRender {
  width: number
  height: number
  warnings: ResponsiveWarning[]
  droppedWarnings: number
  /** Where the PNG goes, from the report folder; set by `runCheck` from the names it knows. */
  file: string
  /** The file's bytes, written by the report and never serialized into the JSON. */
  png: Uint8Array
}

export interface FrameCheck {
  frameId: string
  frameName: string
  page: string
  renders: FrameRender[]
  error?: string
}

export interface FileCheck {
  path: string
  status: 'checked' | 'skipped' | 'error'
  error: string | null
  designMemory: {
    missing: boolean
    violations: MemoryViolation[]
    newCount: number
    preexistingCount: number
  } | null
  tokens: { checked: boolean; skipped: string | null; check: TokenCheck | null }
  responsive: FrameCheck[]
  skippedFrames: number
}

export interface CheckTotals {
  files: number
  checked: number
  errors: number
  warnings: number
  newViolations: number
  drift: number
}

export interface CheckReport {
  version: 1
  exitCode: 0 | 1 | 2
  files: FileCheck[]
  totals: CheckTotals
}

export interface CheckRun {
  report: CheckReport
  /** Every render's bytes, by the path it is written to from the report folder. */
  renders: Map<string, Uint8Array>
}

export interface CheckInput {
  files: string[]
  config: CheckConfig
  /** A folder mirroring the paths of the base revision's files, for new-versus-old findings. */
  baseDir?: string
  /** One note per file that was left out or read with a warning. */
  onNote?: (note: string) => void
}

const responsiveResultSchema = v.object({
  widths: v.array(
    v.object({
      width: v.number(),
      height: v.number(),
      base64: v.string(),
      warnings: v.array(
        v.object({
          kind: v.string(),
          severity: v.picklist(['error', 'warning', 'info']),
          node_id: v.string(),
          node_name: v.string(),
          message: v.string()
        })
      ),
      dropped_warnings: v.optional(v.number())
    })
  )
})

/** The names a report file goes by: lower-case words with single dashes, and never empty. */
export function slug(text: string): string {
  const slugged = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slugged || 'unnamed'
}

/**
 * Checks each file in turn: its design memory against the base revision, its variables against
 * the configured stylesheet, and its frames rendered at the configured widths. Reads only; the
 * report writer stores the images and the JSON.
 */
export async function runCheck(input: CheckInput): Promise<CheckRun> {
  const files: FileCheck[] = []
  const renders = new Map<string, Uint8Array>()
  for (const path of input.files) {
    files.push(await checkFile(path, input, renders, input.onNote))
  }
  const report: CheckReport = {
    version: 1,
    exitCode: exitCodeOf(files, input.config.failOn),
    files,
    totals: totalsOf(files)
  }
  return { report, renders }
}

async function checkFile(
  path: string,
  input: CheckInput,
  renders: Map<string, Uint8Array>,
  note: ((text: string) => void) | undefined
): Promise<FileCheck> {
  const base = await baseFindings(path, input.baseDir)
  const empty: FileCheck = {
    path,
    status: 'skipped',
    error: null,
    designMemory: null,
    tokens: { checked: false, skipped: null, check: null },
    responsive: [],
    skippedFrames: 0
  }

  let headless: HeadlessToolDocument
  try {
    headless = await loadHeadlessToolDocument(path)
  } catch (error) {
    return { ...empty, status: 'error', error: messageOf(error) }
  }
  const { graph } = headless

  const file: FileCheck = { ...empty, status: 'checked' }
  if (input.config.checks.designMemory) file.designMemory = memoryFindings(graph, base)
  if (input.config.checks.tokens) file.tokens = await tokensOf(graph, input.config, path)
  if (input.config.checks.responsive) {
    const selection = framesToCheck(graph, input.config.responsive.maxFrames)
    file.skippedFrames = selection.skipped
    if (selection.skipped > 0)
      note?.(`${path}: ${selection.skipped} more frames were not rendered (responsive.maxFrames)`)
    for (const frame of selection.frames) {
      file.responsive.push(await renderFrame(headless, frame.id, path, input.config, renders))
    }
  }
  const failed = file.responsive.some((frame) => frame.error)
  return failed ? { ...file, status: 'error', error: 'A frame could not be rendered' } : file
}

/** Every design-memory finding of a document, with the layers named as the app names them. */
function memoryFindings(graph: SceneGraph, base: Set<string> | null) {
  if (cachedDesignMemory(graph) === null)
    return { missing: true, violations: [], newCount: 0, preexistingCount: 0 }
  const messages = createLinter({ preset: 'recommended' })
    .lintGraph(graph)
    .messages.filter((entry) => entry.ruleId.startsWith('design-memory-'))
  const violations = messages.map((entry): MemoryViolation => {
    const data = entry.data ?? {}
    const value = 'value' in data ? data.value : ''
    const key = findingKey(entry.nodeId, entry.ruleId, value)
    return {
      group: groupOf(entry.ruleId),
      severity: entry.severity,
      nodeId: entry.nodeId,
      nodeName: entry.nodeName,
      nodePath: nodePath(graph, entry.nodeId),
      value,
      nearest: 'nearest' in data ? data.nearest : null,
      nearestName: 'nearestName' in data ? String(data.nearestName) : null,
      new: base === null || !base.has(key)
    }
  })
  const introduced = violations.filter((violation) => violation.new).length
  return {
    missing: false,
    violations,
    newCount: introduced,
    preexistingCount: violations.length - introduced
  }
}

/** The findings a base revision's copy of the file already had, or null when there is no copy. */
async function baseFindings(path: string, baseDir?: string): Promise<Set<string> | null> {
  if (!baseDir) return null
  const basePath = `${baseDir}/${path}`
  let graph: SceneGraph
  try {
    graph = await loadDocument(basePath)
    populateWholeDocument(graph)
  } catch {
    return null
  }
  if (cachedDesignMemory(graph) === null) return new Set()
  const found = new Set<string>()
  for (const entry of createLinter({ preset: 'recommended' }).lintGraph(graph).messages) {
    if (!entry.ruleId.startsWith('design-memory-')) continue
    const value = entry.data && 'value' in entry.data ? entry.data.value : ''
    found.add(findingKey(entry.nodeId, entry.ruleId, value))
  }
  return found
}

const findingKey = (nodeId: string, ruleId: string, value: string | number): string =>
  `${nodeId}\u0000${ruleId}\u0000${value}`

/** The design-memory group a rule checks, from its rule id. */
function groupOf(ruleId: string): DesignMemoryGroup {
  for (const [group, id] of Object.entries(DESIGN_MEMORY_RULE_IDS)) {
    if (id === ruleId) return group as DesignMemoryGroup
  }
  throw new Error(`Unknown design-memory rule "${ruleId}"`)
}

/** A layer's name under its ancestors, as a path a person can find on the canvas. */
function nodePath(graph: SceneGraph, nodeId: string): string[] {
  const names: string[] = []
  let node = graph.getNode(nodeId)
  while (node) {
    if (node.type !== 'DOCUMENT') names.unshift(node.name)
    node = node.parentId ? graph.getNode(node.parentId) : undefined
  }
  return names
}

async function tokensOf(
  graph: SceneGraph,
  config: CheckConfig,
  path: string
): Promise<FileCheck['tokens']> {
  if (!config.tokens.source)
    return { checked: false, skipped: 'no token source configured', check: null }
  if (graph.variables.size === 0) return { checked: false, skipped: 'no variables', check: null }
  const check = await tokenDrift(graph, config.tokens.source, path)
  return { checked: true, skipped: null, check }
}

/** Lays a frame out at every width and keeps each PNG for the report. */
async function renderFrame(
  headless: HeadlessToolDocument,
  frameId: string,
  filePath: string,
  config: CheckConfig,
  renders: Map<string, Uint8Array>
): Promise<FrameCheck> {
  const { responsive } = config
  const frame = headless.graph.getNode(frameId)
  const page = frame?.parentId ? headless.graph.getNode(frame.parentId) : undefined
  const frameName = frame?.name ?? frameId
  const pageName = page?.name ?? 'Page 1'
  const result = await runHeadlessTool(headless, findCLITool('check_responsive'), {
    id: frameId,
    widths: responsive.widths,
    max_warnings: responsive.maxWarnings,
    scale: responsive.scale,
    maxEdge: responsive.maxEdge
  })
  const parsed = v.safeParse(responsiveResultSchema, result)
  if (!parsed.success)
    return {
      frameId,
      frameName,
      page: pageName,
      renders: [],
      error: `check_responsive answered ${v.summarize(parsed.issues)}`
    }
  const folder = `renders/${slug(basename(filePath))}`
  const base = `${slug(pageName)}__${slug(frameName)}`
  const used = new Map<string, number>()
  const entries = parsed.output.widths.map((width) => {
    const name = uniqueName(used, base, width.width)
    const file = `${folder}/${name}.png`
    const png = toUint8Array(width.base64)
    renders.set(file, png)
    return {
      width: width.width,
      height: width.height,
      warnings: width.warnings.map((warning) => ({
        kind: warning.kind,
        severity: warning.severity,
        nodeId: warning.node_id,
        nodeName: warning.node_name,
        message: warning.message
      })),
      droppedWarnings: width.dropped_warnings ?? 0,
      file,
      png
    }
  })
  return { frameId, frameName, page: pageName, renders: entries }
}

/** `page__frame__375`, with a count when a document holds two frames of the same name. */
function uniqueName(used: Map<string, number>, base: string, width: number): string {
  const stem = `${base}__${width}`
  const count = used.get(stem) ?? 0
  used.set(stem, count + 1)
  return count === 0 ? stem : `${stem}-${count + 1}`
}

/** Whether a finding fails at this level: `error` is errors only, `warning` both, `never` none. */
function fails(severity: 'error' | 'warning' | 'info', level: CheckFailLevel): boolean {
  if (level === 'never') return false
  if (severity === 'error') return true
  return level === 'warning' && severity === 'warning'
}

function exitCodeOf(files: FileCheck[], level: CheckFailLevel): 0 | 1 | 2 {
  if (files.some((file) => file.status === 'error')) return 2
  const found = files.some((file) => {
    if (
      file.designMemory?.violations.some(
        (violation) => violation.new && fails(violation.severity, level)
      )
    )
      return true
    if (level !== 'never' && file.tokens.check && !file.tokens.check.inSync) return true
    return file.responsive.some((frame) =>
      frame.renders.some((render) =>
        render.warnings.some((warning) => fails(warning.severity, level))
      )
    )
  })
  return found ? 1 : 0
}

function totalsOf(files: FileCheck[]): CheckTotals {
  let errors = 0
  let warnings = 0
  let newViolations = 0
  let drift = 0
  for (const file of files) {
    newViolations += file.designMemory?.newCount ?? 0
    drift += file.tokens.check?.drift.length ?? 0
    for (const violation of file.designMemory?.violations ?? []) {
      if (violation.severity === 'error') errors++
      if (violation.severity === 'warning') warnings++
    }
    for (const frame of file.responsive) {
      for (const render of frame.renders) {
        for (const warning of render.warnings) {
          if (warning.severity === 'error') errors++
          if (warning.severity === 'warning') warnings++
        }
      }
    }
  }
  return {
    files: files.length,
    checked: files.filter((file) => file.status === 'checked').length,
    errors,
    warnings,
    newViolations,
    drift
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
