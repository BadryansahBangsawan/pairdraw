---
title: Research on a Board
description: Quote the page open in the built-in browser onto a board as a cited sticky note.
---

# Research on a Board

On a board, the chat can read the page you have open in the built-in browser and turn it into a cited sticky note: a note that quotes the page, records where it came from, and is connected to the note you asked from.

## What It Needs

- **A board document.** On Home, choose **Board**. In a design document the research tools are not offered at all.
- **The desktop app's built-in browser.** The page is read from that window, so a browser tab answers that the browser window is desktop only.
- **A sticky note to cite from.** Select one sticky; the new note connects from it.

Research has no web search. The chat cannot look anything up on its own: it reads only the page the built-in browser shows, and cites that.

## Citing a Page

1. Open a board, add a sticky note, and select it.
2. Open the page in the built-in browser: the globe icon in the top bar, an address, **Open**.
3. Ask the chat to cite it, for example "Cite this page." The chat passes the open page to its cite tool.

You can also give the chat an address to cite. It opens that address in the built-in browser first, opening the window if it was closed, and cites the page the window shows.

The chat places a new sticky note 48 pixels to the right of the one you selected, and draws a connector from that note to the new one with an arrow at the new note. Citing again from the same note places the next one further right, in a row.

The new note reads:

```
<the page's visible text, up to 2,000 characters>

Source: <the page's title>
<the page's address>
Read: <when the page was read, as an ISO timestamp>
```

The note is named after the page's title, or after the address when the page has none. The citation — address, title, quote, and read time — is stored on the note, so a saved document keeps where each quote came from.

The note and its connector are one undo step.

## Reading Without Placing

The chat also has a read tool. It returns the open page's address, title, and visible text — up to 8,000 characters of text and 300 of title — so a reply can answer from the page. It places nothing and changes nothing.

## The Chat Reference

When the cite call returns, the reply names the new note as a citation chip with a quote icon. Choosing the chip focuses the note on the canvas.

A note that carries a citation can also be sent to the chat: right-click it and choose **Run sticky as prompt**. The message holds the note's text and a citation chip, so the agent can tell a quoted note from one that was written by hand.

## Limits

- The page's text is read with `innerText` from its body, so text drawn on a canvas, inside an image, or by a script is not in the quote.
- A quote keeps 2,000 characters and a read keeps 8,000; a longer page is cut, not refused.
- A citation addresses an `http` or `https` page only. Any other address is refused before a note is placed.
- A refused address, a closed window, or a read that fails places nothing and leaves the board as it was.
- The new note is placed at once. Citing does not open the approval dialog that canvas edits use when Settings asks before changes.
