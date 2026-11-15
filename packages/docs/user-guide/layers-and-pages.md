---
title: Layers & Pages
description: Managing layers, pages, and the properties panel in Pairdraw.
---

# Layers & Pages

The editor opens on the canvas alone. The tools stand at the canvas's left, with the layers panel's toggle above them, and the zoom sits in the bottom right corner. The layers panel opens on the left, the properties panel on the right, and the AI chat in a column beside it; all of them are resizable by dragging their edges. See [Side Panels](./canvas-navigation#side-panels) for when each panel shows.

While the AI chat is closed, a prompt at the bottom of the canvas sends what you write to the chat; turn it off with **Prompt on the canvas** in **Settings → Models → Chat**. <kbd>Escape</kbd> in the prompt returns to the canvas.

## Layers Panel

The layers panel on the left displays the document hierarchy as a tree.

### Tree View

Nodes are shown in a collapsible tree. Click the chevron next to a frame, group, or component to expand or collapse its children.

### Drag Reorder

Drag layers to reorder them. Nodes higher in the list render on top.

### Visibility Toggle

Click the eye icon next to any layer to hide or show it on the canvas. Hidden nodes remain in the tree.

### Rename

Double-click a layer name to rename it inline. Press <kbd>Enter</kbd> or click away to commit, <kbd>Escape</kbd> to cancel.

### Selection Sync

Clicking a layer in the panel selects the corresponding node on the canvas, and vice versa.

### Find Layers

Press <kbd>⌘</kbd><kbd>F</kbd> (<kbd>Ctrl</kbd> + <kbd>F</kbd>), choose **Edit → Find Layers…**, or run it from the command palette to search the shown page's layers by name. Picking a result selects that layer and brings it into view.

## Pages Panel

The pages panel shows all pages in the document.

- **Switch page** — click a page tab to make it active. The canvas switches to that page and restores its viewport position.
- **Add page** — click the add button to create a new page
- **Delete page** — remove the current page
- **Rename page** — double-click the page name for inline editing. Pressing <kbd>Enter</kbd> or <kbd>Escape</kbd>, or clicking away, commits the rename.

Each page has its own canvas and viewport state.

## Slides Panel

The slides panel lists the page's top-level frames as numbered slide thumbnails, in layer order. Click a slide to show its frame on the canvas, and drag a slide — or press <kbd>Alt</kbd> with an up or down arrow — to reorder it. **Export slides** writes every slide, in order, to one PDF file.

## Present Mode

Present shows the page's slides full screen, one at a time. Start it with <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd>, **View → Present**, or the Present button in the top bar. The arrow keys, <kbd>Space</kbd>, <kbd>Enter</kbd>, <kbd>Page Up</kbd>/<kbd>Page Down</kbd>, and the scroll wheel step through the slides; <kbd>Escape</kbd> leaves and returns the canvas and keyboard focus to where they were. A slide taller than the screen is shown at 100% and can be scrolled.

## Documents and Recovery

Home starts with a prompt: choose what to create above it (a landing page, mobile app, web app, slides, dashboard, or something else), describe it, and Pairdraw opens a new design and sends the prompt to its AI chat with a guide for that kind; example prompts under it fill the prompt with an idea to edit. Below the prompt you can start from a Figma file, from a page in the built-in browser (desktop app), or from a screenshot the agent rebuilds. Tabs switch between **Recent**, **Drafts**, and **Design systems**, and the menu beside them lists the places your Cloud server and storage bucket add. A search field filters the list, **Open…** opens a file, and **Design** starts an empty design.

Recent lists recent local documents. Use grid or list view, and sort recent files by **Name**, **Last used**, or **Created**. <kbd>⌘</kbd>/<kbd>Ctrl</kbd>-click adds a file to the selection, <kbd>Shift</kbd>-click selects a range, and <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>A</kbd> selects every listed file; the selection bar then opens them in separate editor tabs, removes them from Recents, or deletes stored documents. A file's <kbd>⋯</kbd> menu or right-click menu offers **Remove from Recents**, which forgets the file without deleting it, and **Save As…**, which saves a copy elsewhere. **Design systems** lists the built-in Pairdraw Basics and the component libraries you have published, as Goodies does; picking one opens a new design with that library turned on in the Assets panel.

A new design is kept as a draft on this device while you work on it: each change is written shortly after you make it, so closing its tab asks nothing. **Drafts** on Home lists them with a preview; open one to continue it, or pick **Delete draft** from its <kbd>⋯</kbd> or right-click menu to remove it for good. Saving a draft to a file or to storage, in the editor or with **Save As…** on Home, takes it out of Drafts. Drafts live in this browser profile or desktop installation only, and need **Automatically preserve unsaved work** turned on and a browser that keeps site data.

In **Settings → General → Recovery**, **Automatically preserve unsaved work** controls drafts and local recovery copies. With recovery enabled, unsaved documents without a file path remain recoverable even after their tabs close. When Pairdraw offers **Recover unsaved work**, choose **Restore** to reopen a document or **Discard** to remove its recovery copy.

A file you opened also keeps a backup of changes it has not been saved with yet, written while autosave is off, or when the window closes before autosave has written them. The next time that file opens, **Recovered changes** offers **Save** to write them into the file, **Save As…** to open them apart and save them as a new file, or **Don’t Save** to keep the file as it is and drop the backup. Closing the dialog keeps the backup for the next time. Saving the file drops its older backups, and in the browser a backup older than the file's last change is not offered. A backup whose file has not opened for a week, for example because the file moved, is also listed in **Recover unsaved work**.

Disabling recovery stops automatic preservation and removes recovery copies owned by currently open documents. It does not bulk-delete snapshots from previously closed documents. Recovery is local to this installation/browser profile; it is not a replacement for saving a file, cloud synchronization, or a backup.

## Goodies

The gift button in the top bar, **Object → Goodies…**, or the command palette opens Goodies, a collection of things to start from: styles to pin to the AI chat, the design systems you can enable, scripts that land on the canvas as [script layers](./script-layers), and the gallery shaders, which fill the selected layers or a new rectangle.

## Properties Panel

The properties panel on the right switches between Design and Code, with [Lint](./checking-designs) as an icon tab beside them. The AI chat opens in its own column beside it.

### Design Tab

Shows the properties of the selected node(s), organized in sections:

- **Appearance** — opacity, corner radius (with independent corner toggle), visibility
- **Fill** — solid color, gradients (linear, radial, angular, diamond), image fills, variable bindings
- **Stroke** — color, width, cap, join, dash pattern
- **Effects** — drop shadow, inner shadow, layer blur, background blur, foreground blur
- **Typography** — font family, size, weight, B/I/U/S formatting buttons (visible for text nodes)
- **Layout** — [auto layout](./auto-layout) controls (visible for auto-layout frames)
- **Export** — scale, format, and export button (see [Exporting](./exporting))

When no nodes are selected, the Design tab shows page-level properties including the canvas background color.

### Code Tab

Displays the selected node as code with syntax highlighting, line numbers, and a copy button. A format toggle lets you switch between two output modes:

- **Pairdraw JSX** — custom component tree compatible with `renderJSX()` for programmatic round-trip
- **Tailwind CSS v4** — HTML with utility classes (`<div className="flex gap-4 p-3">`) ready to paste into React/Vue projects

## AI Chat Column

The [AI chat](../programmable/ai-chat) creates and changes design elements from natural-language requests. It opens in a column of its own to the right of the properties panel, so the Design tab stays in view while an agent works. Open and close it with the sparkles button among the document's actions in the top bar or with <kbd>⌘</kbd><kbd>J</kbd>; drag its edge to resize it. The column stays open or closed, at the width you left it, across reloads. Configure reusable models and provider connections in Settings, and browse locally saved conversations from the chat's history menu.

## Keyboard Shortcuts

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Open or close the AI chat column | <kbd>⌘</kbd><kbd>J</kbd> | <kbd>Ctrl</kbd> + <kbd>J</kbd> |
| Find layers | <kbd>⌘</kbd><kbd>F</kbd> | <kbd>Ctrl</kbd> + <kbd>F</kbd> |

## Mobile Layout

On mobile and small screens, the side panels are replaced by a swipeable bottom drawer. Tabs at the top of the drawer switch between Layers, Properties, Design, Code, and AI views. The toolbar collapses to a compact horizontal strip with category switching.

## Tips

- Panel widths, the AI chat column’s included, are saved automatically and persist across reloads.
- Use the layers panel to find overlapping nodes that are hard to click on the canvas.
- The [context menu](./context-menu) provides additional actions for selected nodes.
- See [Selection & Manipulation](./selection-and-manipulation) for z-order shortcuts (]/[) and visibility/lock toggles.
