import { computed, toValue, watch, type MaybeRefOrGetter } from 'vue'

import { agentDiscovery } from './discovery'
import { useAgentSetup } from './use'

type AgentDiscovery = typeof agentDiscovery

/**
 * The MCP server's setup while `active`, checked each time it becomes active, so Settings → MCP
 * can install or update the server with one click.
 */
export function useMCPServerSetup(
  active: MaybeRefOrGetter<boolean>,
  discovery: AgentDiscovery = agentDiscovery
) {
  const setup = useAgentSetup(discovery)
  watch(
    () => toValue(active),
    (on) => {
      if (on) void discovery.refresh(true)
    },
    { immediate: true }
  )
  return {
    state: computed(() => setup.mcpServerSetup()),
    install: () => discovery.setupCanvasBridge(),
    check: () => discovery.refresh(true)
  }
}
