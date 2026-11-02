---
title: Exporting
description: Export images, SVG, and .fig subsets, and open .fig or .pen documents in OpenPencil.
---

# Exporting

Export individual nodes as images or `.fig` subsets, and open full `.fig` or `.pen` documents.

## Image Export

Select a node and use the Export section in the properties panel.

### Export Settings

- **Scale** — 0.5×, 0.75×, 1×, 1.5×, 2×, 3×, or 4× (hidden for SVG — vectors are resolution-independent)
- **Format** — PNG (transparent background), JPG (white background), WEBP (transparent background), SVG (vector), PDF, HTML, PPTX (PowerPoint), or draw.io

You can add multiple export settings to export the same node at different scales or formats in one go. A live preview with a checkerboard background shows what will be exported.

### Export Methods

| Method | Mac | Windows / Linux |
|--------|-----|-----------------|
| Keyboard shortcut | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>E</kbd> |
| Context menu | Right-click <kbd>→</kbd> Export… | Right-click <kbd>→</kbd> Export… |
| Properties panel | Click "Export" button | Click "Export" button |

The exported file is saved via a native dialog (desktop) or browser download.

## HTML, PDF, and quality

- **JPG and WEBP** rows have a quality field from 1 to 100 (90 when left alone), saved with the layer.
- **PDF** with several layers selected makes one PDF with a page per layer, in the order you selected them, each the size of its layer.
- **File › Export Frames to PDF…** saves the page's frames as one PDF, a page per frame in layer order, each the size of its frame. Frames inside sections count; loose shapes, text, and groups do not. With layers selected, only those are exported.
- **HTML** writes the layer as a web page. The options button next to the format chooses whether to include the HTML scaffold (a whole page, or a fragment to paste into one), CSS or Tailwind styling, embedded images or separate files (saved together in a `.zip`), and whether layer names (`data-name`, on by default) and layer IDs (`data-open-pencil-node-id`, off by default) are written as attributes. The Code panel's HTML view exports the same way, with the styling it shows.
- In the Code panel, Vue and React components can take icons from Lucide, Heroicons, or Font Awesome instead of Iconify, and React components also from React Icons; an icon the package lacks stays with Iconify.

## Copy/Paste as

In addition to file export, you can copy the selection to the clipboard in multiple formats via the context menu (right-click → Copy/Paste as):

| Action | Shortcut (Mac) | Shortcut (Win/Linux) |
|--------|----------------|----------------------|
| Copy as text | — | — |
| Copy as SVG | — | — |
| Copy as PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Copy as JSX | — | — |

- **Copy as text** — copies visible text content from the selection
- **Copy as SVG** — copies the selection as SVG markup (paste into code editors, Inkscape, etc.)
- **Copy as PNG** — renders at 2× and copies to the clipboard (ready to paste into Slack, Notion, etc.)
- **Copy as JSX** — copies the OpenPencil JSX representation (compatible with `renderJsx()`)

## .fig File Operations

OpenPencil uses the .fig format for full documents — the same binary format as Figma.

### Opening Files

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Open file | <kbd>⌘</kbd><kbd>O</kbd> | <kbd>Ctrl</kbd> + <kbd>O</kbd> |

A file picker dialog opens, filtered for `.fig` and `.pen` files. On the desktop app, this uses the native OS dialog.

You can also drag a `.fig`, `.pen`, or other supported document onto the window; it opens in a new tab. Images and SVG files dropped on the canvas are placed in the document instead, and any other file reports that it can't be opened.

### Saving Files

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Save | <kbd>⌘</kbd><kbd>S</kbd> | <kbd>Ctrl</kbd> + <kbd>S</kbd> |
| Save As | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>S</kbd> |

- **Save** overwrites the currently open file without a dialog
- **Save As** opens a save dialog to choose a new location

Saved files are compressed and include a thumbnail image for preview in file browsers.

With nothing selected, the **Document** section of the Design panel sets how tightly the document is compressed. **Fast** matches Figma's own saves. **Smaller** and **Smallest** make the file smaller and take longer to save, which is most noticeable on large documents and least on files made mostly of images. The choice is stored in the file, and Figma opens all three.

### Round-trip Compatibility

Files exported from OpenPencil can be opened in Figma, and vice versa. The .fig format preserves all node types, properties, fills, strokes, effects, vector data, and layout settings.

## Keyboard Shortcuts

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Export selection | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>E</kbd> |
| Copy as PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Open file | <kbd>⌘</kbd><kbd>O</kbd> | <kbd>Ctrl</kbd> + <kbd>O</kbd> |
| Save | <kbd>⌘</kbd><kbd>S</kbd> | <kbd>Ctrl</kbd> + <kbd>S</kbd> |
| Save As | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>S</kbd> |

## Tips

- Use 2× or 3× scale when exporting for high-DPI screens.
- JPG always uses a white background — use PNG or WEBP if you need transparency.
- Use SVG export when you need a vector format for further editing in Illustrator, Inkscape, or code.
- The thumbnail in exported .fig files enables preview in file browsers and Figma's file picker.
