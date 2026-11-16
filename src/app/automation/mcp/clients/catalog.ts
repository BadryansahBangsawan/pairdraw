import { PAIRDRAW_MCP_SERVER } from '@pairdraw/core/constants'

/** The command `npm install -g @pairdraw/mcp` puts on the PATH, which clients start. */
export const MCP_CLIENT_COMMAND = 'pairdraw-mcp'

/** The name every client knows the server by, so its tool names match the docs. */
export const MCP_CLIENT_ENTRY = PAIRDRAW_MCP_SERVER

const MCP_CLIENT_IDS = [
  'claude-code',
  'claude-desktop',
  'codex',
  'gemini-cli',
  'opencode',
  'kiro',
  'cursor',
  'vs-code',
  'omp'
] as const

export type MCPClientID = (typeof MCP_CLIENT_IDS)[number]

/** A client that keeps its servers in a JSON (with comments) object under `container`. */
export interface MCPClientJSONFormat {
  kind: 'json'
  container: string
  /** The entry this client's own docs describe for a local stdio server. */
  entry: Readonly<Record<string, unknown>>
}

/** Codex, which keeps its servers in `[mcp_servers.<name>]` tables of `config.toml`. */
interface MCPClientTOMLFormat {
  kind: 'toml'
}

export interface MCPClient {
  id: MCPClientID
  /** The product's own name, which is not translated. */
  name: string
  format: MCPClientJSONFormat | MCPClientTOMLFormat
}

const MCP_SERVERS = 'mcpServers'

/** The clients Settings → MCP sets up, in the order it lists them. */
export const MCP_CLIENTS: readonly MCPClient[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    format: {
      kind: 'json',
      container: MCP_SERVERS,
      entry: { type: 'stdio', command: MCP_CLIENT_COMMAND, args: [] }
    }
  },
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    format: { kind: 'json', container: MCP_SERVERS, entry: { command: MCP_CLIENT_COMMAND } }
  },
  { id: 'codex', name: 'Codex', format: { kind: 'toml' } },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    format: { kind: 'json', container: MCP_SERVERS, entry: { command: MCP_CLIENT_COMMAND } }
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    format: {
      kind: 'json',
      container: 'mcp',
      entry: { type: 'local', command: [MCP_CLIENT_COMMAND], enabled: true }
    }
  },
  {
    id: 'kiro',
    name: 'Kiro',
    format: {
      kind: 'json',
      container: MCP_SERVERS,
      entry: { command: MCP_CLIENT_COMMAND, args: [] }
    }
  },
  {
    id: 'cursor',
    name: 'Cursor',
    format: { kind: 'json', container: MCP_SERVERS, entry: { command: MCP_CLIENT_COMMAND } }
  },
  {
    id: 'vs-code',
    name: 'VS Code',
    format: {
      kind: 'json',
      container: 'servers',
      entry: { type: 'stdio', command: MCP_CLIENT_COMMAND }
    }
  },
  {
    id: 'omp',
    name: 'omp',
    format: {
      kind: 'json',
      container: MCP_SERVERS,
      entry: { type: 'stdio', command: MCP_CLIENT_COMMAND, args: [] }
    }
  }
]
