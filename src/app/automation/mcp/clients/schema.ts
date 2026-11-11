import * as v from 'valibot'

/** What the desktop shell reads from a client's config file (`mcp_client_config_read`). */
export const mcpClientConfigSchema = v.object({
  displayPath: v.string(),
  installed: v.boolean(),
  content: v.nullable(v.string())
})
export type MCPClientConfig = v.InferOutput<typeof mcpClientConfigSchema>

/** What a write reports (`mcp_client_config_write`). */
export const mcpClientWriteSchema = v.object({
  backup: v.nullable(v.string())
})

/**
 * The reasons the desktop shell gives for not reading or writing a client's file: `invalid` when
 * the file cannot be read in its format, `refused` when the edit would change more than the entry.
 */
export const mcpClientFileErrorSchema = v.picklist([
  'not-installed',
  'changed',
  'invalid',
  'refused',
  'too-large',
  'unreadable',
  'write-failed'
])
export type MCPClientFileError = v.InferOutput<typeof mcpClientFileErrorSchema>
