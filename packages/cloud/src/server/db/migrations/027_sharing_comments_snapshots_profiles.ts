import type { Kysely } from 'kysely'

import { addCurrentTimestampColumns, replaceCheckConstraint } from './helpers'

const PERMISSION_TABLES = ['document_share', 'document_grant', 'document_invitation'] as const
type PermissionTables = Record<(typeof PERMISSION_TABLES)[number], { permission: string }>

/**
 * Three ways to share more precisely: a "can comment" permission for links, grants, and
 * invitations; snapshot links that show one revision as it was shared; and public profiles that
 * list the workspaces their owner made public.
 */
export async function up(database: Kysely<unknown>): Promise<void> {
  for (const table of PERMISSION_TABLES) {
    await replaceCheckConstraint(database, table, `${table}_permission_check`, 'permission', [
      'view',
      'comment',
      'edit'
    ])
  }

  // A snapshot link keeps its revision; the revision going takes the link with it.
  await database.schema
    .alterTable('document_share')
    .addColumn('revision_id', 'uuid', (column) =>
      column.references('document_revision.id').onDelete('cascade')
    )
    .execute()
  await database.schema
    .createIndex('document_share_revision_index')
    .on('document_share')
    .columns(['revision_id', 'revoked_at'])
    .execute()

  // When the workspace went public, and the administrator whose profile lists it; both null while
  // it is private. Better Auth's tables may come after this migration, so neither is a foreign key.
  await database.schema
    .alterTable('workspace')
    .addColumn('public_at', 'timestamptz')
    .addColumn('public_by', 'uuid')
    .execute()

  await database.schema
    .createTable('public_profile')
    // Better Auth's tables may come after this migration, so the account is not a foreign key.
    .addColumn('user_id', 'uuid', (column) => column.primaryKey())
    .addColumn('handle', 'text', (column) => column.notNull().unique())
    .addColumn('bio', 'text')
    .execute()
  await addCurrentTimestampColumns(database, 'public_profile', ['created_at', 'updated_at'])
}

export async function down(database: Kysely<unknown>): Promise<void> {
  await database.schema.dropTable('public_profile').ifExists().execute()
  await database.schema
    .alterTable('workspace')
    .dropColumn('public_by')
    .dropColumn('public_at')
    .execute()
  await database.schema.dropIndex('document_share_revision_index').ifExists().execute()
  await database.schema.alterTable('document_share').dropColumn('revision_id').execute()
  for (const table of PERMISSION_TABLES) {
    // Commenters keep looking; they lose only the comments.
    await (database as Kysely<PermissionTables>)
      .updateTable(table)
      .set({ permission: 'view' })
      .where('permission', '=', 'comment')
      .execute()
    await replaceCheckConstraint(database, table, `${table}_permission_check`, 'permission', [
      'view',
      'edit'
    ])
  }
}
