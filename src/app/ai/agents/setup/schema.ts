import * as v from 'valibot'

/** The cloud Claude Code is set up to use instead of an Anthropic sign-in. */
export const claudeCodeCloudSchema = v.picklist(['bedrock', 'vertex', 'foundry'])

/** What a host reports finding on the agents' computer: `agent_lookup` or a companion's `/agents`. */
export const agentLookupSchema = v.object({
  executables: v.record(v.string(), v.nullable(v.string())),
  /** Versions of OpenPencil's own companions, keyed by package name. */
  versions: v.record(v.string(), v.nullable(v.string())),
  /** Whether this user can write npm's global folder; null without npm. */
  npmGlobalWritable: v.nullish(v.boolean()),
  searchPath: v.string(),
  /** Read from Claude Code's `CLAUDE_CODE_USE_*` switches; absent from older hosts. */
  claudeCodeCloud: v.nullish(v.fallback(v.nullable(claudeCodeCloudSchema), null))
})
