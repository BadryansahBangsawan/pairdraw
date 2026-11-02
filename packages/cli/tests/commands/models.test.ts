import { describe, expect, setDefaultTimeout, test } from 'bun:test'

import { CLI_ENTRY } from '#cli-tests/helpers/paths'
import * as v from 'valibot'

import { ACP_AGENTS, AI_PROVIDERS } from '@open-pencil/core/constants'

import { modelCatalog } from '#cli/commands/models'

setDefaultTimeout(60_000)

async function cli(args: string[]) {
  const proc = Bun.spawn([process.execPath, CLI_ENTRY, ...args], { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited }
}

const catalogSchema = v.object({
  providers: v.array(
    v.looseObject({
      id: v.string(),
      defaultModel: v.string(),
      customModels: v.boolean(),
      models: v.array(v.looseObject({ id: v.string(), name: v.string() }))
    })
  ),
  agents: v.array(v.looseObject({ id: v.string(), command: v.string() }))
})

describe('models catalog', () => {
  test('lists every provider that has a model to choose, with the Core catalog models', () => {
    const catalog = modelCatalog()
    const anthropic = AI_PROVIDERS.find((provider) => provider.id === 'anthropic')
    expect(catalog.providers.find((provider) => provider.id === 'anthropic')).toMatchObject({
      defaultModel: anthropic?.defaultModel,
      models: anthropic?.models
    })
    for (const provider of catalog.providers) {
      expect(provider.models.length > 0 || provider.customModels).toBe(true)
    }
    expect(catalog.agents.map((agent) => agent.id)).toEqual(
      ACP_AGENTS.map((agent) => `acp:${agent.id}`)
    )
  })

  test('narrows to one provider or agent, and names the known ones for a wrong ID', () => {
    expect(modelCatalog('openrouter').providers.map((provider) => provider.id)).toEqual([
      'openrouter'
    ])
    const codex = modelCatalog('codex')
    expect(codex.providers).toEqual([])
    expect(codex.agents.map((agent) => agent.id)).toEqual(['acp:codex'])
    expect(() => modelCatalog('no-such-provider')).toThrow(/Known providers: .*openrouter/)
  })
})

describe('models CLI', () => {
  test('prints the catalog as JSON, and the models of one provider as text', async () => {
    const listed = await cli(['models', '--json'])
    expect(listed.exitCode).toBe(0)
    const catalog = v.parse(v.pipe(v.string(), v.parseJson(), catalogSchema), listed.stdout)
    expect(catalog.providers.some((provider) => provider.id === 'openai')).toBe(true)

    const anthropic = await cli(['models', '--provider', 'anthropic'])
    expect(anthropic.exitCode).toBe(0)
    const defaultModel = AI_PROVIDERS.find((provider) => provider.id === 'anthropic')?.defaultModel
    expect(anthropic.stdout).toContain(`${defaultModel}`)
    expect(anthropic.stdout).toContain('default')
    expect(anthropic.stdout).not.toContain('openrouter')
  })

  test('fails on an unknown provider', async () => {
    const unknown = await cli(['models', '--provider', 'no-such-provider'])
    expect(unknown.exitCode).toBe(1)
    expect(unknown.stderr).toContain('Unknown provider "no-such-provider"')
  })
})
