# @open-pencil/pen

Pencil.dev `.pen` document parser and SceneGraph adapter.

This package owns the `.pen` document model and import policy. It depends on `@open-pencil/scene-graph` for the shared editable design model and does not depend on `@open-pencil/core`.

pen.dev fields a layer has no field for (`context`, `metadata`, `placeholder`, `slot`, and what a `prompt` or `context` node was, with its `model`) are kept as shared plugin data under the `pen` namespace (`PEN_PLUGIN_DATA_NAMESPACE`), one JSON value per field, so agents can read them and a writer can write them back. Notes, prompts, and context nodes become sticky notes; `slot` frames inside components become slot properties suggesting the listed components.
