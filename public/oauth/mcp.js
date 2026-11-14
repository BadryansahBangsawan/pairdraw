// Relays an MCP server's OAuth redirect to the editor that started sign-in, which validates the
// state, exchanges the code for tokens with its PKCE verifier, and closes this window.
const channel = new BroadcastChannel('pairdraw:mcp-oauth')
channel.postMessage(window.location.search)
channel.close()
window.close()
