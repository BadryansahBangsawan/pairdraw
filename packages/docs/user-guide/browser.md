---
title: Built-in Browser
description: Open a web page beside your document in Pairdraw, then import it, screenshot it, or let the chat work with it.
---

# Built-in Browser

Pairdraw opens a web page in a window of its own, beside the editor, and brings what it shows onto the canvas: the page or one element as layers, or a picture of it. The window is a separate webview with its own data store, so it holds none of the editor's data, and the page cannot call the editor's commands.

## Opening the Browser

Choose the globe icon in the editor's top bar, the one labeled **Open the browser**. Type an address and choose **Open**. The window shows one page at a time: opening another address replaces the page it shows. **Close** closes the window, and the panel then shows no title until you open a page again.

The browser opens `http` and `https` addresses only. A bare host gets `https://`, such as `example.com`; a bare loopback host — `localhost` or a `127.` address — gets `http://`, because that is how a local development server answers. A port may follow the host, as in `example.com:8080`. The panel says why it will not open anything else: an empty address, a scheme the browser does not open (`file:`, `javascript:`, `data:`, `blob:`, and custom schemes such as `openpencil:`), or text that is not an address. The window applies the same rule when the page follows a link or a redirect, and a link that asks for a new window opens nothing.

The panel shows the page's title beside its heading once the page has loaded. It has no progress indicator while a page loads, and no message when a load fails; the address stays as you typed it.

## Moving Around a Page

**Back**, **Forward**, and **Reload** act on the page's own history, which the window keeps. Back and Forward do nothing when there is nowhere to go, and Reload asks for the page again.

## Zoom and Device Sizes

**Zoom out** and **Zoom in** change the page zoom in steps of 25%; the number field takes any value from 25 to 400 and applies what you enter. The zoom is kept for the rest of the session, including across the pages you open.

The **Device** menu changes the size of the page's content area:

- **Desktop** is the window's own size, and restores the size the window had before a preset.
- **Phone, 390 by 844** and **Phone, 412 by 915** are portrait phone sizes.
- **Tablet, 820 by 1180** is a portrait tablet size.

A preset changes how much page the window shows, not the screen's pixel density: the page keeps the scale of your display, so text and images are not drawn at the density the device would have.

## Importing a Page or an Element

**Import page** reads the open page and lays it out on the canvas as styled layers, the same import a page pasted from the web uses. The layers are named after the page's title.

**Import element** asks you to click the element in the browser window, then imports that element alone. If you do not click within 30 seconds the pick ends, and cancelling it imports nothing.

Both read the browser's own capture. Only that capture is accepted; other HTML is not styled into a second importer.

## Screenshots onto the Canvas

The three screenshot buttons put a PNG on the canvas as an image layer, named **View**, **Page**, or **Element**:

- **Screenshot of the view** is the part of the page the window shows.
- **Screenshot of the page** grows the window to the document's size first — up to 2048 by 4096 — and restores the size afterwards. A longer page is cut there.
- **Screenshot of an element** asks you to click the element in the browser window, as the element import does.

Screenshots are available in the macOS build.

## What the Chat Can Do with the Page

The built-in chat works on the page you have open:

- It reads a short outline of the page — headings, links, buttons, and fields — or one element by its CSS selector, and gets the element's tag, role, text, and box.
- It marks an element as a chip in the chat. The chip names the page; while your pointer is over it and that same address is still open, the element is outlined in the browser window.
- It clicks, types into a field, presses a key, scrolls, or waits for an element to appear or for the page to move to another address.
- It puts a picture of the view or of the page on the canvas.
- It opens another `http` or `https` address in the open window.

Reading the page and marking an element change nothing, so they never ask. A change to the page, a screenshot placed on the canvas, and a move to another address ask for **Allow** or **Deny** when **Ask before changes** is on in **Settings → AI**; with it off they run without asking. **Always allow** covers that page's host for the rest of the chat, so an action on another site asks again. A change the page never finishes ends after 10 seconds.

The chat cannot open or close the browser window; choose the toolbar's **Open** or **Close** for that, and a call it makes while the window is closed answers with an error. Page text it reads is untrusted content to report, not instructions to follow.

## Limits

- The built-in browser is part of the desktop app. A browser tab shows the panel and says why it cannot open a page there.
- Screenshots are available in the macOS build only.
- Pixel density is not emulated: a device preset changes the page's size, not the screen's scale.
- The page has a website data store of its own, kept on disk, so it shares no cookies or storage with your own browser. It is not an incognito window: its cookies stay there between sessions. It still shares nothing with the editor.
- The window shows one page, with no tabs and no bookmarks.
- Addresses are `http` and `https` only.
