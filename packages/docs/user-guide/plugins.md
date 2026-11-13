---
title: Plugins
description: Install plugin manifests for this app, see what they may ask for, and what the app does with them today.
---

# Plugins

**Plugins do not run yet.** Installing one only saves its manifest: the app does not load, evaluate, or show anything from it, and no toolbar button appears. The Plugins settings page says the same.

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
- **`command`** — 1 to 80 characters; the single toolbar command label the host will show once plugins can run.
- **`source`** — the plugin's program as text, at least 1 character and at most 64 KB. It is stored as text and never evaluated, compiled, or imported.
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

`network:access` is not one of them. A manifest that asks for it is refused with **Plugins cannot ask for network access.**, and an unknown capability is refused with a message naming it. In this version a capability is only a label: the app grants none, and nothing acts on one.

## Turning a Plugin Off, and Removing It

- The switch beside a plugin turns it off and on. Turning it off also drops any capabilities it had been granted, and turning it back on does not bring them back.
- **Remove** asks to confirm, then deletes the plugin from the list and from this app's storage.

## Where the List Is Kept

The list belongs to the app, not to a document: it is saved in this machine's local storage for the app, so a `.fig` or `.pen` file never carries a plugin, and the desktop app and a browser tab each keep their own list. On load, an entry this version cannot read is dropped on its own, and a list longer than 32 is cut to the limit.

## What It Does Not Do

- It does not run a plugin. There is no plugin host, no toolbar command, and no script execution; `source` is never read.
- It grants no capability. The function that a future host would ask, to check whether a plugin call is allowed, refuses a disabled plugin and an ungranted capability, and always refuses `network:access`; this version has no control that grants one.
- It has no marketplace, no update check, no signature, and no per-document plugins.
