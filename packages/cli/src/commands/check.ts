import { defineCommand } from 'citty'

import {
  CHECK_FAIL_LEVELS,
  DEFAULT_CHECK_CONFIG_PATH,
  readCheckConfig,
  type CheckConfig
} from '#cli/check/config'
import { isDesignFile } from '#cli/check/plan'
import { reportJSON, writeReport } from '#cli/check/report'
import { runCheck } from '#cli/check/run'
import { bold, fail, ok, printError, printJSON, warn } from '#cli/format'

const DEFAULT_REPORT_DIR = 'pairdraw-report'

export default defineCommand({
  meta: {
    name: 'check',
    description:
      'Check design files for CI: render each frame at several widths, compare variables with the stylesheet they come from, and list the design-memory findings the base revision did not have'
  },
  args: {
    file: {
      type: 'positional',
      description: 'Design document (.fig or .pen); several may be given',
      required: false
    },
    config: {
      type: 'string',
      description: `Settings file (default ${DEFAULT_CHECK_CONFIG_PATH})`
    },
    base: {
      type: 'string',
      description:
        'Folder mirroring the same paths with the base revision’s copies, so only findings this change introduced fail'
    },
    out: {
      type: 'string',
      alias: 'o',
      description: `Folder for report.json, report.md and the renders (default ${DEFAULT_REPORT_DIR})`
    },
    'image-base': {
      type: 'string',
      description: 'URL prefix for the render images in report.md, where they are hosted'
    },
    'fail-on': {
      type: 'string',
      description: 'Findings that fail the run: error, warning, or never'
    },
    json: { type: 'boolean', description: 'Print the report as JSON' }
  },
  async run({ args }) {
    try {
      const files: string[] = args._.length > 0 ? [...args._] : []
      if (files.length === 0 && args.file) files.push(args.file)
      for (const path of files) {
        if (!isDesignFile(path))
          throw new Error(`${path} is not a design file: check reads .fig and .pen documents.`)
      }
      const settings = await readCheckConfig(args.config || DEFAULT_CHECK_CONFIG_PATH)
      const config: CheckConfig = {
        ...settings,
        failOn: failLevel(args['fail-on']) ?? settings.failOn
      }
      const out = args.out || DEFAULT_REPORT_DIR
      const run = await runCheck({
        files,
        config,
        baseDir: args.base || undefined,
        onNote: (note) => console.error(warn(note))
      })
      await writeReport(out, run, { imageBase: args['image-base'] || undefined })
      if (args.json) {
        await printJSON(reportJSON(run))
      } else {
        const { totals, exitCode } = run.report
        const summary = `${totals.checked} of ${totals.files} files checked: ${totals.errors} errors, ${totals.warnings} warnings, ${totals.newViolations} new design-memory findings, ${totals.drift} drifted tokens`
        console.log(exitCode === 0 ? ok(summary) : fail(summary))
        console.error(`Report written to ${bold(out)}`)
      }
      // A process that exits at once can cut off what a pipe has not taken yet.
      process.exitCode = run.report.exitCode
    } catch (error) {
      printError(error)
      process.exitCode = 2
    }
  }
})

/** `--fail-on`, or null when it names no level; the default stays the file's. */
function failLevel(value: string | undefined): CheckConfig['failOn'] | null {
  if (value === undefined) return null
  const level = CHECK_FAIL_LEVELS.find((candidate) => candidate === value)
  if (!level) throw new Error(`--fail-on takes ${CHECK_FAIL_LEVELS.join(', ')}, not "${value}".`)
  return level
}
