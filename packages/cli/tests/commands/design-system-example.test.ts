import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CLI_ENTRY, workspaceRoot } from '#cli-tests/helpers/paths'
import * as v from 'valibot'

setDefaultTimeout(60_000)

// The design system tutorial ships this script and the file it builds.
const EXAMPLES = join(workspaceRoot(), 'packages/docs/public/examples')
const SCRIPT = join(EXAMPLES, 'design-system.js')
const EXAMPLE_FILE = join(EXAMPLES, 'design-system.fig')

async function cli(args: string[], stdin?: string) {
  const proc = Bun.spawn([process.execPath, CLI_ENTRY, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: stdin ? Buffer.from(stdin) : undefined
  })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited }
}

const valuesSchema = v.record(v.string(), v.record(v.string(), v.union([v.string(), v.number()])))
const bindingsSchema = v.record(v.string(), v.union([v.string(), v.array(v.string())]))

const summarySchema = v.object({
  pages: v.array(v.string()),
  themeModes: v.array(v.string()),
  theme: valuesSchema,
  size: valuesSchema,
  buttonBehaviour: v.nullable(v.string()),
  buttonVariants: v.array(v.string()),
  cardSlots: v.array(v.string()),
  cardHeight: v.number(),
  cardBindings: bindingsSchema,
  cardTexts: v.array(v.string()),
  boards: v.array(
    v.object({
      name: v.string(),
      mode: v.string(),
      texts: v.array(v.string()),
      bindings: bindingsSchema
    })
  )
})

// What the tutorial walks through: Theme and Size tokens, a Button set with a behaviour, a
// Card bound to the tokens with slots, and boards that show the cards in each Theme mode.
// Variables are compared by name, because their IDs differ between builds.
const SUMMARY = `
  const components = figma.root.children.find((page) => page.name === 'Components')
  const examples = figma.root.children.find((page) => page.name === 'Examples')
  const collections = figma.variables.getLocalVariableCollections()
  const theme = collections.find((c) => c.name === 'Theme')
  const size = collections.find((c) => c.name === 'Size')
  const button = components.findOne((node) => node.type === 'COMPONENT_SET')
  const card = components.findOne((node) => node.type === 'COMPONENT' && node.name === 'Card')

  const hex = (color) =>
    '#' + [color.r, color.g, color.b]
      .map((channel) => Math.round(channel * 255).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  const modeName = (collection, modeId) =>
    collection.modes.find((mode) => mode.modeId === modeId)?.name ?? ''
  const values = (collection) =>
    Object.fromEntries(
      collection.variableIds.map((id) => {
        const variable = figma.variables.getVariableById(id)
        const byMode = Object.entries(variable.valuesByMode).map(([modeId, value]) => [
          modeName(collection, modeId),
          typeof value === 'number' ? value : hex(value)
        ])
        return [variable.name, Object.fromEntries(byMode)]
      })
    )
  const variableName = (alias) => figma.variables.getVariableById(alias.id)?.name ?? ''
  const bindings = (node) =>
    Object.fromEntries(
      Object.entries(node.boundVariables ?? {}).map(([field, alias]) => [
        field,
        Array.isArray(alias) ? alias.map(variableName) : variableName(alias)
      ])
    )
  const texts = (node) =>
    node.findAll((child) => child.type === 'TEXT').map((text) => text.name + ': ' + text.characters)

  return {
    pages: figma.root.children.map((page) => page.name),
    themeModes: theme.modes.map((mode) => mode.name),
    theme: values(theme),
    size: values(size),
    buttonBehaviour: openpencil.getBehaviour(button)?.kind ?? null,
    buttonVariants: button.children.map((variant) => variant.name),
    cardSlots: card.children.filter((node) => node.type === 'SLOT').map((node) => node.name),
    cardHeight: card.height,
    cardBindings: bindings(card),
    cardTexts: texts(card),
    boards: examples.children.map((board) => ({
      name: board.name,
      mode: modeName(theme, board.explicitVariableModes[theme.id]),
      texts: texts(board),
      bindings: bindings(board)
    }))
  }
`

async function summarize(file: string) {
  const result = await cli(['eval', file, '--json', '--code', SUMMARY])
  expect(result.stderr).toBe('')
  expect(result.exitCode).toBe(0)
  return v.parse(v.pipe(v.string(), v.parseJson(), summarySchema), result.stdout)
}

async function buildFromScript() {
  const dir = await mkdtemp(join(tmpdir(), 'open-pencil-design-system-'))
  const empty = join(dir, 'empty.pen')
  const output = join(dir, 'design-system.fig')
  await Bun.write(empty, JSON.stringify({ children: [] }))
  const built = await cli(
    ['eval', empty, '--stdin', '-o', output, '-q'],
    await Bun.file(SCRIPT).text()
  )
  expect(built.exitCode).toBe(0)
  return output
}

// The token table in packages/docs/user-guide/design-system.md.
const THEME = {
  'color/background': { Light: '#F4F5F7', Dark: '#0F1115' },
  'color/surface': { Light: '#FFFFFF', Dark: '#1A1D23' },
  'color/border': { Light: '#E1E4EA', Dark: '#2D323B' },
  'color/text': { Light: '#191C21', Dark: '#F1F3F6' },
  'color/text-muted': { Light: '#5A616E', Dark: '#A2A9B5' },
  'color/primary': { Light: '#3451D1', Dark: '#8098F7' },
  'color/on-primary': { Light: '#FFFFFF', Dark: '#0D1222' },
  'color/secondary': { Light: '#E9ECF2', Dark: '#272B33' }
}

describe('design system tutorial example', () => {
  test('its script builds the file the tutorial describes from an empty document', async () => {
    const summary = await summarize(await buildFromScript())

    expect(summary.pages).toEqual(expect.arrayContaining(['Components', 'Examples']))
    expect(summary.themeModes).toEqual(['Light', 'Dark'])
    expect(summary.theme).toEqual(THEME)
    expect(
      Object.fromEntries(
        Object.entries(summary.size).map(([name, byMode]) => [name, Object.values(byMode)])
      )
    ).toEqual({
      'radius/control': [8],
      'radius/card': [12],
      'space/sm': [8],
      'space/md': [16],
      'space/lg': [24]
    })

    expect(summary.buttonBehaviour).toBe('button')
    expect(summary.buttonVariants).toEqual(['Variant=Primary', 'Variant=Secondary'])

    expect(summary.cardSlots).toEqual(['Content', 'Actions'])
    // The Card hugs its title and slots, so it is laid out rather than left empty.
    expect(summary.cardHeight).toBeGreaterThan(0)
    expect(summary.cardBindings).toMatchObject({
      paddingLeft: 'space/lg',
      paddingTop: 'space/lg',
      itemSpacing: 'space/md',
      topLeftRadius: 'radius/card',
      fills: ['color/surface'],
      strokes: ['color/border']
    })
    // The layer names the tutorial tells readers to use, which the Git guide's diffs show.
    expect(summary.cardTexts).toEqual([
      'Title: Card title',
      'Body: Slots hold content that each card chooses for itself.',
      'Label: Button'
    ])

    expect(summary.boards.map((board) => [board.name, board.mode])).toEqual([
      ['Light', 'Light'],
      ['Dark', 'Dark']
    ])
    for (const board of summary.boards) {
      expect(board.bindings).toMatchObject({ itemSpacing: 'space/lg', fills: ['color/background'] })
      expect(board.texts).toEqual([
        'Title: Welcome back',
        'Body: Slots hold content that each card chooses for itself.',
        'Label: Button',
        'Title: Pro plan',
        'Body: Unlimited files, version history, and shared libraries.',
        'Label: Not now',
        'Label: Upgrade'
      ])
    }
  })

  test('the downloadable file has the tokens, bindings, and texts its script builds', async () => {
    const built = await summarize(await buildFromScript())
    expect(await summarize(EXAMPLE_FILE)).toEqual(built)
  })
})
