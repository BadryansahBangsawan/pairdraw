// Hands an MCP server's OAuth redirect to the desktop app, which validates the state and
// exchanges the code for tokens. The code is useless without the verifier, which never leaves
// the app.
const target = `pairdraw://oauth/mcp${window.location.search}`
document.getElementById('return')?.setAttribute('href', target)
window.location.replace(target)
