# Security Policy

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues or pull requests.

If you believe you have found a security issue in Pairdraw, report it privately using GitHub Security Advisories:

https://github.com/BadryansahBangsawan/pairdraw/security/advisories/new

Please include as much detail as possible:

- Affected version or commit
- Reproduction steps
- Proof of concept, if available
- Expected impact
- Whether the issue is already public

We will investigate privately before discussing details in public. If the report is confirmed, we will coordinate a fix and credit the reporter unless they prefer not to be named.

## Disclosure

Please give us a reasonable opportunity to investigate and release a fix before publishing details publicly.

## MCP server

The MCP HTTP transport (`pairdraw-mcp-http`) binds to `127.0.0.1` by default with `eval` disabled, CORS disabled, and file access restricted to the working directory. See [MCP docs](packages/docs/programmable/mcp-server.md#http) for configuration.

Every HTTP request and WebSocket upgrade that carries an `Origin` header must come from an allowed origin: the desktop app, the origins in `PAIRDRAW_MCP_CORS_ORIGIN`, and, for the companion, the web app it pairs with (`http://localhost:1420` unless `PAIRDRAW_CONNECT_APP_URL` names another). Every request must also be addressed to this machine (`127.0.0.1`, `localhost`, `[::1]`, or a `*.localhost` name), so a page that rebinds its DNS name to `127.0.0.1` is refused. Local programs, which send no `Origin`, still need the bearer token.

## Browser companion

The companion (`pairdraw-connect`) runs the MCP HTTP server with an agent bridge so the web app can run coding agents on the same computer. A paired tab can make agents act on this computer, with the agents' own permission prompts, so pairing is the trust decision.

- A tab pairs by opening a link that carries a one-time code in its URL fragment. The code is 128 random bits, works once, expires after two minutes, and is compared in constant time; `/pair` refuses all attempts for a minute after ten wrong codes, and a new code from the terminal lifts that lockout. The companion opens the link through a page only the user can read, so no command line holds the code.
- The tab pairs only after the person confirms it, in a dialog that shows the port and six characters derived from the code, which the terminal prints beside the link. An existing pairing stays until a new one succeeds. The terminal reports each tab that pairs.
- Pairing returns two tokens kept only in the tab's and the companion's memory. The session token reaches the agent routes and the app's bridge; the agent token, which the tab hands the agents it starts, reaches only `/mcp`. The discovery-file token that local MCP clients read starts no programs. Sessions end after 30 minutes without use, when the tab disconnects (`POST /pair/revoke`), and when the companion stops.
- The companion starts only the agents in `ACP_AGENTS`, with fixed command lines, no shell, and only absolute `PATH` folders, and installs only their adapter packages from the public npm registry, running npm in its own workspace folder. Clients name an agent by id, never a program or arguments.
- The companion rewrites what the tab sends an agent: every session runs in the workspace folder, MCP server entries other than the companion's own `/mcp` are dropped (so a tab cannot have the agent start a command as an MCP server, nor reach other servers), and `_meta` keeps only the tools Claude's adapter may use. Prompts and other messages pass through, and agents can still act within what their permission prompts allow.
- Request bodies and socket messages are validated and size-limited, and at most 16 sockets may wait to authenticate. An agent stops when its socket closes, including during startup, when its ping goes unanswered, and when the companion shuts down; at most eight agents and sign-ins run at once.
- `eval` stays off, authentication cannot be disabled, and `*` in `PAIRDRAW_MCP_CORS_ORIGIN` is ignored.

The stdio transport (`pairdraw-mcp`) is intended for local use only and does not apply these restrictions.
