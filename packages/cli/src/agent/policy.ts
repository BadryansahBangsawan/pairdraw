import { CORE_TOOLS, isToolExposed, type ToolDef } from '@pairdraw/core/tools'

/**
 * Tools the headless agent starts with, as the app's built-in chat does: the curated Core set
 * plus the operations a design session needs that Figma plugin scripts would otherwise fake.
 * `eval` is never among them, and neither is anything reaching the network or a service.
 */
const DEFAULT_TOOL_NAMES: ReadonlySet<string> = new Set([
  ...CORE_TOOLS.map((tool) => tool.name),
  'get_components',
  'list_libraries',
  'insert_library_component',
  'get_comments',
  'add_comment',
  'reply_to_comment',
  'resolve_comment',
  'list_variables',
  'create_collection',
  'create_variable',
  'set_variable',
  'bind_variable',
  'lint',
  'lint_fix',
  'export_image',
  'list_pages',
  'create_page',
  'vectorize_image',
  'get_style',
  'rescale',
  'remove_background',
  'replace_background',
  'generate_svg'
])

/** Capabilities a headless run does not take without an explicit `--allow`. */
const OPT_IN_CAPABILITIES = ['network:access', 'settings:write'] as const

export interface AgentToolPolicy {
  catalog: readonly ToolDef[]
  allow?: readonly string[]
  deny?: readonly string[]
}

/** Parse a comma-separated tool option, ignoring blank entries. */
export function parseToolNames(value: string | undefined): string[] {
  return (
    value
      ?.split(',')
      .map((name) => name.trim())
      .filter((name) => name.length > 0) ?? []
  )
}

function assertKnown(names: readonly string[], catalog: readonly ToolDef[]): void {
  const known = new Set(catalog.map((tool) => tool.name))
  for (const name of names) {
    if (!known.has(name)) throw new Error(`Unknown tool "${name}"`)
  }
}

function reachesOutside(capabilities: readonly ToolDef['capabilities'][number][]): boolean {
  return OPT_IN_CAPABILITIES.some((capability) => capabilities.includes(capability))
}

/**
 * The tools a headless run offers: the default set plus anything named by `--allow`, minus
 * `--deny`, always without `eval`. A tool that reaches the network or a service is offered only
 * when it was named, so a design edit cannot quietly leave the machine.
 */
export function agentToolDefinitions(policy: AgentToolPolicy): ToolDef[] {
  const allow = policy.allow ?? []
  const denied = new Set(policy.deny)
  assertKnown([...allow, ...denied], policy.catalog)
  const allowed = new Set(allow)
  return policy.catalog.filter(
    (tool) =>
      (DEFAULT_TOOL_NAMES.has(tool.name) || allowed.has(tool.name)) &&
      !denied.has(tool.name) &&
      tool.availability !== 'eval' &&
      isToolExposed(tool, 'ai') &&
      (allowed.has(tool.name) || !reachesOutside(tool.capabilities))
  )
}
