import { createPostgresCloudDatabase } from '#cloud/runtime/postgres/database'
import { createBetterAuthAdapter, migrateCloudDatabase } from '#cloud/server'

import { loadNodeCloudServerConfig } from './config'

const config = await loadNodeCloudServerConfig(process.env)
// A migration may rewrite a large table, which takes as long as it takes.
const database = createPostgresCloudDatabase({
  connectionString: config.databaseURL,
  statementTimeoutMs: null
})
try {
  // The migration is what brings the schema up to date, so the adapter must not check it first:
  // on a fresh database that check logs every auth table as missing.
  const auth = createBetterAuthAdapter(config, database, undefined, { validateSchema: false })
  await migrateCloudDatabase(database, { run: auth.migrate, schemaVersion: auth.schemaVersion })
} finally {
  await database.destroy()
}
