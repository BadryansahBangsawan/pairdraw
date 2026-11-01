# Coding agents in the browser

The web app at [app.openpencil.dev](https://app.openpencil.dev) can use Claude Code, Codex, or Gemini CLI as its design agent, like the [desktop app](./coding-agents). A web page cannot start programs on your computer, so a small companion program does it: it runs OpenPencil's [MCP server](./mcp-server) and starts the agents the chat asks for.

## Connect your computer

You need [Node.js](https://nodejs.org/en/download), which includes `npx`.

1. In the web app, open **Settings → Models**, choose a coding agent, and copy the `npx` command shown under its description. It names the companion at the app's version, for example:

   ```sh
   npx -p @open-pencil/mcp@0.16.0 openpencil-connect
   ```

2. Run it in a terminal and keep it running while you work. It opens a link to the web app in your default browser and prints the same link, with six characters such as `3F9-A21`.
3. The tab that opens asks whether to connect. Check that it shows the same six characters as the terminal, then press **Connect**; if they differ, or you did not just start the companion, press **Cancel**. The tab then connects to your computer. The agent's settings show **Connected to your computer**, and **Connect** installs, signs in to, and checks the agent as on the desktop.

The link works once and for two minutes. Press <kbd>Enter</kbd> in the companion's terminal for a new one, for example to connect another tab. The tab keeps its connection only while it is open: after reloading it, or restarting the companion, open a new link.

## Browsers

- **Chrome, Edge, and Firefox** connect to the companion. Chrome and Edge may ask whether the site may reach devices on your local network; allow it.
- **Safari** does not let websites reach programs on your computer. Use another browser, or the [desktop app](/download).

## What the companion allows

- It listens only on `127.0.0.1`, on port 7600 unless you set `PORT`. When the desktop app already runs its MCP server there, quit the desktop app or start the companion with `PORT=7601`; the link then carries the port.
- Only the tab that opened the link and confirmed it gets a session token, and only that token reaches the agent routes. Agents get a separate token that reaches only the MCP server. Both live in the tab's memory and in the companion's; neither writes them anywhere. A tab unused for 30 minutes, or disconnected, is signed out.
- The terminal says when a tab connects. If you did not open the link, stop the companion with <kbd>Ctrl</kbd>+<kbd>C</kbd>.
- Pages from other sites are refused, whatever they send, as are requests addressed to any name but this computer. The web app's own origin is allowed; to pair a development server, set `OPENPENCIL_CONNECT_APP_URL`, for example to `http://localhost:1420`.
- It starts only the agents OpenPencil knows, with fixed command lines, in a folder of its own beside the MCP server's discovery file. The tab names an agent, never a program or its arguments. Every chat runs in that folder, and agents reach only the companion's own MCP server: MCP servers the browser asks for besides it, including your own MCP connections, are left out.
- **Install** runs `npm install --global` for the agent's own ACP package and nothing else.
- Closing the tab, or the chat, stops its agent. Stopping the companion with <kbd>Ctrl</kbd>+<kbd>C</kbd> stops every agent it started.
- The MCP server's `eval` tool stays off, and file tools stay inside the folder you started the companion in, or `OPENPENCIL_MCP_ROOT`.

Agents still ask before acting on your computer, as on the desktop, and an agent you allow to edit files can edit them. Keep the companion running only while you use it.

## Troubleshooting

- **That link expired or was already used.** Press <kbd>Enter</kbd> in the companion's terminal and open the new link.
- **The companion isn't running.** Start it again; a running companion that the tab lost restores the connection by itself once it is back, while a restarted one needs a new link.
- **The companion's version doesn't match this app.** Stop it and start it again with the command the settings show.
- **Port 7600 is in use.** The desktop app or another MCP server runs there. Quit it, or start the companion with `PORT=7601`.
