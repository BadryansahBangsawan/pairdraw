import type { CloudDatabase } from '#cloud/server/db'
import { sql, type Expression, type Transaction } from 'kysely'

export const CURRENT_TIMESTAMP = sql<Date>`current_timestamp`
export const EMPTY_JSON_OBJECT = sql`'{}'::jsonb`

/**
 * Holds a transaction-scoped advisory lock on `key` until the transaction ends, so two
 * transactions that claim the same thing wait for each other instead of both reading it free.
 */
export async function lockForTransaction(
  transaction: Transaction<CloudDatabase>,
  key: string
): Promise<void> {
  await sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`.execute(transaction)
}

const CHECK_VALUE_PATTERN = /^[a-z][a-z0-9-]*$/

export function checkColumnIn(column: string, values: readonly string[]): Expression<boolean> {
  if (values.length === 0 || values.some((value) => !CHECK_VALUE_PATTERN.test(value))) {
    throw new Error('Check constraint values must be non-empty lowercase identifiers')
  }
  return sql<boolean>`${sql.ref(column)} in (${sql.join(values.map((value) => sql.lit(value)))})`
}
