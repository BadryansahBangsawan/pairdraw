# Pairdraw Web Capture for Chrome

A Manifest V3 extension that copies a web page, or one element of it, with the styles the browser computed, so it pastes into a Pairdraw canvas as editable layers. It bundles the capturer from `@open-pencil/web-capture`.

## Build and load

```sh
bun extensions/chrome/build.ts          # writes extensions/chrome/dist
```

Open `chrome://extensions`, turn on Developer mode, choose **Load unpacked**, and select `extensions/chrome/dist`. The extension is not published to the Chrome Web Store.

## Permissions

- `activeTab` and `scripting`: the capture script is injected into the current tab only when you click the toolbar button.
- Optional all-sites access: granted only when you turn on **Include images from other sites**, so the service worker can read images a page loads from other domains without CORS headers. Without it those images keep their address and import as empty image layers.

## Manual check

1. Load the extension and open a regular `https://` page.
2. Click the toolbar button, then **Copy page**. The popup says the capture was copied.
3. In Pairdraw (`bun run dev`, then a document), press Cmd/Ctrl+V. A frame named after the page title appears with the page's boxes, text, colors, radii, shadows, and same-site images; Cmd/Ctrl+Z removes it in one step.
4. Click the toolbar button, then **Select an element**. Hover to outline elements, press ↑ to select a parent, click to copy. A notice at the bottom of the page confirms the copy. Paste into Pairdraw.
5. Repeat without the mouse: the page's body is outlined at once, ↓ and ↑ move the outline, and Enter copies it. A screen reader reads the hint when picking starts.
6. Turn on **Include images from other sites**, accept the prompt, and repeat on a page with images from a CDN; they now paste as image fills.
7. On `chrome://extensions` or the Web Store the popup reports that the page cannot be captured.
