# Coding agents

The Pairdraw desktop app can use a coding agent you already have — Claude Code, Codex, Gemini CLI, [omp](#omp), or [Pi](#pi) — as its design agent. The agent runs on your computer with your own subscription and chooses its own model; Pairdraw starts it when you send a message, through the [Agent Client Protocol](https://agentclientprotocol.com/) or, for Pi, its Harness companion, and gives it the canvas tools through Pairdraw's local [MCP server](./mcp-server).

In the web app, a companion program on your computer starts them instead; see [Coding agents in the browser](./browser-agents). They take only the **Design agent** role. Visual review, plan reviews, and fast background work need an API model, which guided setup can add for you.

## What you need

1. The [Pairdraw desktop app](/download).
2. The agent's ACP program, installed globally (see each agent below). Claude Code's and Codex's ACP programs include the agent, so their own command-line tools are optional.
3. Pairdraw's MCP server, installed globally. Use the version that matches your app:

   ```sh
   npm install -g @pairdraw/mcp
   ```

4. The agent signed in to your account. Pi can use an AI Gateway key instead (see [Pi](#pi)).

Then open **Settings → Models → Run guided setup**, choose the agent under **Coding agents on this computer**, and press **Connect** on its card. One press runs every step in order and shows each one as it goes:

1. **Check this computer** looks for the agent, its ACP program, and the MCP server.
2. **Install** runs the npm command shown under the card for a missing ACP program, and installs or updates the MCP server to match the app.
3. **Sign in** opens the agent's own login in your browser when the agent reports that it is not signed in. Agents that are already signed in skip it.
4. **Reach Pairdraw's tools** starts a session the way a chat does, without sending a message, and checks that it reaches Pairdraw's MCP server.
5. When you connect from a model's settings, **Use it in the chat** saves the model and makes it the design agent. Guided setup does this when you finish it.

When a step cannot finish, setup stops there and shows only what that step needs, such as Node.js, a command to run with administrator rights, or the agent's reason for not reaching the tools. Fix it and press **Retry**: setup continues from that step, and steps already done are not repeated. Once every step is done, the button checks again.

### Let your agent set itself up

If you already use one of these agents in a terminal, guided setup can do the typing for you: press **Copy setup prompt** on the agent's card and paste the prompt into the agent. It asks the agent to install its ACP program and the MCP server, confirm both are on your `PATH`, and make sure you are signed in.

## Claude Code

```sh
npm install -g @agentclientprotocol/claude-agent-acp
```

Sign in from guided setup, or by running `claude` and using `/login`. The ACP program uses the same account as Claude Code. If the browser cannot hand the sign-in back, the sign-in page shows a code to paste into guided setup.

Claude Code can instead reach Claude through Amazon Bedrock, Google Vertex AI, or Microsoft Foundry, set up outside the app with `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, or `CLAUDE_CODE_USE_FOUNDRY` and that cloud's credentials. Pairdraw looks for these switches in the environment it starts agents with and in the `env` block of Claude Code's user settings (`~/.claude/settings.json`, or `CLAUDE_CONFIG_DIR`) and managed settings; it reads nothing else from those files. When one is on, the model list shows **External config**, guided setup names the cloud, and setup skips the sign-in step. If Claude Code itself then reports that it is not signed in, for example because a project setting turns the switch off, setup trusts that report and offers the sign-in. The cloud's credentials and model choice stay in Claude Code's own configuration.

## Codex

```sh
npm install -g @agentclientprotocol/codex-acp
```

Sign in with ChatGPT from guided setup, or with `codex login`; both use the same account.

An older adapter from the `@zed-industries/codex-acp` package also installs a `codex-acp` program. It neither reports nor signs in to your account, so guided setup asks you to install the supported one and to remove the older one or put it later on your `PATH`.

## Gemini CLI

```sh
npm install -g @google/gemini-cli
```

Gemini CLI speaks ACP itself, so there is no separate program, and guided setup cannot install or sign in to it for you. When it is missing, **Connect** stops at the install step with the command above; once it is installed, the card shows `gemini` to run once in a terminal to choose a sign-in method.

## omp

```sh
bun install -g @oh-my-pi/pi-coding-agent
```

omp needs [Bun](https://bun.sh) and speaks ACP itself (`omp acp`), so like Gemini CLI there is no separate program, and guided setup cannot install it for you. There is no sign-in step: omp runs on the providers, keys, and default model already set up in `~/.omp`. If you have not set one up yet, run `omp login` once. Its MCP servers live in `~/.omp/agent/mcp.json` (or `PI_CODING_AGENT_DIR/mcp.json`), which **Settings → MCP → Other apps** can add Pairdraw's server to.

## Pi

Pi runs through Pairdraw's Harness companion instead of ACP. It needs Node.js 22.15 or later, or Bun. Guided setup installs the companion with one click; to install it yourself, use the version that matches your app:

```sh
npm install -g @pairdraw/harness
```

Pairdraw uses the providers you signed in to in Pi and Pi's default model, so there is no key to paste. Sign in by running `pi` and using `/login`, and pick a default model with `/model`. To use another model in Pairdraw, enter it as `provider/model` in the Pi model's settings. An [AI Gateway](https://vercel.com/ai-gateway) key is optional; when you save one, Pi uses the gateway instead of your Pi sign-ins.

Pairdraw reads only Pi's `settings.json` for the default model; your credentials stay with Pi. Your Pi extensions, themes, and prompt templates are not loaded into Pairdraw's sessions. Pi keeps a conversation's context while it runs; after Pi or Pairdraw restarts, the conversation continues in a fresh Pi session, because Pi's workspace lives in memory.

## Troubleshooting

- **Shown as not found after installing.** Apps started from the Dock or Start menu do not see every folder your terminal adds to `PATH`. Pairdraw also looks in common global folders for npm, Bun, Volta, mise, and Homebrew; if your package manager installs elsewhere, add that folder to your login shell's `PATH` and restart Pairdraw.
- **Shown as update needed.** The MCP server or Pi's companion does not match the app version. Press **Connect** to update it, or run the command guided setup shows with the package manager that installed it, then press **Retry**. A chat that needs it says so and offers **Run guided setup**.
- **The agent couldn't reach Pairdraw's tools.** Before sending your message, Pairdraw waits for the agent to connect to its MCP server and stops if it does not, quoting the agent's reason when it gives one. Check that the MCP server shows as installed in guided setup and is running in **Settings → MCP**. Codex skips Pairdraw's server when its own `config.toml` defines a server named `pairdraw`; remove that entry.
- **The agent starts but cannot edit the canvas.** The MCP server is missing or not running. Install the matching `@pairdraw/mcp` version and restart Pairdraw.
- **Where the agent works.** Chats start the agent in a folder of its own inside Pairdraw's app data, not your home folder, so it does not pick up project settings kept there. The agent still uses its own configuration, such as the MCP servers and rules in `~/.codex` or `~/.claude`.
- **The agent asks you to sign in.** Press **Connect** in guided setup, or sign in with the agent's own command-line tool as described above, then send your message again.
