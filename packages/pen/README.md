# @open-pencil/pen

Pencil.dev `.pen` document parser and SceneGraph adapter.

This package owns the `.pen` document model and import policy. It depends on `@open-pencil/scene-graph` for the shared editable design model and does not depend on `@open-pencil/core`.

pen.dev fields a layer has no field for (`context`, `metadata`, `placeholder`, `slot`, and what a `prompt` or `context` node was, with its `model`) are kept as shared plugin data under the `pen` namespace (`PEN_PLUGIN_DATA_NAMESPACE`), one JSON value per field, so agents can read them and a writer can write them back. Notes, prompts, and context nodes become sticky notes; `slot` frames inside components become slot properties suggesting the listed components.

`script` and `browser` nodes, which this reader does not run, become placeholder frames that keep their `scriptUri` and `inputs`, or their `url`, `deviceId`, `zoom`, and scroll, as plugin data, labelled with a text layer whose `generated` plugin data marks it as the reader's. A `ref` to a component that cannot be found becomes such a placeholder too, keeping the ID it names as `ref`.

Imports (`imports: { alias: path }`) are resolved by the host: `importedDocument` names a library's contents as the importing document does (`alias:id`, `$alias:variable`), and `buildPenGraph` takes the libraries as `imports`. The library components a document uses, and the ones they use, go on the hidden library definitions page as read-only library components (`librarySource` with library `pen:<alias>`), so instances of them are library instances; `withUsedImports` lists what they draw for `penAssets`. Core's `penFormat` opens imports through `ReadDocumentInput.openImport` and reports the ones it could not open as warnings.
