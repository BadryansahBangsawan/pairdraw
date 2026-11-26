---
title: Pairdraw vs Paper
description: How Pairdraw and Paper differ in files, agent access, pricing, components, prototypes, and tokens, with a migration path off Paper.
---

# Pairdraw vs Paper

Both tools put an agent next to a canvas. The difference is what the canvas holds. Paper's layers are HTML elements that the browser lays out; Pairdraw keeps a scene graph in a file you own and renders it with Skia. That decides what each one can do with components, prototypes, and tokens.

Competitor facts on this page were checked on 2026-11-25 at the linked sources. Pairdraw facts describe version 0.21.0.

## Who each one suits

**Pairdraw** fits teams that want the document on disk, an editor under the MIT licence, and an agent loop with no per-call meter. It is the better fit when the work needs component sets, slots, prototypes, or a Figma file that survives a round trip.

**Paper** fits design engineers whose output is a web interface, brand and marketing work that leans on gradients and P3 colour, and teams that want to send a URL instead of a file. It is a weaker fit when the work needs components, a prototype, or a document another tool can open.

## Side by side

|                          | Pairdraw 0.21.0                                                                                                                                                             | Paper                                                                                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Document and files       | Scene graph in `.fig` and `.pen` files on disk ([exporting](/user-guide/exporting))                                                                                         | HTML/CSS DOM as the document; cloud-first web app and Desktop; no public document format is documented ([llms.txt](https://paper.design/llms.txt))                                      |
| Account                  | None; no backend for local documents ([README](https://github.com/BadryansahBangsawan/pairdraw#readme))                                                                     | Account for the web app and seats ([pricing](https://paper.design/pricing))                                                                                                             |
| Agent access             | Built-in chat with your own key, MCP over stdio and HTTP, WebMCP in the browser ([MCP server](/programmable/mcp-server#webmcp))                                             | MCP from Paper Desktop, remote MCP in early access ([MCP docs](https://paper.design/docs/mcp)); WebMCP in the browser app ([build log, September 2026](https://paper.design/build-log)) |
| Agent limits             | No call cap. Design memory refuses off-system colours and fonts and undoes the edit ([design memory](/programmable/mcp-server#design-memory))                               | 100 MCP calls per week on Free, 1M per week on Pro ([pricing](https://paper.design/pricing))                                                                                            |
| Price                    | Free, MIT. You pay your model provider ([LICENSE](https://github.com/BadryansahBangsawan/pairdraw/blob/main/LICENSE))                                                       | Free; Pro $20 per editor per month, $16 billed yearly ([pricing](https://paper.design/pricing))                                                                                         |
| Components               | Components, sets, instances, slots, Reka UI behaviours ([components](/user-guide/components))                                                                               | Not shipped; the roadmap lists components with slots as "coming soon" ([roadmap](https://paper.design/roadmap))                                                                         |
| Prototypes               | Click, hover, press, mouse enter and leave, after delay; overlays, scrolling frames, Smart animate; export to MP4, GIF, WebM ([prototype](/user-guide/playing-a-prototype)) | None described in the docs, build log, or roadmap ([MCP docs](https://paper.design/docs/mcp), [build log](https://paper.design/build-log), [roadmap](https://paper.design/roadmap))     |
| Tokens and design memory | Variables with collections, modes, and formulas; drift check and sync against a stylesheet or token file ([variables](/user-guide/variables))                               | Ten token types as CSS variables, per file, no modes, no drift check ([tokens](https://paper.design/docs/tokens))                                                                       |
| Import                   | `.fig`, `.pen`, Figma clipboard, HTML paste, web capture ([exporting](/user-guide/exporting), [web capture](/programmable/web-capture))                                     | Figma paste, HTML paste, Snapshot from a live page ([paste](https://paper.design/docs/paste), [Snapshot](https://paper.design/snapshot-extension))                                      |
| Export                   | PNG, JPG, WEBP, SVG, PDF, MP4, GIF, WebM, HTML, CSS, Tailwind, React, Vue, JSX, `.fig` and `.pen` ([exporting](/user-guide/exporting))                                      | PNG, JPEG, WebP, AVIF, SVG, PDF, MP4 on Pro, Copy as React CSS and Tailwind ([build log, September 2026](https://paper.design/build-log))                                               |
| Open source              | MIT editor, CLI, and packages; Cloud is Apache-2.0 ([LICENSE](https://github.com/BadryansahBangsawan/pairdraw/blob/main/LICENSE))                                           | Closed; Paper Shaders and the Paper Mono font are open ([shaders repo](https://github.com/paper-design/shaders), [Paper Mono](https://paper.design/mono))                               |

## Where Paper is better

- **The document is CSS.** An agent reads the same properties the browser uses, so there is no translation step. An independent benchmark rebuilt 67 pages through each tool's MCP: visual quality was statistically tied, and Paper used 42% less time and 32% less cost per quality point ([Braintrust eval](https://www.braintrust.dev/evals/paper-vs-figma-mcp)).
- **Browser-rendered CSS.** Filters, backdrop filters, and per-element Display P3 mixed with OKLCH are native to Paper because the browser draws them ([build log](https://paper.design/build-log)).
- **A shareable URL with free editors and viewers.** Paper's collaboration is free on purpose, and seats monetise the Pro plan only ([pricing](https://paper.design/pricing)). Pairdraw has no hosted default: sharing needs the optional self-hosted [Pairdraw Cloud](/user-guide/pairdraw-cloud).
- **Agents that work with the laptop closed.** Paper's remote MCP endpoint lets a cloud agent open and edit files unattended ([MCP docs](https://paper.design/docs/mcp)). Pairdraw's MCP server is local.
- **Shaders as a catalogue.** Paper Shaders is open source, with about 30 effects and ports for several frameworks ([shaders](https://shaders.paper.design/)). Pairdraw ships mesh gradients, noise, and texture effects.
- **Parallel work across files.** Desktop tabs let one person run several agents in different files ([build log](https://paper.design/build-log)). Pairdraw runs one chat per document.

## Moving from Paper

Paper exports no document that another tool can open, so the move goes through code or the live page.

1. **Copy the page's HTML and paste it.** Plain HTML on the clipboard pastes into Pairdraw as styled layers; scripts, event handlers, frames, and script links are removed first ([web capture](/programmable/web-capture)). This works today.
2. **Capture the live page instead.** The Chrome extension in `extensions/chrome`, or `@pairdraw/web-capture` in your own code, records computed styles and boxes and imports them as layers ([web capture](/programmable/web-capture)). This is the closest match to Paper's Snapshot.
3. **Bring the tokens across.** Export the CSS variables from Paper's theme file, or copy the stylesheet, and import them as variables; `pairdraw tokens --check` then reports drift between code and canvas ([variables](/user-guide/variables)).
4. **Rebuild components and prototypes by hand.** Paper has no components or prototype to import. Pairdraw's component sets, instances, and prototype triggers have to be built once in the new file.

Not supported today: Paper's **Copy as React CSS** and **Copy as Tailwind** output is not an import format. Pairdraw reads HTML and CSS fragments, not React components or Tailwind class strings. Whether Paper's own clipboard carries HTML that another app can read is untested in the research, so the two paths above are the ones to rely on.

## Sources

Checked 2026-11-25: [paper.design](https://paper.design/), [pricing](https://paper.design/pricing), [MCP docs](https://paper.design/docs/mcp), [tokens](https://paper.design/docs/tokens), [paste](https://paper.design/docs/paste), [Snapshot](https://paper.design/snapshot-extension), [build log](https://paper.design/build-log), [roadmap](https://paper.design/roadmap), [llms.txt](https://paper.design/llms.txt), [Paper Mono](https://paper.design/mono), [shaders](https://shaders.paper.design/). The benchmark is [Braintrust's MCP eval](https://www.braintrust.dev/evals/paper-vs-figma-mcp). Pairdraw facts come from this repository at 0.21.0 ([CHANGELOG](https://github.com/BadryansahBangsawan/pairdraw/blob/main/CHANGELOG.md)).
