#!/usr/bin/env node
import dedent from 'dedent'

import { startNodeAIRelay } from './server'

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(dedent`
    Usage: pairdraw-ai-relay

    Runs the reference AI service for a self-hosted Pairdraw Cloud. Settings come from the
    environment:
      PAIRDRAW_AI_RELAY_CONFIG  the relay TOML file (required)
      PORT, HOST                  where to listen (default 8788 on 0.0.0.0)
    plus the secrets the TOML names. See https://github.com/BadryansahBangsawan/pairdraw/blob/master/packages/docs/reference/self-hosting-cloud.md
  `)
  process.exit(0)
}

const relay = await startNodeAIRelay()
console.log(`Pairdraw AI relay listening on ${relay.url}`)

let stopping: Promise<void> | undefined

function shutdown() {
  stopping ??= relay.stop().then(
    () => process.exit(0),
    (error: unknown) => {
      console.error('[AI relay] Shutdown failed:', error)
      process.exit(1)
    }
  )
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
