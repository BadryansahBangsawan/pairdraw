# Coding agents in the browser

The web app can use Claude Code, Codex, Gemini CLI, or omp as its design agent, like the [desktop app](./coding-agents). A web page cannot start programs on your computer, so a small companion program does it: it runs Pairdraw's [MCP server](./mcp-server) and starts the agents the chat asks for.

## Connect your computer

You need [Node.js](https://nodejs.org/en/download), which includes `npx`.

1. In the web app, open **Settings → Models**, choose a coding agent, and copy the `npx` command shown under its description. It names the companion at the app's version, for example:

   ```sh
   npx -p @pairdraw/mcp@0.18.0 pairdraw-connect
   ```

2. Run it in a terminal and keep it running while you work. It opens a link to the web app (`http://localhost:1420` unless `PAIRDRAW_CONNECT_APP_URL` names another) in your default browser and prints the same link, with six characters such as `3F9-A21`.
3. The tab that opens asks whether to connect. Check that it shows the same six characters as the terminal, then press **Connect**; if they differ, or you did not just start the companion, press **Cancel**. The tab then connects to your computer. The agent's settings show **Connected to your computer**, and **Connect** installs, signs in to, and checks the agent as on the desktop.

The link works once and for two minutes. Press <kbd>Enter</kbd> in the companion's terminal for a new one, for example to connect another tab. The tab keeps its connection only while it is open: after reloading it, or restarting the companion, open a new link.

## Browsers

- **Chrome, Edge, and Firefox** connect to the companion. Chrome and Edge may ask whether the site may reach devices on your local network; allow it.
- **Safari** does not let websites reach programs on your computer. Use another browser, or the [desktop app](/download).

## What the companion allows

- It listens only on `127.0.0.1`, on port 7600 unless you set `PORT`. When the desktop app already runs its MCP server there, quit the desktop app or start the companion with `PORT=7601`; the link then carries the port.
- Only the tab that opened the link and confirmed it gets a session token, and only that token reaches the agent routes. Agents get a separate token that reaches only the MCP server. Both live in the tab's memory and in the companion's; neither writes them anywhere. A tab unused for 30 minutes, or disconnected, is signed out.
- The terminal says when a tab connects. If you did not open the link, stop the companion with <kbd>Ctrl</kbd>+<kbd>C</kbd>.
- Pages from other sites are refused, whatever they send, as are requests addressed to any name but this computer. The origin of the web app it pairs with is allowed: `http://localhost:1420` by default, or the address `PAIRDRAW_CONNECT_APP_URL` names, such as a Pairdraw Cloud server's.
- It starts only the agents Pairdraw knows, with fixed command lines, in a folder of its own beside the MCP server's discovery file. The tab names an agent, never a program or its arguments. Every chat runs in that folder, and agents reach only the companion's own MCP server: MCP servers the browser asks for besides it, including your own MCP connections, are left out.
- **Install** runs `npm install --global` for the agent's own ACP package and nothing else.
- Closing the tab, or the chat, stops its agent. Stopping the companion with <kbd>Ctrl</kbd>+<kbd>C</kbd> stops every agent it started.
- The MCP server's `eval` tool stays off, and file tools stay inside the folder you started the companion in, or `PAIRDRAW_MCP_ROOT`.

Agents still ask before acting on your computer, as on the desktop, and an agent you allow to edit files can edit them. Keep the companion running only while you use it.

## Development server

`bun run dev` connects its own tab without the companion or a link. The MCP server it starts runs the agent bridge with a session made for that development server and handed to its tab, so the chat finds and starts agents on your computer as soon as the app loads. The session lives in the development server's process, the MCP server's environment, and the tab's bundle; it is never written to the discovery file, and it ends when the development server stops.

- Requests and sockets still pass the same checks: the MCP server listens only on `127.0.0.1`, and only the development server's origin may call it.
- Like the development server's automation token, the session is in the scripts it serves, so programs on your computer that can load them can use it. On a computer you share with other accounts, set `PAIRDRAW_DEV_AGENTS=0`.
- As with the companion, the MCP server's `eval` tool stays off, even with `PAIRDRAW_MCP_EVAL=1`. To use it, start the development server with `PAIRDRAW_DEV_AGENTS=0`.
- Builds never carry a session, and neither do `--mode cloud`, `--mode metrics`, `bun run tauri dev` (the desktop app starts agents itself), or a server with `TAURI_DEV_HOST`.
- `bun run dev:portless` does not connect the tab this way yet; pair it with the companion as above, with `PAIRDRAW_CONNECT_APP_URL` set to the app's address.
- When the desktop app, a companion, or another MCP server already listens on the development server's MCP port, the development server cannot start its own, and the tab keeps trying. Quit the other server and reload the tab.
- Set `PAIRDRAW_DEV_AGENTS=0` to start the development server without it. The Playwright configuration does this so that tests never find the agents on your computer; start a server you reuse for tests (`PAIRDRAW_TEST_REUSE_SERVER=1`) the same way.

## Troubleshooting

- **That link expired or was already used.** Press <kbd>Enter</kbd> in the companion's terminal and open the new link.
- **The companion isn't running.** Start it again; a running companion that the tab lost restores the connection by itself once it is back, while a restarted one needs a new link.
- **The companion's version doesn't match this app.** Stop it and start it again with the command the settings show.
- **Port 7600 is in use.** The desktop app or another MCP server runs there. Quit it, or start the companion with `PORT=7601`.
