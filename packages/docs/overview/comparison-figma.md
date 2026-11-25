---
title: Pairdraw vs Figma
description: How Pairdraw and Figma differ in files, agent access, MCP limits, pricing, motion, and handoff, and what survives a .fig round trip.
---

# Pairdraw vs Figma

Pairdraw reads and writes Figma's own `.fig` format, so the difference is not file compatibility. It is the account, the agent budget, and the parts of the platform that Figma runs for a team.

Figma facts on this page were checked on 2026-11-25 at the linked sources. Pairdraw facts describe version 0.20.0.

## Who each one suits

**Pairdraw** fits people who want the file on disk, an editor they can read and change, and an agent that can make a thousand small edits without thinking about a meter. It is also the shorter path when the deliverable is a Figma file someone else will open.

**Figma** fits teams that live in multiplayer review, Dev Mode handoff, and code layers tied to a repository, and anyone who needs Sites, Slides, FigJam, or Motion. Those are platform products with no Pairdraw equivalent.

## Side by side

| | Pairdraw 0.20.0 | Figma |
| --- | --- | --- |
| Document and files | `.fig` and `.pen` files on disk; no server needed ([exporting](/user-guide/exporting)) | Figma's cloud document; export to `.fig` ([pricing](https://www.figma.com/pricing/)) |
| Account | None ([README](https://github.com/BadryansahBangsawan/pairdraw#readme)) | Account and a seat; the free Starter plan has limits ([pricing](https://www.figma.com/pricing/)) |
| Agent access | MCP over stdio and HTTP, built-in chat with your own key, WebMCP, CLI ([MCP server](/programmable/mcp-server)) | MCP server writing through the Plugin API, restricted to whitelisted clients since 2026-10-01 ([HN thread](https://news.ycombinator.com/item?id=49922729)) |
| Agent limits | No call cap; design memory refuses off-system colours and fonts ([design memory](/programmable/mcp-server#design-memory)) | 48,000 UTF-8 bytes per tool call; free during beta, then usage-based paid; 150 AI credits per day on Starter, capped at 500 per month, 3,000 per month on Professional ([write to canvas](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas), [pricing](https://www.figma.com/pricing/)) |
| Price | Free, MIT. You pay your model provider | Professional Full seat $16 per month with 3,000 AI credits; Dev $12; Organization $55; Enterprise $90 ([pricing](https://www.figma.com/pricing/)) |
| Components | Components, sets, instances, slots, Reka UI behaviours ([components](/user-guide/components)) | Components, variants, properties, slots, libraries; the reference implementation |
| Prototypes | Click, hover, press, delay triggers, overlays, scrolling frames, Smart animate; MP4, GIF, WebM export ([prototype](/user-guide/playing-a-prototype)) | Prototypes plus Motion: a timeline, presets, 3D transforms, MP4/WebM/SVG/GIF export ([Config 2026](https://www.figma.com/blog/config-2026-recap)) |
| Tokens and design memory | Variables with collections, modes, formulas; drift check and sync ([variables](/user-guide/variables)) | Variables with modes; design-system governance through Guidelines, code sources, and a system map, in beta ([Config India 2026](https://help.figma.com/hc/en-us/articles/43663368947863)) |
| Import | `.fig`, `.pen`, Figma clipboard, HTML paste, web capture | `.fig`, and paste through its own clipboard |
| Export | PNG, JPG, WEBP, SVG, PDF, MP4, GIF, WebM, HTML, CSS, Tailwind, React, Vue, JSX, `.fig` and `.pen` | `.fig`, PNG, JPG, SVG, PDF, MP4/WebM, code from Dev Mode and Code Connect |
| Open source | MIT editor, CLI, and packages; Cloud is Apache-2.0 | Closed |

## Where Figma is better

- **Multiplayer at team scale.** Cursors, follow, comments, review, approvals, and permissions for outside guests are mature. Pairdraw syncs the same things through an optional, self-hosted [Cloud](/user-guide/pairdraw-cloud), and local documents have no live sharing.
- **Motion.** Motion ships a timeline, animation presets, AI-prompted animation, 3D transforms, and video export ([Config 2026](https://www.figma.com/blog/config-2026-recap)). Pairdraw exports prototype video but has no keyframe timeline.
- **Publishing and platform products.** Sites publishes a design to a live domain; Slides, FigJam, Buzz, and Specs have no Pairdraw counterpart. Specs are objects an agent reads and writes ([Config India 2026](https://help.figma.com/hc/en-us/articles/43663368947863)).
- **Code layers and handoff.** Code layers run real code on the canvas, and Dev Mode plus Code Connect tie components to the codebase. Pairdraw exports code but does not run a component from a repository on the canvas.
- **Design-system governance.** Guidelines, code sources, and the centralized design system map are library-level controls for many files ([Config India 2026](https://help.figma.com/hc/en-us/articles/43663368947863)). Pairdraw's design memory is per document.
- **Ecosystem.** Plugins, widgets, community files, and hiring for Figma skills are larger by orders of magnitude.

## Moving from Figma

1. **Open the file.** File → Open, drag the `.fig` onto the window, or `pairdraw` on the command line; frames, styles, variables, grid auto layout, interactive components, Smart animate, and scrolling frames survive a round trip ([exporting](/user-guide/exporting), [CHANGELOG 0.20.0](https://github.com/BadryansahBangsawan/pairdraw/blob/main/CHANGELOG.md)).
2. **Or copy and paste.** Select in Figma, copy, paste in Pairdraw; fills, strokes, auto layout, text, effects, corner radii, and vector networks come across, and the reverse works too ([features](/overview/features)).
3. **Check what the file lost.** The [Figma compatibility reference](/reference/figma-compatibility) lists what is read, written, and dropped.
4. **Keep Figma for the parts it owns.** Motion, Sites, Dev Mode, and team review stay there. Pairdraw opens the same file when the work is editing, tokens, or agent runs.

## Sources

Checked 2026-11-25: [figma.com/pricing](https://www.figma.com/pricing/), [write to canvas](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas), [Config 2026 recap](https://www.figma.com/blog/config-2026-recap), [Config India 2026](https://help.figma.com/hc/en-us/articles/43663368947863), [the MCP whitelist thread](https://news.ycombinator.com/item?id=49922729). Pairdraw facts come from this repository at 0.20.0 ([CHANGELOG](https://github.com/BadryansahBangsawan/pairdraw/blob/main/CHANGELOG.md)).
