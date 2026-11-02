import { defineCommand } from 'citty'
import { compact, isEmptyObject } from 'es-toolkit'

import { ACP_AGENTS, AI_PROVIDERS, type ModelOption } from '@open-pencil/core/constants'

import { bold, dim, entity, fmtList, printError } from '#cli/format'

const json = { type: 'boolean', description: 'Output as JSON' } as const

/** A provider the AI chat can use, with the models it recommends. */
export interface ModelCatalogProvider {
  id: string
  name: string
  defaultModel: string
  /** Any model ID the provider serves can be typed in, not only the listed ones. */
  customModels: boolean
  customBaseURL: boolean
  signInOnly: boolean
  models: ModelOption[]
}

/** An ACP agent; it runs its own models and lists none here. */
export interface ModelCatalogAgent {
  id: string
  name: string
  command: string
}

export interface ModelCatalog {
  providers: ModelCatalogProvider[]
  agents: ModelCatalogAgent[]
}

/**
 * The providers and models the AI chat offers, from the Core catalog. A provider with no listed
 * models that takes no custom model either has nothing to choose, so it is left out.
 */
export function modelCatalog(providerID?: string): ModelCatalog {
  const providers = AI_PROVIDERS.filter(
    (provider) => provider.models.length > 0 || provider.supportsCustomModel
  ).map((provider) => ({
    id: provider.id,
    name: provider.name,
    defaultModel: provider.defaultModel,
    customModels: provider.supportsCustomModel === true,
    customBaseURL: provider.supportsCustomBaseURL === true,
    signInOnly: provider.signInOnly === true,
    models: provider.models
  }))
  const agents = ACP_AGENTS.map((agent) => ({
    id: `acp:${agent.id}`,
    name: agent.name,
    command: agent.command
  }))
  if (!providerID) return { providers, agents }
  const matches = (id: string) => id === providerID || id === `acp:${providerID}`
  const catalog = {
    providers: providers.filter((p) => matches(p.id)),
    agents: agents.filter((a) => matches(a.id))
  }
  if (catalog.providers.length === 0 && catalog.agents.length === 0) {
    const known = [...providers, ...agents].map((entry) => entry.id).join(', ')
    throw new Error(`Unknown provider "${providerID}". Known providers: ${known}`)
  }
  return catalog
}

function modelHeader(model: ModelOption, defaultModel: string): string {
  const notes = [model.name, model.tag, model.id === defaultModel ? 'default' : undefined]
  return `${model.id} ${dim(compact(notes).join(' · '))}`
}

function modelDetails(model: ModelOption): Record<string, string> | undefined {
  const details: Record<string, string> = {}
  if (model.capabilities?.length) details.capabilities = model.capabilities.join(', ')
  if (model.status && model.status !== 'active') details.status = model.status
  return isEmptyObject(details) ? undefined : details
}

function printProvider(provider: ModelCatalogProvider): void {
  const header = entity('provider', provider.name, provider.id)
  const details = provider.customModels
    ? { 'custom models': 'any model ID the provider serves' }
    : undefined
  console.log(fmtList([{ header, details }], { numbered: false, compact: true }))
  if (provider.models.length > 0) {
    console.log(
      fmtList(
        provider.models.map((model) => ({
          header: modelHeader(model, provider.defaultModel),
          details: modelDetails(model)
        })),
        { compact: true }
      )
    )
  }
  console.log('')
}

export default defineCommand({
  meta: { description: 'List the AI providers and models the chat can use' },
  args: {
    provider: {
      type: 'string',
      alias: 'p',
      description: 'Only this provider or ACP agent, by ID (for example openrouter or acp:codex)',
      required: false
    },
    json
  },
  run({ args }) {
    try {
      const catalog = modelCatalog(args.provider)
      if (args.json) {
        console.log(JSON.stringify(catalog, null, 2))
        return
      }
      console.log('')
      for (const provider of catalog.providers) printProvider(provider)
      if (catalog.agents.length === 0) return
      console.log(bold('Agents (ACP; each runs its own models)'))
      console.log(
        fmtList(
          catalog.agents.map((agent) => ({
            header: `${agent.id} ${dim(agent.name)}`,
            details: { command: agent.command }
          })),
          { compact: true }
        )
      )
      console.log('')
    } catch (error) {
      printError(error)
      process.exit(1)
    }
  }
})
