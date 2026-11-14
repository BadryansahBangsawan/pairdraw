---
title: Web capture
description: Copy a live web page or one of its elements, with the styles the browser computed, and paste it into the canvas as editable layers.
---

# Web capture

A web capture is a page, or one element of it, recorded with the styles the browser computed for every box: colors, borders, radii, shadows, fonts, spacing, and flex layout, plus its images. Pasting a capture into the canvas builds editable layers from it, in one undo step, in a frame named after the page.

Captures come from the Chrome extension in `extensions/chrome` or from your own code through `@pairdraw/web-capture`. Plain HTML copied from any page pastes as styled layers too, without a capture: the editor styles the fragment the clipboard holds, after removing scripts, event handlers, frames, and script links.

## The Chrome extension

The extension is not in the Chrome Web Store. Build it and load it unpacked:

```sh
bun extensions/chrome/build.ts
```

Open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and select `extensions/chrome/dist`.

- **Copy page** captures the whole page at its full scroll height, with up to 32 MB of images. A page whose copy would still be too large for the browser to hand over is copied without its images, and the paste says part of it was left out.
- **Select an element** outlines the element under the pointer, starting from the focused element so it works without a mouse. ↑ selects its parent, ↓ its first child, a click or Enter copies it, and Esc cancels.
- **Include images from other sites** asks for access to all sites, so images a page loads from another domain without CORS headers are copied too. Without it those images keep their address and paste as empty image layers.

The extension asks only for `activeTab` and `scripting`: the capture script runs in the current tab when you click the toolbar button, and nowhere else. It works on pages served over HTTPS, since the browser offers the clipboard only there.

## Capturing from your own code

`@pairdraw/web-capture/capturer` runs inside a page: a browser extension's content script, a test, or the renderer of an Electron app. It reads the DOM synchronously, then waits for images, and never changes the page.

```ts
import { captureElement, writeWebCaptureClipboard } from '@pairdraw/web-capture/capturer'

button.addEventListener('click', () => {
  const pricing = document.querySelector('#pricing')
  if (!pricing) return
  // Starts the clipboard write inside the click, then fills it in when the capture is ready.
  void writeWebCaptureClipboard(captureElement(pricing))
})
```

`capturePage(document)` captures a whole page. Both take options: `maxElements`, `inlineImages: false` to keep image addresses instead of image data, `fetchImage` to read images the page itself cannot, and an `AbortSignal`.

### Electron

The capturer belongs in the renderer, where the page's DOM is. Expose it from a preload script, and let the main process put the result on the clipboard:

```ts
// preload.ts
import { contextBridge } from 'electron'

import { encodeWebCaptureClipboard } from '@pairdraw/web-capture'
import { capturePage } from '@pairdraw/web-capture/capturer'

contextBridge.exposeInMainWorld('webCapture', {
  copyPage: async () => encodeWebCaptureClipboard(await capturePage(document))
})
```

```ts
// main.ts
import { clipboard, type BrowserWindow } from 'electron'

export async function copyPage(appWindow: BrowserWindow) {
  const { html, text } = await appWindow.webContents.executeJavaScript(
    'window.webCapture.copyPage()'
  )
  clipboard.write({ html, text })
}
```

## The format

A capture is JSON: `format: "pairdraw/web-capture"`, `version`, whether a `page` or an `element` was captured, the page's address and title, the viewport, the fonts its text uses, and a `root` element. Each element has its `tagName`, a few attributes (`id`, `class`, links, image sources, and accessible labels), its `computedStyle`, its `box` on the page, and its `children`. On the clipboard it travels as HTML, compressed inside a comment, followed by the same content as plain styled HTML for other applications.

Captures are read as untrusted input: the editor checks the shape and size, keeps only the attributes and style properties layers use, links only to `http`, `https`, and `mailto` addresses, and images only as raster data or `http(s)` addresses. A capture from a newer format version is refused with a message instead of being guessed at. `readWebCapture`, `parseWebCapture`, and `readWebCaptureClipboard` in `@pairdraw/web-capture` do the same checks for your own readers.

## Limits

- CSS grids keep each item where the page drew it, as absolute layers inside the grid's frame; tables become rows of cells.
- Pseudo-elements (`::before`, `::after`), background gradients, transforms, and filters are not captured.
- An SVG becomes an image of how it looked; a `<canvas>` keeps its pixels unless it drew another site's image.
- A capture holds at most 20,000 elements and 48 MB of images. A larger page pastes its first part and says so.
