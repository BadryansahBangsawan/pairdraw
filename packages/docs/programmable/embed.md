---
title: Embedding the editor
description: Show and drive the Pairdraw editor inside your own page through an iframe and a MessagePort.
---

# Embedding the editor

Any web page can show the editor in an iframe and drive it from JavaScript. The page hands the editor a document, reads back its selection, exports images, and saves the document wherever it likes. The page owns the document: the embed keeps no drafts of it, shows no Home or tabs, and always shows one document. Its keys and drops open or close none, and it has no command palette.

`load` requests run one at a time in the order they arrive, so a page that sends two keeps the second.

## The iframe

Point the iframe at a Pairdraw web app you serve, such as your own build or a Pairdraw Cloud server's editor; `pairdraw.example.com` stands for it below.

```html
<iframe
  id="editor"
  title="Design"
  src="https://pairdraw.example.com/?embed&origin=https%3A%2F%2Fyour-site.example"
></iframe>
```

| Parameter    | Meaning                                                                                                                                                                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `embed`      | Turns on embed mode.                                                                                                                                                                                                                                     |
| `origin`     | The one origin allowed to connect, written exactly as `location.origin` spells it: scheme, host, and a port only when it is not the default. No path, trailing slash, or wildcard. `https:` is required except on `localhost`, `127.0.0.1`, and `[::1]`. |
| `allow-edit` | Lets the host turn editing on. Without it the document is always read-only.                                                                                                                                                                              |
| `chrome`     | Keeps the editor's toolbar and panels; by default the embed shows a bare canvas. An embed never has the app's top bar or tabs.                                                                                                                           |

A link without a valid `origin` shows an explanation and never connects.

## Connecting

The editor announces itself to its parent, addressed only to `origin`, so a page at any other origin never sees the message. The host answers with a `MessagePort`; the editor accepts the first `connect` that comes from its parent frame at exactly that origin, and ignores everything after it. All further traffic uses the port.

```ts
const frame = document.getElementById('editor') as HTMLIFrameElement
const editorOrigin = 'https://pairdraw.example.com'

window.addEventListener('message', (event) => {
  if (event.origin !== editorOrigin || event.source !== frame.contentWindow) return
  if (event.data?.protocol !== 'pairdraw-embed' || event.data.type !== 'ready') return
  const channel = new MessageChannel()
  channel.port1.onmessage = (message) => handle(message.data)
  frame.contentWindow?.postMessage(
    { protocol: 'pairdraw-embed', type: 'connect', version: 1, editable: false },
    editorOrigin,
    [channel.port2]
  )
})
```

Attach the listener before the iframe loads. Set `editable: true` to start in edit mode; it takes effect only when the URL has `allow-edit`.

## Requests

Send `{ id, method, params }` on the port. Each request gets exactly one reply, `{ id, ok: true, result }` or `{ id, ok: false, error: { code, message } }`.

| Method         | Params                                                                                                                                                                  | Result                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `load`         | `{ name, data }`: a file name with its extension (`.fig`, `.pen`, and the other formats the editor opens) and its bytes as a `Uint8Array` or `ArrayBuffer`, up to 64 MB | `{ name }`                                     |
| `getDocument`  | —                                                                                                                                                                       | `{ name, data }`: the document as `.fig` bytes |
| `getPages`     | —                                                                                                                                                                       | `{ pages: [{ id, name }], currentPageId }`     |
| `setPage`      | `{ pageId }`                                                                                                                                                            | `null`                                         |
| `getSelection` | —                                                                                                                                                                       | `{ nodeIds }`                                  |
| `select`       | `{ nodeIds }`: up to 1000 layers on the current page                                                                                                                    | `{ nodeIds }`: the layers it selected          |
| `zoomToFit`    | —                                                                                                                                                                       | `null`                                         |
| `exportImage`  | `{ nodeIds?, format?: 'PNG' \| 'JPG' \| 'WEBP', scale?: 0.1–4 }`; without `nodeIds`, the selection or else the whole page                                               | `{ data, mimeType }`                           |
| `setEditable`  | `{ editable }`                                                                                                                                                          | `{ editable }`                                 |

Error codes are `invalid-request`, `unknown-method`, `edit-not-allowed`, `no-document`, `not-found`, `too-large`, and `failed`.

## Events

Events arrive on the port as `{ event, data }`.

| Event             | Data                                                    |
| ----------------- | ------------------------------------------------------- |
| `connected`       | `{ version, editable, allowEdit }`, sent once, first    |
| `documentload`    | `{ name }`                                              |
| `documentchange`  | `{ name }`, after edits settle; save with `getDocument` |
| `selectionchange` | `{ nodeIds }`                                           |
| `pagechange`      | `{ pageId }`                                            |
| `editablechange`  | `{ editable }`                                          |

## Security

- Only the parent frame at the exact `origin` can connect, and only once per load; a page that frames the editor with another origin in the URL cannot talk to it.
- Every message on the port is validated; malformed requests are answered with `invalid-request` and never reach the editor.
- The embed starts none of the app's own services: no coding agents, MCP server, usage statistics or daily ping, Cloud sign-in, or collaboration rooms. It opens no file, Cloud document, or room link from its own address.
- Serve the editor with a `Content-Security-Policy: frame-ancestors` that lists the sites allowed to frame it if your deployment should not be embeddable everywhere.
