# Web capture

The capture format and capturer in `packages/web-capture`, and the Chrome extension in `extensions/chrome` that ships the capturer.

- The capture model is the styled DOM `@pairdraw/dom-css` imports (`type`, `tagName`, `attrs`, `computedStyle`, `children`), so a capture imports through Core's `sceneGraphFromStyledHTML` with no CSS runtime; keep the shapes assignable and depend on neither dom-css nor scene-graph (`tests/integration/web-capture/import.test.ts`).
- Captures and clipboard HTML come from any page: read them only through `readWebCapture`, `parseWebCapture`, or `readWebCaptureClipboard`, which size-limit, validate, and normalize them to the kept attributes, captured properties, http/https/mailto links, and raster or http(s) images (`packages/web-capture/tests/parse.test.ts`).
- Plain HTML from the web is styled in the app's own document only after `sanitizeWebHTML`, which returns HTML that parses again with nothing left to clean, since serialized HTML can re-parse into new elements (mutation XSS); never clean a tree and hand on its serialization unchecked (`packages/web-capture/tests/sanitize.test.ts`).
- A format change that older readers would misread bumps `WEB_CAPTURE_VERSION`; readers report a newer version as `unsupported-version` instead of guessing.
- The capturer runs inside arbitrary pages: it reads the DOM synchronously, then awaits images, never changes the page, and takes network access beyond the page's own as an injected `fetchImage` (`packages/web-capture/tests/capturer/capture.test.ts`).
- Hosts copy a capture with `writeWebCaptureClipboard`, passing the capture's promise from the click itself so the write keeps the click's activation; do not write a parallel clipboard helper (`packages/web-capture/tests/capturer/clipboard.test.ts`).
- Auto layout has no grid tracks, so a grid whose items all have recorded boxes imports as absolute items at those boxes; the wrapping-row fallback is only for captures without boxes (`packages/web-capture/tests/design-document.test.ts`).
- The extension asks only for `activeTab` and `scripting`, with all-sites access as an optional permission the person grants for cross-site images; it declares no content scripts and no host permissions (`extensions/chrome/tests/manifest.test.ts`).
- Extension text lives in `extensions/chrome/_locales/<locale>/messages.json` for every app locale, keyed by `MESSAGE_KEYS` in `extensions/chrome/src/i18n.ts` (`extensions/chrome/tests/manifest.test.ts`).
