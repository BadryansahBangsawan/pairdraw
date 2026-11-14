---
title: CLI Reference
description: Complete reference for all pairdraw commands, options, and flags.
---

# CLI Reference

Document commands accept a `.fig` file as a positional argument. When omitted, the CLI connects to the running desktop app via RPC. `documents`, `undo`, `redo`, and `settings` always act on the running app.

## info

Show document info — pages, node counts, fonts, file size.

```sh
pairdraw info [file] [--json]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

## tree

Print the node hierarchy.

```sh
pairdraw tree [file] [options]
```

| Option | Description |
|--------|-------------|
| `--page` | Page name (default: first page) |
| `--depth` | Max depth (default: unlimited) |
| `--json` | Output as JSON |

## find

Search nodes by name or type.

```sh
pairdraw find [file] [options]
```

| Option | Description |
|--------|-------------|
| `--name` | Node name (partial match, case-insensitive) |
| `--type` | Node type: `FRAME`, `TEXT`, `RECTANGLE`, `INSTANCE`, etc. |
| `--page` | Page name (default: all pages) |
| `--limit` | Max results (default: 100) |
| `--json` | Output as JSON |

## node

Show detailed properties of a node.

```sh
pairdraw node [file] --id <id> [--json]
```

| Option | Description |
|--------|-------------|
| `--id` | **Required.** Node ID (e.g. `1:23`) |
| `--json` | Output as JSON |

## pages

List all pages in the document.

```sh
pairdraw pages [file] [--json]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

## variables

List design variables and collections.

```sh
pairdraw variables [file] [options]
```

| Option | Description |
|--------|-------------|
| `--collection` | Filter by collection name |
| `--type` | Filter by type: `COLOR`, `FLOAT`, `STRING`, `BOOLEAN` |
| `--json` | Output as JSON |

## tokens

Print design variables as a stylesheet of CSS custom properties. Default mode values go in `:root`; every other mode overrides them under its condition, `[data-<collection>="<mode>"]` unless the mode names a selector or `@media` query. Aliases stay `var()` references. Tokens or modes that cannot be written are listed on stderr.

```sh
pairdraw tokens [file] [options]
```

| Option | Description |
|--------|-------------|
| `--format` | `css` (default), `tailwind` for a Tailwind v4 `@theme` with a `@custom-variant` per mode, or `dtcg` for W3C design token files |
| `--out`, `-o` | Folder the `dtcg` files are written to; required for that format |
| `--collection` | Filter by collection name |
| `--type` | Filter by type: `COLOR`, `FLOAT`, `STRING`, `BOOLEAN` |
| `--json` | Output `{ css, tokenCount, issues }` as JSON |

With `--import`, the command reads a local stylesheet's custom properties into the document's
variables instead of printing them: `:root` holds each collection's default values, `.dark` and
other selectors become modes, and Tailwind's `@theme` works too.

```sh
pairdraw tokens app.fig --import theme.css --write
```

With `--project`, the command reads a local project folder instead of one stylesheet. Tailwind v4
`@theme` blocks and plain custom properties are imported. A shadcn/ui `:root` and `.dark` pair
becomes one collection with Light and Dark modes. `tailwind.config.js` and other project
JavaScript are reported and not run. A path that leaves the folder is refused, and a file over
1 MiB is skipped. Reading also stops, and reports it, after 200 files or 8 MiB in total.
Component source is not imported.

```sh
pairdraw tokens app.fig --project ./app --write
```

| Option | Description |
|--------|-------------|
| `--import` | Local CSS file to import as variables |
| `--project` | Local project folder whose CSS variables are imported |
| `--write` | Write the import back to the input file |
| `--output` | Write to a different file instead |

## export

Export to PNG, JPG, WEBP, SVG, JSX, HTML, `.fig`, or Storybook stories.

```sh
pairdraw export [file] [options]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `--format` | `-f` | `png` (default), `jpg`, `webp`, `svg`, `pdf`, `pptx`, `jsx`, `tailwind-jsx`, `html`, `fig`, `storybook` |
| `--output` | `-o` | Output file path (default: `<name>.<format>`); a directory for `storybook` (default: `<name>-stories`) |
| `--scale` | `-s` | Export scale (default: 1) |
| `--quality` | `-q` | Quality 0–100, JPG/WEBP only (default: 90) |
| `--page` | | Page name (default: first page; `fig`, `pptx`, and `storybook` default to every page) |
| `--node` | | Node ID to export (default: all top-level nodes) |
| `--style` | | JSX style: `pairdraw` (default), `tailwind` (same as `-f tailwind-jsx`) |
| `--html` | | HTML mode: `fragment` (default), `standalone` |
| `--css` | | HTML CSS output: `inline` (default), `tailwind` |
| `--assets` | | Standalone HTML assets: `inline` (default), `external` |
| `--fonts` | | Standalone HTML font output: `assets`, `none` (default) |
| `--framework` | | Storybook framework: `react` (default), `vue`, `html` |
| `--design-images` | | Storybook: render a PNG per variant for the Design panel (default: on; `--no-design-images` to skip) |
| `--watch` | | Storybook: re-export whenever the document is saved |
| `--beside` | | Storybook: write each document's stories into the document's own folder; the file argument can then be several files or a quoted glob |
| `--thumbnail` | | Export page thumbnail instead of full render |
| `--width` | | Thumbnail width (default: 1920) |
| `--height` | | Thumbnail height (default: 1080) |

## libraries

Manage filesystem catalogs of component libraries.

```sh
pairdraw libraries list --root ./catalog
pairdraw libraries publish components.fig --root ./catalog --id my-lib --name "My Library"
pairdraw libraries seed --root ./catalog
```

| Subcommand | Description |
|------------|-------------|
| `list` | List the catalog's libraries; `--root` is required, `--json` prints machine-readable output |
| `publish` | Publish a `.fig` document as a revision; `--id` and `--name` name the library, `--write` saves new asset keys back to the source, `--previous` expects a revision |
| `seed` | Publish the built-in original **Pairdraw Basics** set (button, input, badge, card, avatar) into the catalog; does nothing when it is already there |

## import

Import HTML/CSS/Tailwind into an editable Pairdraw document.

```sh
pairdraw import page.html [options]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `--format` | `-f` | Output format: `fig` (default), `json` |
| `--output` | `-o` | Output file path (default: `<name>.<format>`) |
| `--css` | | CSS file to apply before conversion |
| `--css-text` | | Inline CSS text to apply before conversion |
| `--tailwind` | | Tailwind utility candidates to compile and apply |
| `--tailwind-file` | | File containing Tailwind utility candidates |
| `--page-name` | | Scene graph page name (default: `DOM/CSS`) |
| `--json` | | Print a machine-readable summary |

Examples:

```sh
pairdraw import card.html --css card.css -o card.fig
pairdraw import card.html --tailwind "flex flex-col gap-3 w-80 p-6 rounded-xl bg-white" -o card.fig
```

## eval

Execute JavaScript with the Figma Plugin API.

```sh
pairdraw eval [file] [options]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `--code` | `-c` | JavaScript code to execute |
| `--stdin` | | Read code from stdin |
| `--write` | `-w` | Write changes back to the input file |
| `--output` | `-o` | Write to a different file |
| `--preview-output` | | Write a PNG of the current page after the script runs |
| `--preview-scale` | | Preview scale from 0.1 to 4 (default: 1); the longest edge stays within 1280 pixels |
| `--json` | | Output as JSON |
| `--quiet` | `-q` | Suppress output |

## analyze colors

Analyze color palette usage across the document.

```sh
pairdraw analyze colors [file] [options]
```

| Option | Description |
|--------|-------------|
| `--limit` | Max colors to show (default: 30) |
| `--threshold` | Distance threshold for clustering similar colors, 0–50 (default: 15) |
| `--similar` | Show similar color clusters |
| `--json` | Output as JSON |

## analyze typography

Analyze font family, size, and weight distribution.

```sh
pairdraw analyze typography [file] [options]
```

| Option | Description |
|--------|-------------|
| `--group-by` | Group by: `family`, `size`, `weight` (default: show all styles) |
| `--limit` | Max styles to show (default: 30) |
| `--json` | Output as JSON |

## analyze spacing

Analyze gap and padding values across auto-layout frames.

```sh
pairdraw analyze spacing [file] [options]
```

| Option | Description |
|--------|-------------|
| `--grid` | Base grid size to check against (default: 8) |
| `--json` | Output as JSON |

## analyze clusters

Find repeated node patterns — potential components.

```sh
pairdraw analyze clusters [file] [options]
```

| Option | Description |
|--------|-------------|
| `--limit` | Max clusters to show (default: 20) |
| `--min-size` | Min node size in px (default: 30) |
| `--min-count` | Min instances to form a cluster (default: 2) |
| `--json` | Output as JSON |

## diff create

Patch that turns one node tree into another, as JSX attribute changes plus moved, added, and removed children. Children match by name; see [Comparing designs](/programmable/cli/comparing) for the format.

```sh
pairdraw diff create [file] --from <id> --to <id> [options]
```

| Option | Description |
|--------|-------------|
| `--from` | Source node ID |
| `--to` | Target node ID |
| `--depth` | Max tree depth (default: 10) |
| `--json` | Output as JSON |

## diff jsx

Structural diff between two nodes as design JSX.

```sh
pairdraw diff jsx [file] --from <id> --to <id> [--json]
```

## diff show

Preview the patch that setting JSX attributes on a node would produce, without changing it.

```sh
pairdraw diff show <id> [file] --attributes '<jsx attributes>' [--json]
```

`--attributes` takes attributes as the JSX export writes them, such as `'w={200} bg="#FF0000"'`.

## diff apply

Apply a patch from `diff create`, `diff show`, or `diff files`. Every node must still match the patch's old values unless `--force` is set, and nothing changes unless every hunk applies.

```sh
pairdraw diff apply <patch> [file] [options]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `--dry-run` | | Validate and list changes without applying |
| `--force` | | Apply even when current values differ from the patch |
| `--write` | `-w` | Write changes back to the input file |
| `--output` | `-o` | Write to a different file |
| `--json` | | Output as JSON |

Pass `-` as the patch path to read it from stdin.

## diff visual

Pixel diff between two rendered nodes, written as a PNG with changed pixels in red.

```sh
pairdraw diff visual [file] --from <id> --to <id> --output <png> [options]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `--output` | `-o` | Diff PNG path |
| `--scale` | | Render scale before the max-edge limit (default: 1) |
| `--max-edge` | | Maximum image width or height (default: 1280) |
| `--threshold` | | Color tolerance 0–1; smaller is stricter (default: 0.1) |
| `--json` | | Output as JSON |

## diff files

Structural diff of two documents, page by page. Pages match by name and nodes by name path, so two versions of a file compare even though their node IDs differ. Exits with status 1 when the documents differ and 2 when the options are invalid, such as a `--page` neither document has.

```sh
pairdraw diff files <before> <after> [options]
```

| Option | Description |
|--------|-------------|
| `--page` | Compare only the page with this name |
| `--depth` | Max tree depth below each page (default: unlimited) |
| `--json` | Output as JSON |

## documents

Manage documents (tabs) in the running app. See [Controlling the App](/programmable/cli/app-control).

```sh
pairdraw documents list [--json]
pairdraw documents open <file> [--json]
pairdraw documents new [--path <file>] [--json]
pairdraw documents save [--path <file>] [--document-id <id>] [--json]
pairdraw documents close [--save | --discard] [--path <file>] [--document-id <id>] [--json]
pairdraw documents activate <document-id> [--page-id <id>] [--json]
```

| Option | Description |
|--------|-------------|
| `--path` | `.fig` path to create or save to; relative to the current directory |
| `--save` | `close`: save unsaved changes first |
| `--discard` | `close`: close without saving; unsaved changes are lost |
| `--document-id` | Target document; defaults to the active tab |
| `--page-id` | Page to switch the activated document to |
| `--json` | Output the result and target document as JSON |

## undo / redo

Undo or redo the newest change made through the CLI or MCP in the running app. Fails when the newest change was made in the editor; see [Controlling the App](/programmable/cli/app-control#undo-and-redo).

```sh
pairdraw undo [--document-id <id>] [--json]
pairdraw redo [--document-id <id>] [--json]
```

## settings

Read and change editor settings in the running app by dotted key. Values parse as JSON, falling back to plain strings.

```sh
pairdraw settings get [key] [--json]
pairdraw settings set <key> <value> [--json]
```

See [Controlling the App](/programmable/cli/app-control#settings) for the available keys.

## tool

List, describe, and call the editor tools that the MCP server exposes.

```sh
pairdraw tool list [--json]
pairdraw tool describe <name> [--json]
pairdraw tool call <name> [file] [options]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `--args` | | Tool arguments as a JSON object |
| `--args-file` | | Read arguments from a JSON file, or `-` for stdin |
| `--write` | `-w` | Headless: write changes back to the input file |
| `--output` | `-o` | Headless: write changes to a different file |
| `--preview-output` | | Write a PNG of the current page after the tool changes the document |
| `--preview-scale` | | Preview scale from 0.1 to 4 (default: 1); the longest edge stays within 1280 pixels |
| `--document-id` | | App: target document |
| `--page-id` | | App: target page |
| `--json` | | Output as JSON |

## shell

Open a document once and run tools on it line by line, with `save()` and `exit()`. Reads lines from stdin when it is not a terminal and exits with status 1 if any line failed. See [Controlling the App](/programmable/cli/app-control#interactive-shell).

```sh
pairdraw shell [file] [options]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `--output` | `-o` | Where `save()` writes without a path (default: the input file) |
| `--preview-output` | | Write a PNG of the current page after each change |
| `--preview-scale` | | Preview scale from 0.1 to 4 (default: 1); the longest edge stays within 1280 pixels |
| `--document-id` | | App: target document |
| `--page-id` | | App: target page |

## models

List the AI providers and models the chat can use, and the ACP agents.

```sh
pairdraw models [--provider <id>] [--json]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `--provider` | `-p` | Only this provider or ACP agent, by ID (for example `openrouter` or `acp:codex`) |
| `--json` | | Output as JSON |

## fonts

Report fonts used by a document.

```sh
pairdraw fonts [file] [options]
```

| Option | Description |
|--------|-------------|
| `--document-id` | Target Pairdraw document/tab ID when connected to the running app |
| `--page-id` | Target page ID when connected to the running app |
| `--json` | Output as JSON |

## selection

Get current selection from the running app.

```sh
pairdraw selection [options]
```

| Option | Description |
|--------|-------------|
| `--document-id` | Target Pairdraw document/tab ID when connected to the running app |
| `--page-id` | Target page ID when connected to the running app |
| `--json` | Output as JSON |

## formats

List supported document and export formats.

```sh
pairdraw formats [options]
```

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

## convert

Convert a document to another writable format.

```sh
pairdraw convert <file> [options]
```

| Option | Alias | Description |
|--------|-------|-------------|
| `--output` | `-o` | Output file path (default: `<name>.<format>`) |
| `--format` | `-f` | Output format: `fig` (default), `png`, `jpg`, `webp`, `svg`, `pdf`, `pptx`, `jsx`, `tailwind-jsx`, `html`, `storybook` |
| `--font-policy` | | When a font of the document is missing: `warn`, `strict` (fail without writing), or `allow` (default: `warn`) |

## agent

Drive a document from a model: run, and see which tools it may call.

```sh
pairdraw agent run [file] [--model <id>] [--json]
pairdraw agent tools [--json]
pairdraw agent list [--json]
```

| Subcommand | Description |
|------------|-------------|
| `run` | Run a design agent on a document through an OpenAI-compatible model |
| `tools` | List the tools an agent run can call by default |
| `list` | List the named agents a run can put in a team |

## query

Query nodes using XPath selectors.

```sh
pairdraw query [file] [selector] [options]
```

| Option | Description |
|--------|-------------|
| `selector` | XPath selector (e.g. `//FRAME[@width < 300]`, `//TEXT[contains(@name, "Label")]`) |
| `--page` | Page name (default: all pages) |
| `--limit` | Max results (default: 1000) |
| `--document-id` | Target Pairdraw document/tab ID when connected to the running app |
| `--page-id` | Target page ID when connected to the running app |
| `--json` | Output as JSON |
