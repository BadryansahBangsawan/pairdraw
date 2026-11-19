# Pairdraw for VS Code

A VS Code extension that opens Pairdraw `.fig` and `.pen` documents in a custom editor. The
editor is the Pairdraw web editor, loaded in a webview and driven through the embed protocol; the
extension itself never parses a document, so a new Pairdraw format needs no extension release.

## Build and install from a folder

```sh
bun extensions/vscode/build.ts          # writes extensions/vscode/dist
```

Two ways to load the built folder:

- Development: `code --extensionDevelopmentPath="$PWD/extensions/vscode"` opens a window with the
  extension loaded from source.
- Permanent, without publishing: copy `extensions/vscode` (with its `dist/` and `package.json`)
  into `~/.vscode/extensions/pairdraw-<version>`, where `<version>` is the `version` field of the
  extension's `package.json`, and restart VS Code. VS Code lists it as
  **Pairdraw** in the Extensions view. It is not published to any marketplace.

The extension needs a running Pairdraw web editor. `bun run dev` serves one at
`http://localhost:1420`, which is the `pairdraw.editorUrl` default. Point that setting at any
`https` URL, or at `http` on loopback, and the webview frames it.

## What it does

- **Design Mode** is a custom editor for `*.fig` (default) and `*.pen` (opened on request). It
  loads the file's bytes into the web editor, saves what the editor shows back to disk, and offers
  VS Code an edited event per save so undo and the dirty dot follow the document.
- **Toggle Design Mode** switches the active `.pen` or `.fig` between the webview and VS Code's own
  text editor; the same command goes either direction.
- **Open Pairdraw Editor** opens the configured editor URL in the system browser.
- **Export as PNG** writes the layers selected in Design Mode, or the whole page when nothing is selected, to a PNG you pick.
- The **Pairdraw** activity-bar view holds those three commands as buttons.

## Manual check

1. `bun run dev`, then `bun extensions/vscode/build.ts`.
2. Open this folder in VS Code and run **Developer: Reload Window** with the extension loaded.
3. Open any `.fig` file: Design Mode appears with the document's frames. Edit, press Cmd/Ctrl+S,
   and the file on disk changes while the tab's dirty dot clears.
4. Run **Pairdraw: Toggle Design Mode**: the tab becomes the text editor with the archive bytes;
   run it again and Design Mode returns.
5. Select a layer in Design Mode and run **Pairdraw: Export as PNG**; the exported image
   holds only that layer's pixels.
6. Point `pairdraw.editorUrl` at a non-`http(s)` value: **Pairdraw: Open Pairdraw Editor** reports
   the bad URL instead of opening it.