---
title: VS Code extension
description: Open and save Pairdraw .fig and .pen documents in VS Code, with the web editor in a webview.
---

# VS Code extension

The repository ships a VS Code extension that opens Pairdraw `.fig` and `.pen` documents in a custom editor. The editor is the Pairdraw web editor, loaded in a webview iframe and driven through the embed protocol; the extension itself never parses a document, so a new Pairdraw format needs no extension release.

## Not Published

The extension is not published to any marketplace. Build it from the repository:

```sh
bun extensions/vscode/build.ts          # writes extensions/vscode/dist
```

The extension's README gives two ways to load the built folder:

- Development: `code --extensionDevelopmentPath="$PWD/extensions/vscode"` opens a window with the extension loaded from source.
- Permanent, without publishing: copy `extensions/vscode` (with its `dist/` and `package.json`) into `~/.vscode/extensions/pairdraw-0.16.0` and restart VS Code. It then appears as **Pairdraw** in the Extensions view.

It needs VS Code 1.90 or newer.

## A Running Editor

The extension is a bridge to a running Pairdraw web editor. The `pairdraw.editorUrl` setting names it, `http://localhost:1420` by default, which is where `bun run dev` serves it. The setting takes an `https` URL, or `http` on `localhost`, `127.0.0.1`, or `[::1]`; any other value shows an error instead of loading a page.

## What It Opens

- **`.fig`** opens in **Design Mode** by default: the custom editor appears in place of the file's text.
- **`.pen`** opens in VS Code's own text editor, which is its default. To see it in Design Mode, choose **Reopen With → Pairdraw Design**, run **Pairdraw: Toggle Design Mode** from the tab's title bar, or run the same command from the command palette.

Design Mode frames the web editor and hands it the file's bytes. The document is edited in that web editor, not in a native VS Code view. A document opens in one editor at a time, and hiding the tab keeps the webview alive, so unsaved edits survive it.

## Saving

- **Cmd/Ctrl+S** asks the editor for the bytes it currently shows and writes them to the file. The extension renders and assembles nothing itself.
- **The destination decides the format.** Saving a `.fig` document under a `.pen` name writes the `.pen` text rather than the `.fig` archive.
- The first edit marks the tab dirty; the dot clears once the save finishes. VS Code's undo and redo bring the editor panel forward, because the web editor keeps its own undo history.
- **Revert** loads the file from disk into the editor again.
- **Hot exit** saves the editor's current bytes to VS Code's backup location.
- A save fails with the editor's message rather than writing bad bytes: data that is not base64 is refused, and a save with no open editor panel has nothing to write.

## Commands

- **Pairdraw: Toggle Design Mode** switches the active `.fig` or `.pen` between Design Mode and VS Code's own editor; the tab you run it from decides the direction.
- **Pairdraw: Open Pairdraw Editor** opens the configured editor URL in your system browser.
- **Pairdraw: Export as PNG** exports the layers selected in Design Mode, or the whole page when nothing is selected, to a PNG you pick; the suggested name replaces the document's extension. It needs a Design Mode tab whose editor has loaded.
- The **Pairdraw** activity-bar view, **Actions**, holds those three commands as buttons.

## Limits

- The extension has no document features of its own. Everything you can edit is what the web editor offers.
- Without a running editor at `pairdraw.editorUrl`, the panel says the editor did not answer: the handshake gives up after 30 seconds, and a request to the editor after 60.
- The editor URL must be `https`, or `http` on a loopback host; another scheme, or `http` on a remote host, is refused.
- Design Mode is the default only for `.fig`. A `.pen` file needs the toggle or Reopen With.
- The export command writes PNG only. The embed protocol behind it can also ask for JPG and WEBP, but the command does not offer them.
- `.fig` documents are archives and `.pen` documents are text, so VS Code's text editor shows an archive as bytes; use Design Mode for either.
