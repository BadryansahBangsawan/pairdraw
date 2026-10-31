# MCP server

stdio and Hono HTTP MCP server that reuses Core tools (`packages/core/AGENTS.md`, Tools).

- MCP-only filesystem and server tools live in `packages/mcp/src/tool/registration.ts`; listener and session lifecycle under `packages/mcp/src/server/`, stdio under `packages/mcp/src/stdio/`, transport discovery under `packages/mcp/src/transport/`.
- Registration uses Standard Schema with Valibot JSON Schema conversion from the Core tool input contract; per-tool exposure comes from `isToolExposed()`.
- File access must resolve symlinks inside the effective MCP root. CLI defaults are the current directory on macOS and Linux and the home directory on Windows.
- Keep browser lifecycle out of this package and out of Core.
- Every HTTP request and WebSocket upgrade with an `Origin` header must come from `admittedOrigins()`: the configured CORS origins plus the desktop app's; requests without one come from local programs and still need a token (`packages/mcp/src/server/origin.ts`, `tests/agents/bridge.test.ts`).
- The companion's agent bridge lives in `src/agents/` and is on only with `ServerOptions.agents` (`openpencil-connect`). Its routes and sockets accept only a paired session token, never the discovery-file token; pairing codes are one-time, expire, and are compared in constant time (`src/agents/pairing.ts`).
- The bridge starts only registry agents (`src/agents/registry.ts`, from `ACP_AGENTS`) through `spawnFixed`, with argv arrays and no shell; a client names an agent id and never sends a program, arguments, environment, or working folder. Validate every body and socket message with the schemas in `src/agents/schema.ts`, keep payloads bounded, and stop a child when its socket closes or the server shuts down (`tests/agents/bridge.test.ts`).
- Transport tests live under `tests/engine/mcp/{server,stdio,transport}` with shared fixtures under `tests/helpers/mcp`; isolate tests from user runtime discovery. Playwright starts the development MCP companion through the Vite automation plugin; see `tests/AGENTS.md`.
