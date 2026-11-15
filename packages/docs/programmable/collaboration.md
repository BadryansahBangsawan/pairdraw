---
title: Collaboration
description: AI agents' cursors and follow mode, and live editing of Cloud documents through a self-hosted Pairdraw Cloud server. Peer-to-peer rooms are off in Pairdraw builds.
---

# Collaboration

::: info Peer-to-peer rooms are off in Pairdraw
Pairdraw builds turn live peer-to-peer rooms off (`COLLABORATION_INCLUDED` in `src/constants.ts`). There is no Share popover for local documents, no joining by link or room ID, no room voice call, and no collaboration name in Settings.

What stays: AI agents show their cursors on the canvas and can be followed, and Cloud documents are edited live by everyone who opens them through their own [Pairdraw Cloud server](../reference/self-hosting-cloud).
:::

## Agents on the canvas

The built-in AI chat, ACP and Pi harness chats, and every connected MCP client appear as cursors at the layers they read or edit, each outlined label showing a sparkle and a callsign such as *Fern*. While the chat streams JSX, its cursor moves through the elements as they appear and outlines them. Agents draw their cursors and outlines in violet.

Your own avatar shows in the top bar only while it lists your agents, or while someone else has the same Cloud document open. An avatar counts the agents that person runs; hover over it to see each agent, what it is doing, and on which page. Click one of your own agents to rename it.

**View → Multiplayer cursors** (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd>) hides and shows the cursors of agents and people.

## Follow mode

Your own agents, the AI chat and MCP clients such as Claude Code or Cursor, are followed automatically while they work, so what they edit stays in view. Turn this off with the locate button in the chat's header. If you stop following an agent while it works, it is left alone until it finishes and followed again on its next run.

Click **Follow** next to an agent in its avatar's list to keep the page and layers it is editing in view; following continues between its replies and stops when it leaves. In a Cloud document, click a person's avatar to follow their viewport: your canvas pans and zooms to match their view, and a frame in their color with a “Following …” bar shows whom you follow. Click the avatar again, press <kbd>Esc</kbd>, or click, scroll, zoom, or switch pages yourself to stop.

Only an agent's name, kind, model, status, page, position, and edited layers are shared with others in a Cloud document, never prompts or replies.

## Cloud documents

Opening a Cloud document joins its room on its server's relay, so everyone who has it open sees each other's edits, cursors, selections, and comments as they happen. **Share** on a Cloud document opens its share dialog, where the server decides who may open it: links that view, comment, or edit, invitations, and snapshot links to one saved version. See [Pairdraw Cloud](../user-guide/pairdraw-cloud) for the workflow and [Cloud Architecture](../development/cloud#live-collaboration) for the relay.

## How sync works

The document state uses a CRDT (conflict-free replicated data type), so concurrent edits merge automatically without conflicts.

Moving and reordering layers merges too. Each layer remembers every parent it has been moved into and its position among its siblings, and every peer works out the same layer tree from that history ([Evan Wallace's tree CRDT](https://madebyevan.com/algos/crdt-mutable-tree-hierarchy/)). Moves, reorders, and new layers from different people all apply; if two people move the same layer at once, one move wins on every peer. When moves made at the same time would put two layers inside each other, the later move is undone, and a layer whose new parent was deleted meanwhile returns to where it was.

Everyone editing a document together needs a version of Pairdraw that records the layer tree the same way; versions that record it differently do not see each other's edits.

## Peer-to-peer rooms (not in Pairdraw builds)

The room code stays in `src/app/collab/**`, because Cloud documents and agent presence run on it. A build with `COLLABORATION_INCLUDED` set to `true` brings peer-to-peer rooms back: Share puts a local document into a room whose link (`/rooms/<room-id>` in the browser, `pairdraw://join?room=<room-id>` in the desktop app) anyone can open, peers connect directly over WebRTC through Trystero, and each device keeps its own copy of the room. Pairdraw does not ship or support such builds.
