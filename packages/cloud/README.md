# @pairdraw/cloud

Optional, self-hostable Pairdraw Cloud: accounts, workspaces, immutable document revisions in
S3-compatible storage, sharing, enrollment, quotas, and transactional email. The editor stays
local-first and works without it.

## Subpaths

- `@pairdraw/cloud/contract` — Valibot network contracts and public types.
- `@pairdraw/cloud/client` — discovery, authentication, device authorization, and the typed client.
- `@pairdraw/cloud/email` — Vue Email rendering.
- `@pairdraw/cloud/server` — runtime-neutral Hono routes and services with injected dependencies.
- `@pairdraw/cloud/runtime/node` — PostgreSQL, S3, SMTP, the HTTP listener, and workers.

## Running

The Node runtime reads one deployment TOML file named by `PAIRDRAW_CLOUD_CONFIG` and resolves
secrets from the environment. Start from
[`deploy/pairdraw-cloud.example.toml`](./deploy/pairdraw-cloud.example.toml), then build and run
the server on Node 22 or later, installed from npm or built from a checkout:

```sh
npx -p @pairdraw/cloud pairdraw-cloud   # pairdraw-ai-relay runs the AI relay
bun --filter @pairdraw/cloud build:standalone && bun --filter @pairdraw/cloud start
```

The server migrates the database before it accepts requests. The
[self-hosting guide](https://github.com/BadryansahBangsawan/pairdraw/blob/master/packages/docs/reference/self-hosting-cloud.md) covers building with the
portal, configuration, the editor address, operator commands, and upgrades;
[`deploy/README.md`](./deploy/README.md) covers local development and end-to-end tests, and
[`deploy/security.md`](./deploy/security.md) covers hardening. The design is described in
[Cloud Architecture](https://github.com/BadryansahBangsawan/pairdraw/blob/master/packages/docs/development/cloud.md).

## Tests

`bun run test:cloud` from the repository root type-checks the package and runs unit and PGlite
integration tests. `bun --filter @pairdraw/cloud test:e2e` runs the Docker Compose end-to-end
suite against PostgreSQL and SeaweedFS.
