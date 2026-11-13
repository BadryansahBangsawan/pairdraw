---
title: Plugins
description: Install plugin manifests, run a plugin from the command palette, and see what it may do.
---

# Plugins

A plugin is a manifest with a small JavaScript program. Install one and its command appears in the command palette; choosing it runs the program on the open document, in a sandbox, after asking what it may do.

## Installing

Open **Settings → App → Plugins**. Install a manifest in one of two ways:

- Paste the manifest's JSON into **Plugin manifest** and choose **Install**.
- Choose **Choose file** and pick a `.json` file. Its size is checked before it is read.

A successful install adds the plugin to this app's list, turned on. A refused one leaves the list as it was and shows why under the buttons.

## The Manifest

A manifest is a JSON object with exactly these fields; an extra field makes it invalid.

```json
{
  "id": "guide.marks",
  "name": "Marks",
  "version": "1.0.0",
  "command": "Mark",
  "source": "/* the plugin's program */",
  "capabilities": ["document:read"]
}
```

- **`id`** — up to 64 characters: lowercase letters and digits, with single `.` or `-` separators, such as `guide.marks`. One id installs once.
- **`name`** — 1 to 80 characters; the name the list shows.
- **`version`** — 1 to 32 characters.
- **`command`** — 1 to 80 characters; the command the palette shows for the plugin.
- **`source`** — the plugin's program as text, at least 1 character and at most 64 KB. The app stores it with the plugin and runs it only when the plugin runs.
- **`capabilities`** — an array of the capabilities below. Repeats are removed.

Limits: the manifest text is at most 64 KB, and the app keeps at most 32 plugins.

## Capabilities

A manifest may ask for these, and the panel names each one in the plugin's row:

| Capability | What the panel says it allows |
| --- | --- |
| `document:read` | Read the open document. |
| `document:write` | Change the open document. |
| `filesystem:read` | Read files on this computer. |
| `filesystem:write` | Write files on this computer. |
| `code:execute` | Run code. |
| `settings:read` | Read settings. |
| `settings:write` | Change settings. |

`document:read` and `document:write` are the capabilities this version can perform. The rest are listed in Settings and in the first-run prompt as **Not yet**: they cannot be granted, and a plugin's call that needs one is refused. `network:access` is not a plugin capability at all; a manifest that asks for it is refused with **Plugins cannot ask for network access.**

Before a plugin's first run, the prompt names the permissions it can be given and what the plugin asked for; refusing it runs nothing. The switches in **Settings → App → Plugins** change the same permissions later.

## Running a Plugin

Press <kbd>⌘</kbd><kbd>K</kbd> (<kbd>Ctrl</kbd><kbd>K</kbd> on Windows and Linux) and choose the plugin's command. It runs on the open document.

- **One run at a time.** While a plugin runs, choosing another plugin's command answers **A plugin is already running.**
- **A run has 2 seconds.** A program that does not finish in time is stopped and the run ends; a later run still works.
- **The plugin calls the app's own tools.** `plugin.call(name, args)` runs a tool against the document, and each call is checked against the plugin's permissions. A call it was not granted fails inside the plugin without changing anything.
- **The document changes are one undo step.** A successful run's edits undo together; a failed run puts them back.
- **`plugin.pointer()` takes a canvas drag.** The canvas shows a crosshair, the plugin receives the points in document order, and the wait does not count against the run's time. Escape cancels the sequence: the plugin receives `null`, asking again is refused, and the run ends. Switching to another document or closing the tab cancels it the same way, so the other document's canvas is free and its drags reach the editor.
- **Permissions are read live.** Turning the plugin off, or removing it, during a run stops its next call.

## Turning a Plugin Off, and Removing It

- The switch beside a plugin turns it off and on. Turning it off also drops any capabilities it had been granted, and turning it back on does not bring them back; the next run asks again.
- **Remove** asks to confirm, then deletes the plugin from the list and from this app's storage.

## Where the List Is Kept

The list belongs to the app, not to a document: it is saved in this machine's local storage for the app, so a `.fig` or `.pen` file never carries a plugin, and the desktop app and a browser tab each keep their own list. On load, an entry this version cannot read is dropped on its own, and a list longer than 32 is cut to the limit.

## Limits

- A program runs in an opaque-origin sandbox with no DOM. `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, and `importScripts` are blocked or absent, and the app's storage is out of reach, so a plugin reaches neither the network nor your files.
- A run's result crosses as JSON text of at most 64 KB; a larger one fails the run. A tool that runs asynchronously cannot be called.
- Only `document:read` and `document:write` can be granted. There is no marketplace, no update check, no signature, and no per-document plugins.
