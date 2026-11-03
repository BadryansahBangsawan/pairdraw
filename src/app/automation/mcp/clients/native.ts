import type { MCPClientConfigStore } from './service'

/** The desktop's store, through the shell's commands that resolve each client's own file. */
export async function nativeMCPClientConfigStore(): Promise<MCPClientConfigStore> {
  const { invoke } = await import('@tauri-apps/api/core')
  return {
    read: (client) => invoke<unknown>('mcp_client_config_read', { client }),
    write: (client, enabled, content, expected) =>
      invoke<unknown>('mcp_client_config_write', { client, enabled, content, expected })
  }
}
