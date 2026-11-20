import * as v from 'valibot'

/**
 * A path from the document's folder, never one that names a place on its own: no leading `/` or
 * `\\` (POSIX roots, UNC shares), no `~` (a home folder), and no drive letter or URL scheme such
 * as `C:` or `file:`.
 */
export const relativeTokenPathSchema = v.pipe(
  v.string(),
  v.nonEmpty(),
  v.maxLength(1024),
  v.check(
    (path) => !/^(?:[/\\~]|[a-z][\w+.-]*:)/i.test(path),
    'A linked path is relative to the document'
  )
)

const tokenSourceSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty(), v.maxLength(64)),
  /** A stylesheet, a project folder, or W3C design token files. */
  kind: v.picklist(['css', 'folder', 'dtcg']),
  /** The file or folder name, for people. */
  name: v.pipe(v.string(), v.maxLength(256)),
  /** Where it is from the document's folder, when the document has one. */
  path: v.optional(relativeTokenPathSchema),
  syncedAt: v.optional(v.pipe(v.string(), v.isoTimestamp())),
  /** What the code held at the last sync: a value signature by variable id and mode id. */
  snapshot: v.record(v.string(), v.record(v.string(), v.string())),
  /**
   * The token each variable was at the last sync, `Collection/name` by variable id, so a variable
   * deleted on the canvas is known when the code still has it.
   */
  names: v.optional(v.record(v.string(), v.string()))
})

export type TokenSource = v.InferOutput<typeof tokenSourceSchema>

/** The code a document's variables are linked to; entries that cannot be read are left out. */
export const tokenSourcesSchema: v.GenericSchema<unknown, TokenSource[]> = v.pipe(
  v.array(v.unknown()),
  v.transform((items) =>
    items.flatMap((item) => {
      const parsed = v.safeParse(tokenSourceSchema, item)
      return parsed.success ? [parsed.output] : []
    })
  )
)
