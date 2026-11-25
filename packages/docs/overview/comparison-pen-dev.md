---
title: Pairdraw vs pen.dev
description: How Pairdraw and pen.dev differ in agent metering, sharing, prototypes, and pricing, and how .pen files move between them.
---

# Pairdraw vs pen.dev

pen.dev and Pairdraw both read and write `.pen` files, both keep the design next to the code, and both put an agent on the canvas. The practical difference is what the agent is allowed to do per month and what happens to the file when you stop paying.

pen.dev facts on this page were checked on 2026-11-25 at the linked sources. Pairdraw facts describe version 0.20.0.

## Who each one suits

**Pairdraw** fits people who want the file on disk with no account, no day counter on agent use, a Figma file written back out, and an editor they can fork. It is the lighter setup for a solo designer or a small team that already pays for a model.

**pen.dev** fits teams that want a polished web app with hosted models, parallel agents with variation modes, and share links they do not have to host. It ships a hosted editor at `app.pen.dev` and eleven interface languages.

## Side by side

| | Pairdraw 0.20.0 | pen.dev |
| --- | --- | --- |
| Document and files | `.pen` and `.fig` on disk, no account ([exporting](/user-guide/exporting)) | `.pen` JSON in the repository; account and hosted share snapshots ([docs](https://docs.pen.dev/)) |
| Account | None ([README](https://github.com/BadryansahBangsawan/pairdraw#readme)) | Account for the app and shares |
| Agent access | Built-in chat with your own key, MCP over stdio and HTTP, CLI, WebMCP ([MCP server](/programmable/mcp-server)) | On-canvas agent chat, MCP from external clients, VS Code extension, CLI ([docs](https://docs.pen.dev/)) |
| Agent limits | No call cap. Using an external agent over MCP costs nothing extra; design memory refuses off-system colours and fonts ([design memory](/programmable/mcp-server#design-memory)) | Free plan is 5 days per month designing with an agent, including through MCP; Pro runs daily with up to 3 parallel agents, Ultra up to 6 ([pricing](https://pen.dev/pricing)) |
| Price | Free, MIT. You pay your model provider | Free; Pro $16 per user per month billed yearly; Ultra $48; Enterprise custom ([pricing](https://pen.dev/pricing)) |
| Components | Components, sets, instances, slots, Reka UI behaviours ([components](/user-guide/components)) | Components, slots, variables and themes, component sets shared across files ([changelog](https://www.pen.dev/changelog)) |
| Prototypes | Click, hover, press, delay triggers, overlays, scrolling frames, Smart animate; MP4, GIF, WebM export ([prototype](/user-guide/playing-a-prototype)) | No prototype player is listed in the documentation or changelog; sharing is snapshot links (checked 2026-11-25) |
| Tokens and design memory | Variables with collections, modes, formulas; drift check and sync ([variables](/user-guide/variables)) | Variables and themes; token mapping is agent-mediated per request, with no continuous code link ([design to code](https://docs.pen.dev/design-and-code/design-to-code)) |
| Import | `.fig`, `.pen`, Figma clipboard, HTML paste, web capture | `.fig` (layouts, styles, images), Figma paste, a web page through the built-in browser or extension |
| Export | PNG, JPG, WEBP, SVG, PDF, HTML, CSS, Tailwind, React, Vue, JSX, MP4, GIF, WebM, `.fig` and `.pen` | `.pen`, HTML and Tailwind, CSS, SVG (including a ZIP of individual vectors), PNG, JPG, WEBP ([changelog](https://www.pen.dev/changelog)) |
| Open source | MIT editor, CLI, and packages; Cloud is Apache-2.0 | Closed |

## Where pen.dev is better

- **A web app you do not host.** `app.pen.dev` opened to everyone on 2026-10-01, with tabs and comments; Pairdraw runs in a browser from your own build or as a desktop app, and has no hosted instance ([changelog](https://www.pen.dev/changelog)).
- **Parallel agents with variation modes.** Pro runs 3 agents at once and Ultra 6, with divide-and-conquer and separate-version modes ([changelog, 2026-11-12](https://www.pen.dev/changelog)). Pairdraw runs one chat per document.
- **Share links with per-snapshot permissions.** A viewer may comment or download the `.pen`, decided per snapshot ([changelog, 2026-10-22](https://www.pen.dev/changelog)). Pairdraw needs the self-hosted [Cloud](/user-guide/pairdraw-cloud).
- **Comments that an agent applies.** Pinned threads can be applied by the agent from the thread list, and sticky notes can be sent to the agent ([changelog, 2026-10-22 and 2026-11-05](https://www.pen.dev/changelog)).
- **Hosted models without a key.** Its plans include model credits, so a first session needs no provider account ([pricing](https://pen.dev/pricing)). Pairdraw expects an OpenAI-compatible or Anthropic key, or a local harness.
- **Shaders and interface languages.** pen.dev lists 75 shader categories, and its interface is translated into 11+ languages including Indonesian ([changelog](https://www.pen.dev/changelog)). Pairdraw ships eight translated locales and no Indonesian one yet.

## Moving from pen.dev

1. **Open the file.** Drag the `.pen` onto the window, File → Open, or open it from the CLI. Pairdraw reads `.pen` libraries the document names, up to two folders above it in the desktop app ([exporting](/user-guide/exporting)).
2. **Expect the design memory to start empty.** `.pen` has no place for a design memory, so saving in that format drops it; keep working in `.fig` when you want the memory kept ([checking designs](/user-guide/checking-designs)).
3. **Rebuild what only exists on their server.** Share links with per-snapshot permissions and hosted model credits belong to pen.dev's account. Pairdraw's equivalent for sharing is [Pairdraw Cloud](/user-guide/pairdraw-cloud); for models it is your own key.
4. **Nothing is metered per day.** Agent use over MCP is limited by your provider, not by Pairdraw, and the [design memory](/user-guide/checking-designs) replaces plan-level guardrails.

## Sources

Checked 2026-11-25: [pen.dev](https://pen.dev/), [pricing](https://pen.dev/pricing), [changelog](https://www.pen.dev/changelog), [docs.pen.dev](https://docs.pen.dev/), [design to code](https://docs.pen.dev/design-and-code/design-to-code). Pairdraw facts come from this repository at 0.20.0 ([CHANGELOG](https://github.com/BadryansahBangsawan/pairdraw/blob/main/CHANGELOG.md)).
