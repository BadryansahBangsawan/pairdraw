# MCP server

stdio and Hono HTTP MCP server that reuses Core tools (`packages/core/AGENTS.md`, Tools).

- MCP-only filesystem and server tools live in `packages/mcp/src/tool/registration.ts`; listener and session lifecycle under `packages/mcp/src/server/`, stdio under `packages/mcp/src/stdio/`, transport discovery under `packages/mcp/src/transport/`.
- Registration uses Standard Schema with Valibot JSON Schema conversion from the Core tool input contract; per-tool exposure comes from `isToolExposed()`.
- File access must resolve symlinks inside the effective MCP root. CLI defaults are the current directory on macOS and Linux and the home directory on Windows.
- Keep browser lifecycle out of this package and out of Core.
- Every HTTP request and WebSocket upgrade with an `Origin` header must come from `admittedOrigins()`: the configured CORS origins plus the desktop app's; requests without one come from local programs and still need a token (`packages/mcp/src/server/origin.ts`, `packages/mcp/tests/agents/bridge.test.ts`).
- The companion's agent bridge lives in `packages/mcp/src/agents/` and is on only with `ServerOptions.agents` (`openpencil-connect`). Its routes and sockets accept only a paired session token, never the discovery-file token or the agent token, which reaches only `/mcp`; pairing codes are one-time, expire, and are compared in constant time (`packages/mcp/src/agents/pairing.ts`).
- The bridge starts only registry agents (`packages/mcp/src/agents/registry.ts`, from `ACP_AGENTS`) through `spawnFixed`, with argv arrays and no shell; a client names an agent id and never a program or its arguments. What a tab sends an agent passes through `createACPFilter`, which pins the session folder, keeps only the companion's own MCP server, and strips `_meta`. Validate every body and socket message with the schemas in `packages/mcp/src/agents/schema.ts`, keep payloads bounded, reserve a process slot before any await, and stop a child when its socket closes, even during startup, or the server shuts down (`packages/mcp/tests/agents/security.test.ts`).
- Transport tests live under `tests/engine/mcp/{server,stdio,transport}` with shared fixtures under `tests/helpers/mcp`; isolate tests from user runtime discovery. Playwright starts the development MCP companion through the Vite automation plugin; see `tests/AGENTS.md`.
