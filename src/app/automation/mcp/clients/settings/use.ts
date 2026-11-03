import { onMounted, ref, shallowRef } from 'vue'

import { MCP_CLIENTS } from '../catalog'
import type { MCPClient, MCPClientID } from '../catalog'
import { nativeMCPClientConfigStore } from '../native'
import { inspectClient, setClientEntry } from '../service'
import type { MCPClientChange, MCPClientConfigStore, MCPClientStatus } from '../service'

/** The last switch flipped and how it went, for the section's closing alert. */
export interface MCPClientChangeNotice {
  client: MCPClientID
  name: string
  change: MCPClientChange
}

function unreadable(client: MCPClient): MCPClientStatus {
  return { id: client.id, name: client.name, installed: true, state: 'unreadable' }
}

/**
 * Settings → MCP's client switches: reads every client's file on Check again, and adds or
 * removes the entry one client at a time.
 */
export function createMCPClientSetup(
  openStore: () => Promise<MCPClientConfigStore> = nativeMCPClientConfigStore
) {
  const clients = shallowRef<MCPClientStatus[]>([])
  const loading = ref(false)
  const pending = ref<MCPClientID | null>(null)
  const notice = shallowRef<MCPClientChangeNotice | null>(null)
  let store: Promise<MCPClientConfigStore> | undefined
  let generation = 0

  function storeOnce(): Promise<MCPClientConfigStore> {
    store ??= openStore()
    return store
  }

  function replace(status: MCPClientStatus): void {
    clients.value = clients.value.map((item) => (item.id === status.id ? status : item))
  }

  async function refresh(): Promise<void> {
    const current = ++generation
    loading.value = true
    try {
      const opened = await storeOnce()
      const statuses = await Promise.all(MCP_CLIENTS.map((client) => inspectClient(opened, client)))
      // A later refresh or a switch flipped meanwhile owns the list now.
      if (current === generation) clients.value = statuses
    } catch {
      if (current === generation) clients.value = MCP_CLIENTS.map(unreadable)
    } finally {
      if (current === generation) loading.value = false
    }
  }

  async function toggle(id: MCPClientID, enabled: boolean): Promise<void> {
    const client = MCP_CLIENTS.find((item) => item.id === id)
    if (!client || pending.value) return
    // Results of a refresh already running are older than this change.
    generation++
    loading.value = false
    pending.value = id
    notice.value = null
    try {
      const opened = await storeOnce()
      const change = await setClientEntry(opened, client, enabled)
      replace(change.outcome === 'saved' ? change.status : await inspectClient(opened, client))
      notice.value = { client: id, name: client.name, change }
    } finally {
      pending.value = null
    }
  }

  return { clients, loading, pending, notice, refresh, toggle }
}

/** The switches for a mounted Settings page, read as it opens. */
export function useMCPClientSetup() {
  const setup = createMCPClientSetup()
  onMounted(() => {
    void setup.refresh()
  })
  return setup
}
