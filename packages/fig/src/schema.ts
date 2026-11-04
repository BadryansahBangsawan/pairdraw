import * as v from 'valibot'

/** The `meta.json` Figma's "Save local copy…" writes: these keys, and only these. */
export const figArchiveMetaSchema = v.strictObject({
  client_meta: v.strictObject({
    background_color: v.strictObject({
      r: v.number(),
      g: v.number(),
      b: v.number(),
      a: v.number()
    }),
    thumbnail_size: v.strictObject({ width: v.number(), height: v.number() }),
    render_coordinates: v.strictObject({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number()
    })
  }),
  file_name: v.string(),
  developer_related_links: v.array(v.unknown()),
  exported_at: v.pipe(v.string(), v.isoTimestamp())
})
export type FigArchiveMetaJSON = v.InferOutput<typeof figArchiveMetaSchema>

/** What `fonts.json` records: each document font's archive file, family, and style. */
export const figFontsManifestSchema = v.array(
  v.object({
    file: v.pipe(v.string(), v.regex(/^fonts\/\d+\.(ttf|otf|woff|woff2)$/)),
    family: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
    style: v.pipe(v.string(), v.minLength(1), v.maxLength(200))
  })
)
export type FigFontsManifest = v.InferOutput<typeof figFontsManifestSchema>
