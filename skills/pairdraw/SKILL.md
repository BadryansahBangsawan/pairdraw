---
name: pairdraw
description: Work with Figma .fig design files and the running Pairdraw editor — inspect structure, query nodes, analyze design tokens, export PNG/SVG/PDF/JSX, and modify designs programmatically. Use when asked to open, inspect, export, analyze, or edit .fig files, or to control the running Pairdraw app.
---

# Pairdraw

Pairdraw provides a CLI and MCP server for `.fig` design files and the running Pairdraw editor.

Use two modes:

- **App mode** — connect to the running Pairdraw editor by omitting the file argument.
- **Headless mode** — work with `.fig` files directly by passing a file path.

```bash
# App mode — operates on the document open in the editor
pairdraw tree

# Headless mode — operates on a .fig file
pairdraw tree design.fig
```

Use `pairdraw --help`, per-command help, and the connected MCP server’s tool schemas to check the installed version’s capabilities. See the [CLI reference](https://github.com/BadryansahBangsawan/pairdraw/blob/main/packages/docs/reference/cli.md) and [MCP guide](https://github.com/BadryansahBangsawan/pairdraw/blob/main/packages/docs/programmable/mcp-server.md) for current documentation.

## Variable formulas

Inside `eval`, use `pairdraw.setVariableFormula('Spacing', 'large', '{base} * 2')` for numeric formulas or `pairdraw.setVariableFormula('State', 'visible', '{viewport} > 1024 and not {loading}')` for Boolean formulas, which use `and`, `or`, `not` and number comparisons. Collections and variables must already exist. An optional fourth argument selects a mode by name; otherwise the default mode is edited. The call validates before mutation and returns the resolved value. Length formulas use stored pixels. The CSS stylesheet writes number formulas as `calc()`; design-token files hold the result with the formula in `$extensions`.

Variables follow Figma's plugin API: `figma.variables.getLocalVariables()`, `createVariable(name, collection, type)`, `variable.setValueForMode(modeId, value)`, and `node.setBoundVariable(field, variable)` with Figma's field names (`characters`, `width`, `paddingLeft`) and types; paint colours bind through `figma.variables.setBoundVariableForPaint`. To bind as the layer panel does, use `pairdraw.bindVariable(node, field, variable)` and `pairdraw.unbindVariable(node, field)` with Pairdraw names (`text`, `visible`, `opacity`, `fills/0/color`): text content takes a text or number variable, shown as text; visibility a boolean or text one. `pairdraw` also sets layout and text direction (`setLayoutDirection`, `setTextDirection`), OkHCL paint colors (`setFillOkHCL`, `setStrokeOkHCL`), exposes instance swaps (`exposeInstanceSwap`), and reports font availability (`getFontStatus()`); booleans and flattening are Figma's `figma.union`, `subtract`, `intersect`, `exclude` and `figma.flatten`.

## Requirements

```bash
# CLI
bun add -g @pairdraw/cli

# MCP server used by the desktop app and external MCP clients
bun add -g @pairdraw/mcp
```

The desktop app starts `pairdraw-mcp-http` automatically in production Tauri builds when `@pairdraw/mcp` is installed globally and exposes automation on:

- HTTP/RPC: `http://127.0.0.1:7600`
- WebSocket bridge: `ws://127.0.0.1:7601`
- MCP Streamable HTTP: `http://127.0.0.1:7600/mcp`

## CLI Commands

```bash
pairdraw --help
```

Common commands:

- `info` — document overview: pages, node counts, fonts
- `tree` — print hierarchy with types and sizes
- `pages` — list pages
- `node` — detailed node properties by ID
- `selection` — current selection from the running app
- `find` — find nodes by name/type
- `query` — XPath selectors for node search
- `variables` — list variables and collections
- `tokens` — variables as a CSS custom-property stylesheet, a Tailwind v4 theme, or W3C design token files (`--format dtcg --out <folder>`)
- `export` — export PNG/JPG/WEBP/SVG/PDF/JSX/.fig
- `convert` — convert between supported document formats
- `analyze` — colors, typography, spacing, repeated clusters
- `lint` — consistency, structure, and accessibility checks
- `formats` — supported document/export formats
- `eval` — execute JavaScript with the Figma Plugin API
- `tool` — list, describe, and call any MCP tool from the shell, in app or headless mode
- `documents` — list, open, create, save, close, and activate documents in the running app
- `undo` / `redo` — step back through your own (automation) changes in the running app
- `settings` — read and change editor settings in the running app

### Inspect

```bash
pairdraw info design.fig
pairdraw tree design.fig
pairdraw tree --page "Components" --depth 3  # app mode
pairdraw pages design.fig
pairdraw node design.fig --id 1:23
pairdraw node --id 1:23  # app mode
pairdraw selection --json
pairdraw variables design.fig
pairdraw variables --collection "Colors" --type COLOR
pairdraw tokens design.fig --format tailwind > theme.css
pairdraw tokens design.fig --format dtcg --out tokens  # W3C design tokens; import_design_tokens reads them back
```

### Search and XPath query

```bash
pairdraw find design.fig --name "Button"
pairdraw find --type FRAME                          # app mode
pairdraw find design.fig --type TEXT --page "Home"
pairdraw find design.fig --name "Card" --type COMPONENT --limit 50

pairdraw query design.fig "//FRAME"
pairdraw query design.fig "//FRAME[@width < 300]"
pairdraw query design.fig "//TEXT[contains(@name, 'Button')]"
pairdraw query design.fig "//COMPONENT[@stackMode]"
pairdraw query design.fig "//COMPONENT//FRAME//TEXT"
pairdraw query "//FRAME[@width > 1000]"             # app mode
```

Common node types: `FRAME`, `TEXT`, `RECTANGLE`, `ELLIPSE`, `VECTOR`, `GROUP`, `COMPONENT`, `COMPONENT_SET`, `INSTANCE`, `SECTION`, `LINE`, `STAR`, `POLYGON`, `SLICE`, `BOOLEAN_OPERATION`.

### Export and convert

```bash
pairdraw export design.fig -o hero.png
pairdraw export -o hero.png                         # app mode
pairdraw export design.fig --node 1:23 -s 2 -o button@2x.png
pairdraw export design.fig -f jpg -q 85 -o preview.jpg
pairdraw export design.fig -f svg --node 1:23 -o icon.svg
pairdraw export design.fig -f pdf -o page.pdf
pairdraw export design.fig -f fig -o roundtrip.fig
pairdraw export design.fig -f jsx -o component.jsx
pairdraw export design.fig -f jsx --style tailwind -o component.tsx
pairdraw export design.pen -f storybook -o src/stories --watch  # stories + design images per component, re-exported on save
pairdraw export 'src/**/*.pen' -f storybook --beside  # stories next to each design file
pairdraw export design.fig --thumbnail --width 1920 --height 1080
pairdraw export flow.fig -f gif --start "Hero 1" -o hero.gif  # record the prototype's After delay chain
pairdraw export --page "Components" -o components.png

pairdraw convert design.fig -o design.pen
pairdraw formats
```

### Analyze and lint

```bash
pairdraw analyze colors design.fig
pairdraw analyze colors --similar --threshold 10     # app mode
pairdraw analyze typography design.fig --group-by size
pairdraw analyze spacing design.fig --grid 8
pairdraw analyze clusters design.fig --min-count 3
pairdraw lint design.fig
pairdraw lint design.fig --json
pairdraw lint design.fig --fix -o fixed.fig     # bind matching color variables, round to whole pixels
```

In MCP and AI chat, `lint` lists findings with their `fix` and `suggestions`; `lint_fix` applies the safe fixes, and the first suggestion of each finding with `suggestions: true`.

### Eval (Figma Plugin API)

Execute JavaScript against the document using a Figma Plugin API-compatible runtime:

```bash
pairdraw eval design.fig -c 'figma.currentPage.findAll(n => n.type === "TEXT").length'

# App mode — modifies the live document in the editor
pairdraw eval -c '
  const buttons = figma.currentPage.findAll(n => n.name === "Button");
  buttons.forEach(b => { b.cornerRadius = 8 });
  buttons.length + " buttons updated"
'

# Modify and save to the same file; text edits need the text's fonts loaded first, as in Figma
pairdraw eval design.fig -w -c '
  const texts = figma.currentPage.findAll(n => n.type === "TEXT" && n.characters.length > 0);
  const fonts = texts.flatMap(t => t.getRangeAllFontNames(0, t.characters.length));
  await Promise.all(fonts.map(font => figma.loadFontAsync(font)));
  texts.forEach(t => { t.fontSize = 16 });
'

# Save to a different file
pairdraw eval design.fig -o modified.fig -c '...'

# Read code from stdin
echo 'figma.currentPage.children.map(n => n.name)' | pairdraw eval design.fig --stdin

# Style part of a text, and read how it is styled
pairdraw eval design.fig -w -c '
  const title = figma.currentPage.findOne(n => n.type === "TEXT" && n.name === "Title");
  const fonts = [...title.getRangeAllFontNames(0, title.characters.length), { family: "Inter", style: "Bold" }];
  await Promise.all(fonts.map(font => figma.loadFontAsync(font)));
  title.setRangeFontName(0, 5, { family: "Inter", style: "Bold" });
  title.setRangeFills(0, 5, [{ type: "SOLID", color: { r: 0.9, g: 0.1, b: 0.1 } }]);
  title.getStyledTextSegments(["fontName", "fills"]).map(s => [s.characters, s.fontName.style])
'
```

Text edits follow Figma's font rule: anything that lays text out again (`characters`, `fontSize`, `fontName`, spacing, case, alignment, auto-resize, and the matching `setRange…` methods) throws `Cannot write to node with unloaded font` until `figma.loadFontAsync` has loaded every font the text uses, and a new font has to be loaded before it is set. A font that is not available rejects `loadFontAsync`; replace it with `fontName = { family, style }` in a loaded font. The built-in text tools load fonts themselves.

Text styles follow Figma's per-character model: `getStyledTextSegments(fields)` reads runs, `getRange…`/`setRange…` read and set font, size, fills, letter spacing, line height, decorations, text case, hyperlinks, text and fill style IDs, and bound variables for `[start, end)`, and a text's `fontSize`, `fontName`, `fills`, and similar read `figma.mixed` while characters differ. Check for it before using the value. Paints everywhere take Figma's shape: a solid `color` is `{ r, g, b }` with the alpha in `opacity`, and an image is `{ type: "IMAGE", imageHash, scaleMode: "FILL" | "FIT" | "CROP" | "TILE" }` with optional `rotation` and `scalingFactor`.

Next to `figma`, scripts get `pairdraw`: what Pairdraw adds to the Figma API, in its style. A main component can behave as a Reka UI control, by its own property and slot names:

```bash
pairdraw eval design.fig -w -c '
  const set = figma.currentPage.findOne(n => n.type === "COMPONENT_SET" && n.name === "Switch");
  const thumb = set.findOne(n => n.name === "Thumb");
  const behaviour = pairdraw.setBehaviour(set, "switch")
    .bindValue("value", "State")      // On/Off guessed from the variant values
    .bindPart("thumb", thumb);        // the frame becomes a slot
  behaviour.states = "Interaction";
  behaviour.missing                    // [] when the control is complete
'
```

`pairdraw.behaviourKinds` lists every kind with its values and parts; `pairdraw.getBehaviour(node)` reads one (a variant reads its set's); `pairdraw.createSlot(frame)` makes a frame a slot. The `set_behaviour`, `get_behaviour`, and `create_slot` tools do the same over MCP, and design JSX writes controls with Reka's element names (`Switch.Root`, `Switch.Thumb`).

Comments people leave on the canvas are review feedback you can act on. Read the open ones, change the design, then answer and resolve each, naming yourself as the author:

```bash
pairdraw eval design.fig -w -c '
  pairdraw.getComments({ resolved: false }).map(c => ({ id: c.id, text: c.text, layer: c.node?.name }))
'
# after the change:
pairdraw eval design.fig -w -c 'pairdraw.getComment("c_…").reply("Title is 24px now", { author: "Claude" }).resolve()'
```

`pairdraw.addComment(text, { node, page, x, y, author })` leaves a new one. Over MCP the same is `get_comments`, `add_comment`, `reply_to_comment`, and `resolve_comment`. Comment text is Markdown.

Statuses say where a section, frame, component, or instance stands, from the document's own list. Read the list, find what is ready, and move a layer on once your work on it is done:

```bash
pairdraw eval design.fig -c 'pairdraw.statuses.map(s => s.name)'
pairdraw eval design.fig -w -c 'pairdraw.setStatus(figma.currentPage.findOne(n => n.name === "Checkout"), "In review")'
```

`pairdraw.getStatus(node)` reads one. Over MCP the same is `get_statuses` and `set_status`.

### Diff

Compare nodes and documents, and apply patches:

```bash
pairdraw diff create design.fig --from 1:23 --to 1:87       # JSX attribute patch
pairdraw diff jsx design.fig --from 1:23 --to 1:87          # JSX structure
pairdraw diff show 1:24 design.fig --attributes 'rounded={8}' > fix.diff
pairdraw diff apply fix.diff design.fig --dry-run           # fails on stale values
pairdraw diff apply fix.diff design.fig --write
pairdraw diff visual design.fig --from 1:23 --to 1:87 -o diff.png
pairdraw diff files before.fig after.fig                    # exit 1 when different
```

### Control the running app

```bash
pairdraw documents list --json                       # tab IDs, paths, pages
pairdraw documents open designs/landing.fig          # new tab; --json returns target.documentId
pairdraw documents new --path designs/draft.fig
pairdraw documents activate tab-123 --page-id 0:4    # bring a tab to the front
pairdraw documents save                               # the document this session is targeting, or the one in front
pairdraw documents save --document-id tab-123
pairdraw documents close --document-id tab-123 --save   # or --discard; fails on unsaved changes otherwise
# close without --document-id only closes a document this CLI session opened
pairdraw undo --document-id tab-123                  # also: redo
pairdraw settings get --json
pairdraw settings set editing.snapping.pixelGrid false
```

`tool` exposes every MCP tool, so the CLI is never limited to its dedicated commands:

```bash
pairdraw tool list
pairdraw tool describe set_fill                      # JSON Schema for the arguments
pairdraw tool call set_fill --document-id tab-123 --args '{"id":"0:5","color":"#2563eb"}'
pairdraw tool call create_page design.fig --args '{"name":"Icons"}' --write   # headless
pairdraw tool call create_shape design.fig --args '{"type":"FRAME","x":0,"y":0,"width":320,"height":200}' -w --preview-output preview.png
printf '%s\n' 'create_page {"name":"Icons"}' 'save()' | pairdraw shell design.fig   # one load, many tool lines
pairdraw models --json                               # AI providers and their models
```

Every command that reports structured data supports `--json` when appropriate. Commands share one `cli` session. Set `PAIRDRAW_SESSION` to run a second CLI agent beside it:

```bash
PAIRDRAW_SESSION=agent-a pairdraw tool call create_shape --args '{"type":"RECTANGLE","x":0,"y":0,"width":40,"height":40}'
```

## MCP Server

### Stdio MCP clients

Use Bun by default:

```json
{
  "mcpServers": {
    "pairdraw": {
      "command": "bunx",
      "args": ["pairdraw-mcp"]
    }
  }
}
```

If `@pairdraw/mcp` is installed globally, direct binaries also work:

```json
{
  "mcpServers": {
    "pairdraw": {
      "command": "pairdraw-mcp"
    }
  }
}
```

### HTTP / Streamable HTTP

```bash
export PORT=7600
export PAIRDRAW_MCP_ROOT=/path/to/files     # explicitly limit filesystem access

pairdraw-mcp-http
# or: bunx pairdraw-mcp-http
```

Authentication is enabled by default with an automatically generated token. `PAIRDRAW_MCP_AUTH_TOKEN` can supply an explicit non-empty token; an empty value disables authentication. If browser access needs CORS, set `PAIRDRAW_MCP_CORS_ORIGIN` to a trusted origin. Never combine wildcard CORS (`*`) with disabled authentication.

The CLI defaults the filesystem root to the home directory on Windows and the current working directory elsewhere. Set `PAIRDRAW_MCP_ROOT` to an explicit narrow directory rather than relying on that default.

### MCP workflow

1. **Find or open a document** — `list_documents` for open tabs and their IDs; `open_file { path }` within the effective filesystem root (`list_recent_files` lists recently opened files there), or `new_document {}`. Pass `document_id` and `page_id` explicitly instead of relying on the active tab; `activate_document { document_id }` brings a tab to the front when the user should see it.
2. **Query** — `get_page_tree`, `find_nodes`, `query_nodes`, `get_node`, `list_pages`, `get_current_page`.
3. **Inspect** — `get_jsx`, `diff_jsx`, `diff_create`, `diff_visual`, `describe`, `check_responsive`, `export_image`, `export_svg`, `export_pdf`.
4. **Modify** — `render`, `batch_update`, `update_node`, `set_fill`, `set_layout`, `create_shape`, `import_svg`, etc. For a flowchart, write it as Mermaid and call `import_mermaid { mermaid }`: it lays out FigJam shapes, sections, and connectors without overlaps and returns each node's layer id, instead of placing shapes and connectors by hand. When layers you created overlap, call `arrange { ids }`: it spreads them apart and keeps each near where it was. `arrange` also packs screens (`mode: "pack"`) and lays shapes out along the connectors joining them (`mode: "flow"` for flows, `"tree"` for hierarchies, `"radial"` for mind maps, `"network"` for relationship maps).
5. **Save/export** — `save_file`, `export_image`, `export_svg`, `export_pdf`, `export_video`, or CLI `export`.
6. **Close** — `close_file { document_id, unsaved }` closes a document tab after the workflow. With unsaved changes it fails unless `unsaved` is `"save"` or `"discard"`; automation never prompts in the app.

Each session keeps the document it edits, including after the person switches tabs. Home and a New file tab are not documents: an edit with none chosen yet opens a document tab and leaves the current tab in front. `open_file` owns a document only when that call opened it. `close_file` without `document_id` closes only a document this session opened. `save_file` without `document_id` saves the document this session is targeting, or the document in front. When that document has been closed, call `list_documents` and pass `document_id`, or call `new_document` or `open_file`. A new HTTP session starts with no document. An idle timeout of 15 minutes ends the previous session, and the next edit opens its own tab. Set `PAIRDRAW_SESSION` to run two CLI agents at once; otherwise CLI commands share one `cli` session.

Use `undo` / `redo { document_id }` to step back your own changes. They refuse when the newest step was made by the user in the editor; never work around that. `get_settings` and `update_settings { settings }` read and change editor preferences such as theme, language, and snapping; they never expose credentials, models, or tool access.

### Browser-native WebMCP (experimental)

WebMCP is off by default. In **Settings → MCP → WebMCP**, choose **Inspect** for read-only tools or **Edit** for scoped changes. These controls are independent of local MCP settings. Supporting browsers expose inspection and undoable existing-layer/property and variable edits directly from the Pairdraw workspace through `document.modelContext`, without an MCP server connection. Discover this browser surface separately: it excludes structural creation/deletion, arbitrary JS/JSX execution, external assets, filesystem operations, and credentials.

Calls capture the active document/page. Cancellation prevents an edit from starting but does not reverse an already committed edit; use editor undo instead. Atomic edits require at most 10,000 nodes and variables combined, including when these same tools run through app AI/MCP. See the [WebMCP guide](https://github.com/BadryansahBangsawan/pairdraw/blob/main/packages/docs/programmable/mcp-server.md#browser-native-webmcp-experimental-webmcp) for scope and browser requirements.

## Tool discovery

Users configure local server tools in **Settings → Tool access** → **Local MCP**, independently from **Built-in AI** tool preferences. Local MCP changes require a server restart and stdio client reconnection; built-in AI changes apply to the next message. ACP and Pi agents use the MCP surface, not the direct-model AI tool selection. Tool switches are not a sandbox: enabled scripting tools can still perform operations whose dedicated tools are disabled.

Discover available tools and their arguments from the connected server or browser; availability varies by version and mode. Each tool's schema and execution/exposure metadata are authoritative. Numeric inputs accept numbers or numeric strings consistently, but reject non-finite values. Do not rely on a fixed tool count or a copied inventory.

> Tool availability can depend on server mode. `open_file`, `save_file`, and disk-writing export paths are scoped to the effective filesystem root; set it explicitly with `PAIRDRAW_MCP_ROOT`.

## Key tools for agents

- **`query_nodes`** — XPath selectors to find specific nodes without fetching the full tree.
- **`get_jsx`** — inspect any node as JSX in the same format accepted by `render`.
- **`diff_jsx` / `diff_create`** — compare two nodes as a JSX line diff or as an appliable patch of JSX attributes; `diff_show` previews setting attributes and `diff_apply` applies a patch only if the nodes still match it.
- **`diff_visual`** — pixel diff between two rendered nodes; use it to confirm an edit changed only the intended region.
- **`describe`** — semantic analysis of role, visual style, layout, and design issues.
- **`batch_update`** — apply multiple node updates efficiently.
- **`export_image` / `export_svg` / `export_pdf`** — visual verification and deliverables; `export_image` takes `quality` (1–100) for JPG and WEBP.
- **`export_video`** — records the prototype from a start frame, following After delays and Dissolves (and scripted `clicks`) on a virtual clock, as MP4 (default), GIF, or WebM; check the returned `steps`, and pass `path` for the file. MP4 and WebM need the app's WebCodecs or, headless, `ffmpeg` on the path; otherwise ask for a GIF.
- **`export_html` / `import_html`** — layers to HTML with CSS or Tailwind (fragment or standalone, `layer_ids` to map markup back to layers), and HTML/CSS back into editable layers in the open document.
- **`diff_changes`** — outside AI chat, call it with `mark: true`, then later without it to see what you or the designer changed since.
- **`find_empty_space`** — a free spot of a given size beside existing content, before placing new frames.
- **`replace_matching_properties`** — swap a fill, text, or stroke color, stroke weight, radius, font family, style, or size everywhere on a page or selection; layers of read-only library components come back in `read_only`.
- **`get_style`** — curated style directions for a design with no look yet, or when asked for a style or mood: call it with a `query` describing the request to list matches, then with an `id` for that direction's palette by role, font pairing, type scale, radii, spacing, elevation, and written guidance. Adapt it; do not copy it verbatim.
- **`rescale`** — scale layers with their text sizes, stroke weights, radii, effects, and spacing, as the Scale tool (K) does, around an `anchor` of their joint bounds; locked layers and layers inside instances come back in `skipped`; `node_resize` changes only the box.
- **`set_text_properties` / `set_font_range` `hyperlink`** — link a whole text or a range to an http, https, or mailto address (`example.com` becomes `https://example.com`); `null` or `""` removes it. Links are not underlined automatically.
- **`generate_image` / `remove_background` / `replace_background` / `generate_svg`** — image AI on the user's own image service keys (Settings → Image services); they work only through the running app, take a while, cost the user money, and report a missing key for the user to add. Call them only when asked; `generate_svg` imports editable vector layers.
- **`vectorize_image`** — turn a layer's image fill into editable vector paths in a new frame beside the image, with the user's own vectorize service; it works only through the running app, takes up to a few minutes, and reports a missing key for the user to add in Settings → Image services.
- **`viewport_zoom_to_fit` / `viewport_set` / `viewport_get`** — move the user's view only when they ask to be shown something.
- **`get_codegen_prompt`** — retrieve Pairdraw's current JSX/codegen guidance.
- **`read_skill`** — read this skill (`SKILL.md`) or `references/design-authoring.md` from the connected server, for clients that cannot install skills; the same files are the `pairdraw://skills/pairdraw/` resources and the `design` prompt.
- **`undo` / `redo`** — revert or reapply your newest change; they refuse to touch the user's edits.
- **`list_documents` / `activate_document`** — discover open tabs and show the one you worked on.

## JSX Rendering

Read [Design authoring](references/design-authoring.md) before creating or modifying JSX designs. This bundled reference is generated from Core's authoring guidance, tested examples, and renderer metadata—the same reference used by chat and codegen prompts.

Use the `render` tool for JSX strings. Use only the APIs exposed by the installed `eval` environment; native library exports are not automatically scripting globals. The connected server's `get_codegen_prompt` provides its version's codegen and authoring guidance.

## Tips

- Omit the file path to work with the document open in the running Pairdraw editor.
- Start with `info` or `get_page_tree` to understand the document.
- Use `tree --depth 2` or `query_nodes` to avoid overwhelming output on large files.
- Export specific nodes with `--node` for faster visual checks.
- Use `export_image` after changes to verify visual quality.
- Use `check_responsive { id, widths }` to lay out a copy of a frame at phone, tablet, and desktop widths: it returns one render per width and the text overflow, layers outside the frame, and overlapping siblings found there, without touching the document.
- The running editor shows each MCP session as an agent at the layers its tools touch, and follows it while it works when the user has Follow agents on. Leave the user's selection and view alone unless they ask to be shown something.
- Use `analyze colors --similar` to find near-duplicate colors.
- Use `pairdraw tool call` for MCP tools without a dedicated CLI command, and `eval` for Figma Plugin API operations not covered by any tool.
- Use `--json` when piping CLI output to scripts.
- In app mode, `eval` and MCP modifications are reflected live in the editor.
