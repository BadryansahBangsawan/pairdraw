import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CLI_ENTRY } from '#cli-tests/helpers/paths'

import * as v from 'valibot'

setDefaultTimeout(60_000)

function parseJSON<T>(text: string, schema: v.GenericSchema<unknown, T>): T {
  return v.parse(v.pipe(v.string(), v.parseJson(), schema), text)
}

async function cli(args: string[]) {
  const proc = Bun.spawn([process.execPath, CLI_ENTRY, ...args], { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited }
}

const totalsSchema = v.object({ totalVariables: v.number(), totalCollections: v.number() })

/** A document with one colour variable, whose collection is named Brand. */
async function themed(dir: string): Promise<string> {
  const html = join(dir, 'card.html')
  const file = join(dir, 'card.fig')
  await writeFile(html, '<div style="width:100px;height:40px;background:#000"></div>')
  expect((await cli(['import', html, '-o', file])).exitCode).toBe(0)
  const script = `
    const brand = figma.variables.createVariableCollection('Brand')
    figma.variables.createVariable('primary', brand, 'COLOR')
    const space = figma.variables.createVariableCollection('Space')
    figma.variables.createVariable('small', space, 'FLOAT')
  `
  expect((await cli(['eval', file, '-c', script, '-w', '-q'])).exitCode).toBe(0)
  return file
}

describe('variables', () => {
  test('counts the variables the filters leave', async () => {
    const file = await themed(await mkdtemp(join(tmpdir(), 'pairdraw-variables-')))

    const all = await cli(['variables', file, '--json'])
    expect(parseJSON(all.stdout, totalsSchema)).toEqual({
      totalVariables: 2,
      totalCollections: 2
    })

    const floats = await cli(['variables', file, '--type', 'FLOAT', '--json'])
    expect(parseJSON(floats.stdout, totalsSchema)).toEqual({
      totalVariables: 1,
      totalCollections: 1
    })
  })
})
