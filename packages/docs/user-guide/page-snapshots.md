---
title: Page Snapshots
description: Keep a picture of a page from the built-in browser as a layer, with its address, and refresh it by hand.
---

# Page Snapshots

A page snapshot is a layer that holds a picture of a page from the built-in browser, along with the page's address. It is a snapshot, not a live page: the document stores pixels, opening a file never fetches the page, and nothing updates the picture except a refresh you ask for.

## Creating One

A snapshot is created by the app's MCP server through the `browser_snapshot` tool, while the desktop app's built-in browser shows a page:

- leave `id` out to store the open page as a new layer;
- pass `id` to replace that snapshot's picture.

The layer lands on the current page at position 0, 0, named after the page's host, sized to the picture's pixels, with the picture as its image fill.

Creating one needs the desktop app and an open browser window; in a browser tab, or with the window closed, the call fails with the same sentence the browser tools use. It never opens a window.

## What It Stores

The layer keeps, in the document:

- **the page address** — the canonical `http` or `https` URL, up to 2,000 characters;
- **the viewport size** — the picture's pixels, from 1 to 8,192 on either side;
- **the device preset** — the toolbar preset the picture was taken at, such as `desktop` or `iphone-14`, up to 40 characters; an empty or overlong id is stored as `desktop`;
- **the time it was refreshed** — an ISO instant, shown in the panel as a local clock reading.

The picture itself is a document image, and the layer's image fill draws it as a fill (`FILL` scale mode), so anything that draws an image draws the snapshot.

## The Design Panel

Select a snapshot and the design panel shows a **Page snapshot** section:

- **Address** — committed when the field loses focus or Enter is pressed, and only when the window would open that address. The same address changes nothing, and a new one is one undo step. Changing the address does not take a new picture; the layer keeps the old one until you refresh.
- **Device** — the toolbar's presets. Choosing one saves it on the layer, selects it on the browser toolbar, and resizes the open window to match; the picture stays until you refresh.
- **Refresh** and **Open in browser**.
- **Last refreshed** with the stored time.

## Refreshing

Refresh needs the desktop app's browser window to be open. A closed window stays closed, and the panel says so.

- If the window already shows the snapshot's address, Refresh takes a new picture of the view it shows.
- Otherwise it moves the window to the stored address and waits up to 10 seconds for the page to finish loading. A load that does not finish, or a picture of a page other than the one that finished loading, leaves the layer exactly as it was.
- The new picture replaces the layer's first image fill, and the layer's width, height, device preset, and last-refreshed time update with it, all in one undo step. A second fill you added beside the picture stays.

The picture is always the visible view. A full-page picture and a picked element are the screenshot commands, not a snapshot.

## Open in Browser

**Open in browser** opens the stored address in the built-in browser window. It does not change the picture, and it needs the desktop app.

## In a Browser Tab, and for a Collaborator

In a browser tab the panel still shows the address, device, and time, and the address and device stay editable, but **Refresh** and **Open in browser** are disabled with a note that they need the desktop app.

The snapshot is an ordinary layer of the document, so a collaborator who opens it sees the same picture. Nothing fetches the page for them, and nothing refreshes on its own.

## Saving and Export

The picture and the page record are both part of the document: the picture is a stored image and the record is the layer's own data. A `.fig` archive keeps them, so a round trip still knows the address, size, preset, refresh time, and picture.

A file whose stored address is not an `http` or `https` page opens as a plain image layer, without the snapshot section. Exporting the layer exports the stored picture, as any image fill exports. Figma shows the layer as an image; the page record travels as plugin data the app reads back.

## Limits

- There is no automatic refresh and no live page: no scrolling, links, or scripts run in the snapshot.
- Creating or refreshing needs the desktop app and an open window; a browser tab can only edit the record.
- The picture's stored size is at most 8,192 pixels on either side, and the pixels must be a real image; anything else stores nothing.
- Only one window is involved: the address stored is the one captured with the picture, and a refresh refuses rather than storing an address the picture was not of.
- The built-in chat's browser tools do not create snapshots; the `browser_snapshot` MCP tool does.
