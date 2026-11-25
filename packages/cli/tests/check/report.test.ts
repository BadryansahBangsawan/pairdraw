import { describe, expect, test } from 'bun:test'

import type { CheckRun, FileCheck } from '#cli/check/run'
import { COMMENT_MARKER, COMMENT_SUFFIX_RESERVE_BYTES, reportMarkdown } from '#cli/check/report'

const GITHUB_COMMENT_LIMIT = 65_536

function drift(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    collection: 'Brand',
    variable: `--token-${index}`,
    variableId: null,
    mode: null,
    modeId: null,
    kind: 'conflict' as const,
    code: '#AABBCC',
    canvas: '#112233'
  }))
}

function file(overrides: Partial<FileCheck> = {}): FileCheck {
  return {
    path: 'designs/home.pen',
    status: 'checked',
    error: null,
    designMemory: null,
    tokens: { checked: false, skipped: 'no token source configured', check: null },
    responsive: [],
    skippedFrames: 0,
    ...overrides
  }
}

function run(files: FileCheck[]): CheckRun {
  const drift = files.reduce((total, entry) => total + (entry.tokens.check?.drift.length ?? 0), 0)
  const errors = files.reduce(
    (total, entry) =>
      total + (entry.designMemory?.violations.filter((item) => item.severity === 'error').length ?? 0),
    0
  )
  return {
    report: {
      version: 1,
      exitCode: errors > 0 || drift > 0 ? 1 : 0,
      files,
      totals: {
        files: files.length,
        checked: files.length,
        errors,
        warnings: 0,
        newViolations: files.reduce((total, entry) => total + (entry.designMemory?.newCount ?? 0), 0),
        drift
      }
    },
    renders: new Map()
  }
}

function drifting(count: number, path = 'designs/home.pen'): FileCheck {
  return file({
    path,
    tokens: { checked: true, skipped: null, check: { inSync: false, drift: drift(count), issues: [] } }
  })
}

describe('the comment the action posts', () => {
  test('a report that fits is written whole, with no truncation note', () => {
    const markdown = reportMarkdown(run([drifting(3)]))

    expect(markdown.startsWith(COMMENT_MARKER)).toBe(true)
    expect(markdown).toContain('3 drifted tokens')
    expect(markdown).not.toContain('Truncated to fit')
    expect(markdown).toContain('--token-2')
  })

  test('a report over GitHub’s 65,536-byte cap is cut and says where the rest is', () => {
    const markdown = reportMarkdown(run([drifting(1_100)]))

    expect(Buffer.byteLength(markdown)).toBeLessThanOrEqual(GITHUB_COMMENT_LIMIT)
    expect(markdown.startsWith(COMMENT_MARKER)).toBe(true)
    expect(markdown).toContain('Truncated to fit')
    expect(markdown).toContain('1100 drifted tokens') // the count is still honest
    expect(markdown).toContain('report.json')
  })

  test('many files are cut by file, and the table still says how many were checked', () => {
    const files = Array.from({ length: 1_200 }, (_, index) =>
      file({ path: `designs/screen-${index}.pen` })
    )

    const markdown = reportMarkdown(run(files))

    expect(Buffer.byteLength(markdown)).toBeLessThanOrEqual(GITHUB_COMMENT_LIMIT)
    expect(markdown).toContain('1200 files checked')
    expect(markdown).toContain('Truncated to fit')
  })

  test('the marker stays the first line even when the body is cut', () => {
    const markdown = reportMarkdown(run([drifting(1_100)]))
    expect(markdown.split('\n')[0]).toBe(COMMENT_MARKER)
  })

  test('report.md leaves room for the artifact line the action appends', () => {
    // 634 short rows land just under the old 65,536-byte cap, inside the window the action's line overflows.
    const files = Array.from({ length: 634 }, (_, index) =>
      file({
        path: `${`designs/${'d'.repeat(50)}-${index}`.padEnd(70, 'x')}.pen`,
        tokens: { checked: false, skipped: null, check: null }
      })
    )
    const suffix = `\n[Report and renders](${'u'.repeat(900)}) are kept as an artifact of this run.\n`

    const markdown = reportMarkdown(run(files))

    expect(Buffer.byteLength(suffix)).toBeLessThanOrEqual(COMMENT_SUFFIX_RESERVE_BYTES)
    expect(Buffer.byteLength(markdown) + Buffer.byteLength(suffix)).toBeLessThanOrEqual(GITHUB_COMMENT_LIMIT)
    expect(markdown).toContain('Truncated to fit')
  })
})
