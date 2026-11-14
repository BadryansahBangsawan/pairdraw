# @pairdraw/web-capture

Live web pages captured with the styles the browser computed for them, in a format Pairdraw imports as editable layers.

- **Format** (`@pairdraw/web-capture`): the Valibot-validated capture model, `readWebCapture`/`parseWebCapture` that normalize untrusted captures, the clipboard payload (`encodeWebCaptureClipboard`, `readWebCaptureClipboard`), `webCaptureDesignDocument` for the styled DOM `@pairdraw/dom-css` builds layers from, and `sanitizeWebHTML` for plain HTML copied from a page.
- **Capturer** (`@pairdraw/web-capture/capturer`): `captureElement` and `capturePage` run inside a page, as a browser extension's content script or an app's own code (for example an Electron renderer), and return a capture with images inlined as data URLs. `writeWebCaptureClipboard` copies one so it pastes into a Pairdraw canvas.

```ts
import { captureElement, writeWebCaptureClipboard } from '@pairdraw/web-capture/capturer'

button.addEventListener('click', () => {
  const pricing = document.querySelector('#pricing')
  if (!pricing) return
  // The write starts inside the click and is filled in when the capture is ready.
  void writeWebCaptureClipboard(captureElement(pricing))
})
```

Where the page cannot write the clipboard itself, as in an Electron app whose main process does, send `encodeWebCaptureClipboard(capture)` across and write its `html` and `text`. The docs page `programmable/web-capture` shows the Electron setup and describes the format.

A capture needs no CSS runtime to import: Pairdraw pastes it through `sceneGraphFromStyledHTML` in `@pairdraw/core`. The package does not depend on `@pairdraw/scene-graph`.
