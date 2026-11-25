import { Buffer } from 'node:buffer'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { CheckRun, FileCheck } from '#cli/check/run'

/** The marker the Action finds its own comment by; first line of the Markdown report. */
export const COMMENT_MARKER = '<!-- pairdraw-check -->'

/** Names in the Markdown writer stay readable; findings and renders are capped as GitHub caps a comment. */
const MAX_FINDINGS_PER_FILE = 20

/** GitHub refuses a comment body past this many bytes; the report is cut to fit. */
export const MAX_COMMENT_BYTES = 65_536

/** Room left for the line the action appends after `report.md`, so the posted body still fits. */
export const COMMENT_SUFFIX_RESERVE_BYTES = 1_024

/** Detail the writer gives up, in order, so an oversized report still posts. */
const FINDING_LIMITS = [MAX_FINDINGS_PER_FILE, 10, 5, 2, 1, 0]
const FILE_LIMITS = [Number.POSITIVE_INFINITY, 100, 50, 20, 10, 5, 0]

/** How much of the report a single Markdown rendering shows. */
interface CommentLimits {
  findingsPerFile: number
  files: number
}

/** The report as JSON: renders keep where their PNG is, never the bytes. */
export function reportJSON(run: CheckRun): unknown {
  return {
    ...run.report,
    files: run.report.files.map((file) => ({
      ...file,
      responsive: file.responsive.map((frame) => ({
        ...frame,
        renders: frame.renders.map(({ png: _png, ...render }) => render)
      }))
    }))
  }
}

/** Writes the PNGs, `report.json`, and `report.md` under `outDir`. */
export async function writeReport(
  outDir: string,
  run: CheckRun,
  options: { imageBase?: string } = {}
): Promise<void> {
  for (const [path, bytes] of run.renders) {
    const target = join(outDir, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, bytes)
  }
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, 'report.json'), `${JSON.stringify(reportJSON(run), null, 2)}\n`)
  await writeFile(join(outDir, 'report.md'), reportMarkdown(run, options))
}

/** The report as the pull-request comment: the verdict, a table, then one section per file. */
export function reportMarkdown(run: CheckRun, options: { imageBase?: string } = {}): string {
  // The action posts this body with its artifact line after it; both must fit GitHub's limit.
  const budget = MAX_COMMENT_BYTES - COMMENT_SUFFIX_RESERVE_BYTES
  let markdown = renderComment(run, options, {
    findingsPerFile: MAX_FINDINGS_PER_FILE,
    files: Number.POSITIVE_INFINITY
  })
  if (size(markdown) <= budget) return markdown
  // Give up detail until the body fits, then files, so the comment is always posted.
  for (const findingsPerFile of FINDING_LIMITS) {
    for (const files of FILE_LIMITS) {
      markdown = renderComment(run, options, { findingsPerFile, files })
      if (size(markdown) <= budget) return markdown
    }
  }
  return markdown
}

function size(text: string): number {
  return Buffer.byteLength(text)
}

function renderComment(
  run: CheckRun,
  options: { imageBase?: string },
  limits: CommentLimits
): string {
  const { totals, files } = run.report
  const shown = files.slice(0, limits.files)
  const dropped = files.length - shown.length
  const hidden = hiddenFindings(shown, limits.findingsPerFile)
  const lines = [COMMENT_MARKER, '']
  lines.push(
    `## Pairdraw design check — ${verdict(run)}, ${count(totals.errors, 'error')}, ${count(totals.warnings, 'warning')}`
  )
  lines.push('')
  lines.push(
    `${plural(totals.files, 'file')} checked: ${totals.checked} read, ${totals.files - totals.checked} skipped.`
  )
  if (files.length > 0) {
    lines.push('')
    lines.push('| File | Design memory | Tokens | Responsive |')
    lines.push('| --- | --- | --- | --- |')
    for (const file of shown)
      lines.push(
        `| ${escapeCell(file.path)} | ${memoryCell(file)} | ${tokensCell(file)} | ${responsiveCell(file)} |`
      )
    if (dropped > 0)
      lines.push(
        '',
        `… ${dropped === 1 ? '1 more file is' : `${dropped} more files are`} in \`report.json\`.`
      )
  }
  for (const file of shown) lines.push(...fileSection(file, options, limits.findingsPerFile))
  if (dropped > 0 || hidden > 0) {
    lines.push('')
    lines.push(
      `Truncated to fit GitHub’s ${MAX_COMMENT_BYTES.toLocaleString('en-US')}-byte comment limit; \`report.json\` holds every finding.`
    )
  }
  if (run.report.exitCode === 2) {
    lines.push('')
    lines.push('The check could not finish, so this run is not a pass.')
  }
  return `${lines.join('\n')}\n`
}

/** Findings the limits leave out, so the truncation note only appears when something is hidden. */
function hiddenFindings(files: FileCheck[], perFile: number): number {
  let hidden = 0
  for (const file of files) {
    hidden += Math.max(0, (file.designMemory?.violations.length ?? 0) - perFile)
    hidden += Math.max(0, (file.tokens.check?.drift.length ?? 0) - perFile)
    for (const frame of file.responsive)
      for (const render of frame.renders) hidden += Math.max(0, render.warnings.length - perFile)
  }
  return hidden
}

function verdict(run: CheckRun): string {
  if (run.report.exitCode === 2) return 'could not finish'
  return run.report.exitCode === 0 ? 'no blocking findings' : 'findings'
}

function count(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? '' : 's'}`
}

function plural(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? '' : 's'}`
}

function memoryCell(file: FileCheck): string {
  const memory = file.designMemory
  if (!memory) return 'off'
  if (memory.missing) return 'no memory in this file'
  if (memory.violations.length === 0) return 'clean'
  return `${count(memory.newCount, 'new finding')}, ${memory.preexistingCount} older`
}

function tokensCell(file: FileCheck): string {
  if (file.tokens.skipped) return file.tokens.skipped
  const check = file.tokens.check
  if (!check) return 'off'
  return check.inSync ? 'in sync' : count(check.drift.length, 'drifted token')
}

function responsiveCell(file: FileCheck): string {
  const warnings = file.responsive.reduce(
    (total, frame) =>
      total + frame.renders.reduce((sum, render) => sum + render.warnings.length, 0),
    0
  )
  if (file.responsive.some((frame) => frame.error)) return 'could not render'
  if (file.responsive.length === 0) return 'no frames'
  const skipped = file.skippedFrames > 0 ? `, ${file.skippedFrames} not rendered` : ''
  return `${plural(file.responsive.length, 'frame')}, ${plural(warnings, 'warning')}${skipped}`
}

function fileSection(file: FileCheck, options: { imageBase?: string }, perFile: number): string[] {
  const body: string[] = []
  if (file.error) body.push(`**Error:** ${file.error}`, '')
  body.push(...memoryLines(file, perFile))
  body.push(...tokenLines(file, perFile))
  body.push(...responsiveLines(file, options, perFile))
  if (body.length === 0) return []
  return ['', `<details><summary>${file.path}</summary>`, '', ...body, '</details>']
}

function memoryLines(file: FileCheck, perFile: number): string[] {
  const memory = file.designMemory
  if (!memory || memory.missing || memory.violations.length === 0) return []
  const lines = ['**Design memory**', '']
  for (const violation of memory.violations.slice(0, perFile)) {
    const where = violation.nodePath.join(' / ')
    const nearest =
      violation.nearest === null
        ? ''
        : ` — nearest allowed ${violation.nearestName ?? violation.nearest}`
    lines.push(
      `- ${violation.severity} · ${violation.group} · ${where} · \`${violation.value}\`${nearest}${violation.new ? '' : ' (older)'}`
    )
  }
  const rest = memory.violations.length - perFile
  if (rest > 0) lines.push(`- … ${plural(rest, 'more finding')} in \`report.json\``)
  lines.push('')
  return lines
}

function tokenLines(file: FileCheck, perFile: number): string[] {
  const check = file.tokens.check
  if (!check || check.inSync) return []
  const lines = ['**Token drift**', '']
  for (const drift of check.drift.slice(0, perFile)) {
    const where = `${drift.collection} / ${drift.variable}${drift.mode ? ` (${drift.mode})` : ''}`
    const values = [
      drift.code === undefined ? undefined : `code ${drift.code}`,
      drift.canvas === undefined ? undefined : `canvas ${drift.canvas}`
    ].filter((part) => part !== undefined)
    lines.push(`- ${where}: ${drift.kind}${values.length > 0 ? `, ${values.join(', ')}` : ''}`)
  }
  const rest = check.drift.length - perFile
  if (rest > 0) lines.push(`- … ${plural(rest, 'more token')} in \`report.json\``)
  lines.push('')
  return lines
}

function responsiveLines(
  file: FileCheck,
  options: { imageBase?: string },
  perFile: number
): string[] {
  const lines: string[] = []
  for (const frame of file.responsive) {
    if (frame.error) {
      lines.push(`**${frame.page} / ${frame.frameName}** — ${frame.error}`, '')
      continue
    }
    const warnings = frame.renders.reduce((sum, render) => sum + render.warnings.length, 0)
    lines.push(
      `**${frame.page} / ${frame.frameName}** — ${frame.renders.map((render) => render.width).join(' / ')} px, ${plural(warnings, 'warning')}`,
      ''
    )
    if (options.imageBase) {
      for (const render of frame.renders)
        lines.push(`![${render.width}px](${joinURL(options.imageBase, render.file)})`)
      lines.push('')
    }
    for (const render of frame.renders) {
      for (const warning of render.warnings.slice(0, perFile)) {
        lines.push(`- ${render.width}px · ${warning.severity} · ${warning.message}`)
      }
    }
    const hidden = frame.renders.reduce(
      (sum, render) => sum + Math.max(0, render.warnings.length - perFile),
      0
    )
    if (hidden > 0) lines.push(`- … ${plural(hidden, 'more warning')} in \`report.json\``)
    if (warnings > 0 || hidden > 0) lines.push('')
  }
  return lines
}

function joinURL(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

function escapeCell(text: string): string {
  return text.replaceAll('|', '\\|')
}
