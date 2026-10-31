# Security Policy

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues or pull requests.

If you believe you have found a security issue in OpenPencil, report it privately using GitHub Security Advisories:

https://github.com/open-pencil/open-pencil/security/advisories/new

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

The MCP HTTP transport (`openpencil-mcp-http`) binds to `127.0.0.1` by default with `eval` disabled, CORS disabled, and file access restricted to the working directory. See [MCP docs](https://openpencil.dev/reference/mcp-tools) for configuration.

Every HTTP request and WebSocket upgrade that carries an `Origin` header must come from an allowed origin: the desktop app, the origins in `OPENPENCIL_MCP_CORS_ORIGIN`, and, for the companion, the web app it pairs with. Pages from other sites, including ones that rebind their DNS name to `127.0.0.1`, are refused. Local programs, which send no `Origin`, still need the bearer token.

## Browser companion

The companion (`openpencil-connect`) runs the MCP HTTP server with an agent bridge so the web app can run coding agents on the same computer.

- A tab pairs by opening a link that carries a one-time code in its URL fragment. The code is 128 random bits, works once, expires after two minutes, and is compared in constant time; `/pair` refuses all attempts for a minute after ten wrong codes.
- Pairing returns a session token kept only in the tab's and the companion's memory. Only session tokens reach the agent routes; the discovery-file token that local MCP clients read does not start programs.
- The companion starts only the agents in `ACP_AGENTS`, with fixed command lines and without a shell, in its own workspace folder, and installs only their adapter packages from the public npm registry. Clients name an agent by id; they send no program, arguments, environment, or folder.
- Request bodies and socket messages are validated and size-limited. An agent stops when its socket closes, when its ping goes unanswered, and when the companion shuts down.
- `eval` stays off and authentication cannot be disabled.

The stdio transport (`openpencil-mcp`) is intended for local use only and does not apply these restrictions.
