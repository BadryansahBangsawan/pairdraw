import { createPostgresCloudDatabase } from '#cloud/runtime/postgres/database'
import {
  createBetterAuthAdapter,
  migrateCloudDatabase,
  type CloudServerConfig
} from '#cloud/server'

import { loadNodeCloudServerConfig } from './config'

export async function createMigratedNodeCloudDatabase(
  environment: Readonly<Record<string, string | undefined>>
): Promise<{
  config: CloudServerConfig
  database: ReturnType<typeof createPostgresCloudDatabase>
  auth: ReturnType<typeof createBetterAuthAdapter>
}> {
  const config = await loadNodeCloudServerConfig(environment)
  // Migrations run on a connection of their own without the statement timeout, since one may
  // rewrite a large table.
  const migrating = createPostgresCloudDatabase({
    connectionString: config.databaseURL,
    statementTimeoutMs: null
  })
  try {
    const auth = createBetterAuthAdapter(config, migrating)
    await migrateCloudDatabase(migrating, { run: auth.migrate, schemaVersion: auth.schemaVersion })
  } finally {
    await migrating.destroy()
  }
  const database = createPostgresCloudDatabase({ connectionString: config.databaseURL })
  return { config, database, auth: createBetterAuthAdapter(config, database) }
}
