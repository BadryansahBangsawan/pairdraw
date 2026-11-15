---
title: More Than One Window
description: Open several editor windows, see where files and links land, and what quitting asks.
---

# More Than One Window

The desktop app can show several editor windows at once. Each window is its own editor: its own tabs, documents, selection, and history, with nothing shared but the app itself.

## Opening a Window

Choose **File → New Window**. Only the desktop app offers it; a browser tab is always a single window.

The new window is empty and looks like any other: the same title and size, and the same page of the app. Only its label differs — the first window is `main`, the next `editor-2`, `editor-3`, and so on, reusing the first free number after a window closes. That label is how the shell and the agent tools tell the windows apart; it is not shown in the title bar.

## Which Window a File Opens In

- A file that another window already shows is opened there: that window comes forward with the document's tab, and no second copy opens.
- A file that no window shows opens in the focused window. Before any window has focus, as at launch, it goes to `main`.
- A file that arrives from outside the app — a file association, launching the app with a path, a recent file, or a file link — follows the same rule: the window that already shows it, else the focused window.
- A relative file link goes to the window whose open file path ends with the link's path. When more than one window matches, the focused window decides if it is one of them; otherwise the usual rule applies rather than an arbitrary window.
- Cloud links and sign-in callbacks that return through a `pairdraw://` link go to the focused window only, so following one link never happens once per window.

Choosing **Open…** inside a window checks the other windows first, as any open does: if one already shows the file, it is focused instead.

## What the Menus Act On

The native menu bar follows the focused window: it shows that window's document features and check marks. A menu command — Save, Close Tab, undo, a tool, a view toggle — runs in the focused window only, because the document, tab, and selection it acts on are that window's.

**Quit** is the exception: it is the app's, not a window's.

## Quitting with Unsaved Documents

Quitting asks every editor window to confirm its own documents, and the app exits when the last one agrees.

- Each window prepares its own documents and asks about its own unsaved ones, as closing a window does.
- One window declining cancels the quit for every window; answers that arrive after the cancellation are ignored.
- A quit confirmation is not the window's own close approval: if another window cancels the quit, this window asks again the next time it is closed.

Closing one window asks only about that window's documents.

## Agents and MCP

Each window connects to the MCP server on its own, registering its label, and reports every focus change.

- A tool call goes to the window that most recently had focus. Before any window reports focus, the only connected window answers; with several, the most recently started one does, so a call never waits for a focus it may not get.
- A reply names a document as `<window>:<tab>`, such as `editor-2:tab-3`, so two windows' tab ids never collide. A bare tab id means the window that answers the call.
- A call that names another window's document fails with **Document "…" is not open in this window**. Focus that window first, then call without a document id or with an id from that window.
- Listing documents lists the ones in the focused window.

## What It Does Not Do

- It does not move a document between windows: opening it elsewhere focuses the window that already shows it instead.
- Windows share no undo, selection, or tabs; a document is edited in the window that has it.
- New Window is desktop only, and every window carries the same title, so the title bar does not say which window is which.
- On macOS, closing every window leaves the app running, and the dock icon opens a window again.
