<script setup lang="ts">
import { useMCPClientSetup } from '@/app/automation/mcp/clients/settings/use'

import MCPClientsSection from './MCPClientsSection.vue'

/** The desktop's client switches, reading and writing through the shell. */
const { clients, loading, pending, notice, refresh, toggle } = useMCPClientSetup()
</script>

<template>
  <MCPClientsSection
    :statuses="clients"
    :loading="loading"
    :pending="pending"
    :notice="notice"
    @refresh="refresh"
    @toggle="toggle"
  />
</template>
