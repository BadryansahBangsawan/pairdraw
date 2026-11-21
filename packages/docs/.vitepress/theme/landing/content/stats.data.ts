import { ALL_TOOLS, isToolExposed } from '@pairdraw/core/tools'

export interface LandingStats {
  /** Tools the MCP server exposes. */
  mcpTools: number
}

declare const data: LandingStats
export { data }

/** Counted from the source at build time, so the page cannot drift from the product. */
export default {
  load(): LandingStats {
    return {
      mcpTools: ALL_TOOLS.filter((tool) => isToolExposed(tool, 'mcp')).length
    }
  }
}
