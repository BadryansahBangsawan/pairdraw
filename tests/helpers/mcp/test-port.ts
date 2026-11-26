import { AUTOMATION_HTTP_PORT } from '@pairdraw/core/constants'

/**
 * The MCP port the test app server listens on. `PAIRDRAW_TEST_MCP_PORT` when the run sets one —
 * playwright.config passes it to the dev server — and otherwise the app's own default, so a test
 * client and the server it was started with always agree. A hardcoded fallback drifted from the
 * config's and every MCP client in CI dialled a port nothing listened on.
 */
export function testMCPPort(): number {
  const raw = process.env.PAIRDRAW_TEST_MCP_PORT
  return raw === undefined ? AUTOMATION_HTTP_PORT : Number(raw)
}
