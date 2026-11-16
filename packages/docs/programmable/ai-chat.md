---
title: AI Chat
description: Built-in AI assistant with 139 tools for creating and modifying designs.
---

# AI Chat

Press <kbd>⌘</kbd><kbd>J</kbd> (<kbd>Ctrl</kbd> + <kbd>J</kbd>), or click the sparkles button among the document's actions in the top bar, to open the AI assistant in its own column beside the Design panel. Describe what you want — it creates shapes, sets styles, manages layout, works with components, and analyzes your design.

## Start from a prompt

Home asks **What do you want to design?** above the search field. Describe a screen, a component, or a page and press <kbd>Enter</kbd> (<kbd>Shift</kbd> + <kbd>Enter</kbd> starts a new line): Pairdraw opens a new design where Home creates one, in your Cloud workspace or storage bucket when one is selected, opens its chat, and sends the prompt. When no model is set up yet, the prompt waits in the new design's chat while Pairdraw looks for a coding agent on your computer (see [Setup](#setup)), and is sent once one is connected. When none is found, guided setup opens first and the prompt is sent once it finishes; closing setup keeps the prompt on Home.

An empty page of a design offers the same prompt over the canvas on desktop. It sends into that document's chat and leaves once the page has a layer or an agent starts working, and the canvas around it keeps working as usual. Close it to hide it for that document, or turn off **Prompt on the canvas** in **Settings → Models → Chat**. Boards and read-only documents do not show it.

Both prompts list example chips — **Landing page**, **Sign-in screen**, **Dashboard**, and **Pricing**. Picking one fills the prompt with a starting idea and focuses it so you can edit it before sending; nothing is sent until you press <kbd>Enter</kbd>.

## Send work from the canvas

- **Run sticky as prompt** in the canvas [context menu](../user-guide/context-menu#run-sticky-as-prompt) sends the text of the selected sticky notes, with a reference to each note.
- **Apply with AI** in a comment thread's menu asks the assistant to apply that thread's feedback, reply saying what changed, and resolve it. The prompt quotes the comment and its replies and links the layer the thread is pinned to. **Apply open comments with AI** in the comments list does the same for every open thread it shows; resolved threads are left out.

Both send into the document's chat, are offered only in documents you can edit, and set up a model first the way the Home prompt does when none is configured. Layers a prompt links to go with it as references, as they do when you mention them in the chat field.

## Setup

Pairdraw opens no setup dialog on first launch. While no model is set up, it looks for a [coding agent](./coding-agents) already on your computer: Claude Code, then Codex, then Gemini CLI, then omp. One that is installed and signed in becomes the design agent right away, and the chat says **Using Claude Code from this computer** with **Change** to pick another model. An agent that does not report whether it is signed in, such as Gemini CLI or omp, is used too; if it turns out to be signed out, the chat shows the command that signs in to it. An agent that still needs a sign-in, or its ACP program or the MCP server installed, gets one button in the chat column, and nothing is signed in to or installed until you press it. A model you set up yourself is never replaced.

When no agent is found, or agents cannot run here, as in the web app without its [companion](./browser-agents), sending a prompt opens guided setup. It asks what AI should help with and what you already use: a coding agent such as Claude Code, Codex, Gemini CLI, or Pi in the desktop app, an API account, or a local or company server. It connects that access and assigns it to the **Design agent** and **Vision** roles, keeping anything you configured by hand. With OpenRouter you can sign in instead of pasting an API key. Run it any time from **Settings → Models → Run guided setup**. To configure models by hand:

1. Open the AI chat column (<kbd>⌘</kbd><kbd>J</kbd>)
2. Click the settings icon
3. Add a model and configure its provider, model ID, credentials, and capabilities
4. Save the model and assign it to **Design agent**

You can configure multiple reusable models and separately assign models for design work, reviews, fast tasks, and image input. Models using the same provider connection reuse its stored credential.

The chat composer grows with multiline prompts. Type `@` to mention a layer, page, or skill, or use the selection button to mention the selected layers, and `/` at the start of a message to run a skill, or one of an ACP agent's commands. Mentions show as chips, in replies too, where the assistant names the layers it touched; click one to show the layer on the canvas. Assistant messages show provider reasoning in collapsible sections and provide a per-response copy action. Image attachments remain available for visual references when a Vision model is configured. Streaming responses use a hardened Markdown renderer with Shiki-highlighted code blocks; unsafe link protocols and embedded data images are blocked.

## Agent Sessions

A coding agent runs its sessions with a model, a reasoning effort, and a mode. The composer offers the model, reasoning effort, and mode that Claude Code, Codex, Gemini CLI, and omp advertise for their sessions. A choice applies to the running session at once and to later sessions with that agent, except modes that skip permission requests, which apply to one session only.

On the desktop, each chat can give its coding agent a project folder to work in, chosen from the chat header and confirmed first. Sessions there start in the agent's default mode, and only the chosen model and reasoning effort carry over.

## Step limit

In **Settings → Models → Chat**, set **Maximum steps per message** to a whole number from 1 to 1,000. The default is 50. Press Enter or leave the field to save a valid value; invalid drafts do not replace the saved preference. Higher limits allow longer tool-driven tasks but can increase latency and provider cost.

The built-in AI captures this limit when each message starts. Stopping, remaining-step warnings, and the **Continue** action use that same budget. Changing it does not interrupt an ongoing request; the next message or continuation uses the new limit. A step is one model iteration and can include multiple tool calls. ACP and Pi agents manage their own limits.

## Tool access

Open **Settings → Tool access** to choose which tools direct AI model connections can use. Search by name or description, expand read-only or side-effect groups, and toggle individual tools or an entire group. Group switches affect all tools in that group, not only search results. **Restore defaults** restores the default tool set: the core editing and inspection tools, the library tools (`get_components`, `list_libraries`, `insert_library_component`), comments, variables, `lint` and `lint_fix`, `export_image`, `list_pages`, and `create_page`. Extended tools such as `create_component` can be enabled individually.

Preferences are saved locally and apply to the next message, including in an existing conversation. They do not change an already-running request. Enabling many tools increases the schemas sent to the model.

The **Local MCP** segment has independent settings for clients connected to Pairdraw's MCP server, including ACP and Pi agents. Restart the server and reconnect stdio clients after changing those settings. Remote MCP connections, WebMCP access, and Pi's shell/filesystem permissions remain separate.

Tool toggles control which tools are offered, not which operations scripts may perform. An enabled `eval` or other script-capable tool can perform design operations whose dedicated tools are disabled; these switches are not a sandbox.

## Skills

Skills are folders with a `SKILL.md` in the [Agent Skills](https://agentskills.io/specification) format: instructions for a kind of work, with optional reference files. The built-in AI sees each enabled skill's name and description and loads its instructions when a request matches. It can read the skill's files, but scripts in a skill do not run.

Open **Settings → Skills** to see where skills come from:

- **Uploaded**: upload a ZIP of a skill's folder or a single `SKILL.md`. Uploads stay in Pairdraw and work in the browser too.
- **Next to this document** (desktop): `.agents/skills` and `.claude/skills` folders from the open document's folder up to its repository. They stay off until you choose **Trust folder**, because a skill gives the AI instructions it follows.
- **Built-in**: skills that ship with Pairdraw. Guides for landing pages, mobile apps, web apps, dashboards, slides, design systems, and Tailwind CSS v4, and skills that work on an existing design: `layout`, `restyle`, `dark-mode`, and `design-review`. They are on from the start, work in the browser too, and give way to a skill of yours with the same name.
- **Shared agent skills** and **Claude Code skills** (desktop): `~/.agents/skills` and `~/.claude/skills`, where other coding agents install skills. Most of those are coding workflows, so these folders start off; the review step of the AI setup lists their skills for you to pick the ones that help with design.

Uploads are on as soon as you add them, and any folder or skill can be switched on or off. The page lists them as Tool access lists tools: each source is a group with its own switch, and each skill has a switch beside it. Open a skill to read its instructions, see its files, or check warnings about how it departs from the specification. When two skills share a name, the first in that order is used.

To run a skill yourself, type `/` at the start of a message and pick it, or choose it from **Pick a skill**, the book button under the message field; either starts the message with `/skill:name`, replacing a skill picked before. Pi gets the enabled skills as its own. ACP agents such as Claude Code and Codex load their own skills.

## Saved Conversations

Use **Conversation history** to return to a saved chat, start a **New chat**, or rename or delete a conversation. History and attachment previews are stored locally; **All chats** lets you browse transcripts from other documents.

A conversation belonging to another document is read-only until you open that document. A saved agent transcript is not a guarantee that its external agent session can resume: when resumption is unavailable, start a new chat. Local history is not cloud synchronization or a backup.

In the Chat settings beside the model overview, choose whether reasoning is **Collapsed by default**, **Expand while thinking**, or **Expanded by default**. Disclosure animations follow the app's reduced-motion preference. Expanding older reasoning does not force the conversation to scroll to the bottom.

## Supported Providers

| Provider                 | Models                                                                 | Setup                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **OpenRouter**           | Claude, GPT, Gemini, DeepSeek, Qwen, and others                        | API key from [openrouter.ai](https://openrouter.ai)                                                         |
| **Anthropic**            | Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1, Claude Haiku 5.5 | API key from [console.anthropic.com](https://console.anthropic.com)                                         |
| **OpenAI**               | GPT-6.1 Sol, GPT-6 Astra, GPT-6 Luna                                   | API key from [platform.openai.com](https://platform.openai.com)                                             |
| **ChatGPT**              | The models your ChatGPT plan offers in Codex, listed live              | Desktop app: **Sign in with ChatGPT**. Replies count toward the plan's usage limits.                        |
| **Google AI**            | Gemini 3.8 Flash, Gemini 4 Argon                                       | API key from [aistudio.google.dev](https://aistudio.google.dev)                                             |
| **DeepSeek**             | DeepSeek Flash, DeepSeek V4 Pro                                        | API key from [platform.deepseek.com](https://platform.deepseek.com/api_keys)                                |
| **Z.ai**                 | GLM-5.3, GLM-5.3-Flash, GLM-5.3-FlashX, GLM-5V-Turbo                   | API key from [docs.z.ai](https://docs.z.ai/devpack/quick-start)                                             |
| **MiniMax**              | MiniMax-M3.1-Flash, MiniMax-M3                                         | API key from [platform.minimax.io](https://platform.minimax.io/user-center/basic-information/interface-key) |
| **xAI**                  | Grok 4.7, Grok 4.6, Grok Build 0.1                                     | API key from [console.x.ai](https://console.x.ai)                                                           |
| **Meta**                 | Muse Spark 1.3, Muse Wonder                                            | API key from [dev.meta.ai](https://dev.meta.ai)                                                             |
| **Kimi For Coding**      | Kimi K3.1 Pro, Kimi K3.1 Pro Highspeed, Kimi For Coding                | Kimi Code plan API key from [kimi.ai](https://www.kimi.ai/code/console). Desktop app only.                  |
| **Moonshot AI**          | Kimi K3.1 Pro, Kimi K3.1 Pro Highspeed, Kimi K3                        | API key from [platform.moonshot.ai](https://platform.moonshot.ai/console/api-keys)                          |
| **Together AI**          | Kimi K3, DeepSeek V4.1 Flash, GLM-5.3, Muse Spark Open                 | API key from [together.ai](https://api.together.ai/settings/api-keys)                                       |
| **Fireworks AI**         | Kimi K3, DeepSeek V4.1 Flash, GLM 5.3, MiniMax-M3.1-Flash              | API key from [fireworks.ai](https://app.fireworks.ai/settings/users/api-keys)                               |
| **OpenCode Zen**         | Kimi K3, DeepSeek V4.1 Flash, GLM-5.3, Big Pickle                      | API key from [opencode.ai](https://opencode.ai/auth). Desktop app only.                                     |
| **OpenCode Go**          | Kimi K3.1 Pro, MiniMax M3.1 Flash, GLM-5.3, DeepSeek V4.1 Flash        | Go plan API key from [opencode.ai](https://opencode.ai/auth). Desktop app only.                             |
| **OpenAI-compatible**    | Any endpoint with OpenAI API format                                    | Custom base URL + key. Supports Completions and Responses API toggle.                                       |
| **Anthropic-compatible** | Any endpoint with Anthropic API format                                 | Custom base URL + key                                                                                       |
| **Amazon Bedrock**       | Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1, Claude Haiku 5.5 | Region plus a Bedrock API key, or AWS access keys in the desktop app                                        |
| **Google Vertex AI**     | Claude Sonnet 5.5, Claude Opus 5.5, Gemini 3.8 Flash, Gemini 4 Argon   | Project and location plus an access token; an API key reaches Gemini only                                   |

No backend — your key or sign-in talks directly to the provider. Browser requests are subject to each provider's CORS policy, and model deployments vary in how reliably they stream tool calls. See [BYOK provider and model compatibility](./byok-provider-compatibility) for measured results and reproduction steps.

The xAI, Meta, Kimi For Coding, Moonshot AI, Together AI, Fireworks AI, and OpenCode presets use each provider's OpenAI-compatible chat endpoint, so only the base URL and the recommended models differ; the full model list comes from models.dev. OpenCode Zen and Go list only the models they serve through that endpoint, so Claude, GPT, and Gemini models there are left out: use the Anthropic, OpenAI, or Google AI provider for those. Kimi For Coding and both OpenCode presets send no CORS headers, so they work in the desktop app only.

**Amazon Bedrock** reaches Claude through Bedrock's Messages API at `bedrock-mantle.<region>.api.aws`, under Bedrock's `anthropic.` model IDs; a custom model ID can name an inference profile such as `us.anthropic.claude-opus-5-5`. Choose the region, then sign in with a Bedrock API key or, in the desktop app, with an access key ID, secret access key, and optional session token, which sign each request with AWS Signature Version 4. Browsers do not let Bedrock's CORS answer cover the signature header, so the browser app takes API keys only.

**Google Vertex AI** serves Claude through `:rawPredict` and Gemini through `:generateContent` in one Google Cloud project. Enter the project ID and a location (`global`, `us`, `eu`, or a single region; single regions serve only older Claude models), and paste an access token from `gcloud auth print-access-token`. Access tokens expire after an hour, so paste a new one when requests start failing. An API key without a project uses Vertex AI express mode, which serves Gemini models only.

**OpenRouter** can be connected in guided setup by signing in instead of pasting a key: OpenRouter creates a key for Pairdraw, which is stored like any other key. In the desktop app the sign-in opens the system browser and returns to a port on this computer that the system picks (`http://localhost:<port>/oauth/openrouter`), so no web page outside your computer is involved; the browser app signs in in a popup, so allow popups for it.

**ChatGPT** uses your ChatGPT plan instead of an API key, through the same backend and sign-in as OpenAI's Codex CLI. Signing in opens the browser and returns to the desktop app on `localhost:1455`, the only address OpenAI accepts for it, so close a running `codex login` first. The sign-in is stored like a key and refreshes itself; the model list comes from your account. The browser app does not offer it.

## External MCP connections

The built-in chat and coding agents can use trusted [Model Context Protocol](https://modelcontextprotocol.io/) servers besides Pairdraw's own. In **Settings → MCP**, under MCP connections, add a named connection and enable it:

- **Remote server**: a Streamable HTTP endpoint with no authentication, a bearer token, or **OAuth sign-in** for hosted servers such as Notion or Linear. Save the connection, then click **Sign in**; the server's sign-in page opens in a popup in the web app or in the system browser on the desktop. The app registers itself with the server's authorization server, uses PKCE, and refreshes the tokens it receives.
- **Local command** (desktop app only): a program that speaks MCP over stdin and stdout, such as `npx` with `-y`, `@modelcontextprotocol/server-filesystem`, and a folder as arguments, one per line, plus optional `NAME=value` environment variables. The first time a command line runs, the app asks in a system dialog; it asks again when the program, an argument, or a variable name changes. Variables that choose the program or load code into it, such as `PATH`, `NODE_OPTIONS`, or `LD_PRELOAD`, are refused.

The direct API chat lists each enabled server's tools with every message and offers them to the model as `mcp__<server>__<tool>`. A server that does not answer is left out of that message and tried again a minute later, and a local command you declined is not asked about again until you change its connection. All chats share the connections, which stay open while a reply runs and close after a few idle minutes. While the chat asks before actions (**Settings → AI**), a call to an external tool that its server does not mark as read-only asks first too. External tools are turned on and off with their connection, not in the list of Pairdraw's own tools. On the desktop, ACP agents receive the same connections when their session starts; a local command is passed to an agent only after you approve it in the same system dialog, and the web app passes none. Pi receives the remote connections. Bearer tokens, OAuth sign-ins, and variables are kept in the configured credential backend rather than ordinary settings. **Test connection** connects once and reports how many tools the server offers.

In the web app a remote server must allow requests from the app's origin (CORS); the desktop app connects through its own HTTP client.

Remote servers must use HTTPS. Loopback HTTP endpoints are accepted for local development. Review and trust a server before enabling it: its tools may read external data or perform actions with the credentials you provide. Pairdraw's built-in design MCP server remains attached automatically and does not need to be added here.

## What It Can Do

The configurable tool catalog covers these categories; the tools offered to a model depend on your Tool access settings:

- **Create** — frames, shapes, text, components, pages. Renders JSX for complex layouts.
- **Style** — fills, strokes, effects, opacity, corner radius, blend modes.
- **Layout** — auto-layout, grid, alignment, spacing, sizing.
- **Components** — create components, instances, component sets, and slots. Manage overrides. Give components Reka UI behaviours so they work in preview.
- **Variables** — create/edit variables, collections, modes. Bind to fills.
- **Query** — find nodes, XPath selectors, read properties, list pages, fonts, selection.
- **Inspect** — `get_jsx` for JSX roundtrip view, `diff_create` and `diff_jsx` for structural diffs, `diff_visual` for pixel diffs, `describe` for semantic role and design issue detection.
- **Analyze** — color palette, typography audit, spacing consistency, cluster detection.
- **Export** — PNG, SVG, JSX with Tailwind classes. Vision-based verification via `export_image`.
- **Vector** — boolean operations, path manipulation.

## Exploring variants

**Let it cook**, the chef's hat under the message field, explores a request instead of answering it once:

- **Variants** asks for two to six designs side by side, each a new top-level frame to the right of everything on the page. Choose whether they explore **Layout** (structure and arrangement, one visual style) or **Style** (colors, type, and imagery, one layout). With a layer selected or mentioned, the variants start from it and leave it as it was.
- **Don't iterate** asks for one design in a single pass, without the review and rework the assistant otherwise does.

The choice stays on for the next messages, and the button shows it, until you set it back to **Off**.

## Notes for AI

Select a layer and add **Notes for AI** at the bottom of the Design panel. **Context** tells agents what the layer means or does, such as "opens the sign-up dialog"; **Prompt** is a request about the layer that **Run prompt** sends to the chat. A message carries the notes of the layers it concerns: the ones it mentions and the selection, or the whole page when there are none. Agents respect the context and act on a prompt only when asked. Notes are saved in the file with the layer, and the `context` notes and prompt cards of a `.pen` file are read the same way.

## Visual Verification

The assistant can verify its work visually. With `export_image`, on by default, it can capture a screenshot after creating or modifying designs and checks the result against the original request. This catches layout issues, missing elements, and color mismatches that text-only responses would miss. `diff_visual`, enabled by default, compares an edited node with a reference copy and returns the changed pixels and region, so the assistant can confirm an edit stayed within its target.

## Messages while the assistant works

You can keep typing while a reply runs. **Enter** sends the message as soon as the current step's tool calls finish, so the built-in AI can change course without being stopped; **Alt+Enter** waits until it has finished all work. Waiting messages show dimmed below the reply, with a button to remove each. **Escape** stops the reply and sends what is waiting at once, and **Up** on the first line takes waiting messages back to edit. ACP agents and Pi take a waiting message once their turn ends.

## Stopping a reply

**Stop** ends a reply at once. A tool call already running finishes, and its edit counts as part of the reply; calls still waiting for their turn change nothing. The reply is marked _Stopped_, its reasoning and any unfinished calls stop showing as running, and your next message tells the assistant whether those calls changed the document.

## Undoing the assistant's edits

Each tool call that changes the document is one step in Edit → Undo. Undoing it with <kbd>⌘</kbd><kbd>Z</kbd> marks the call _Undone_ in the chat. A reply with only some edits undone says how many; one with all of them undone is dimmed and marked _Changes reverted_. Redo removes the marks. The marks are saved with the conversation.

**Revert changes** on a reply undoes its edits while nothing has been edited since, and **Restore changes** brings undone edits back while Redo still can. **Regenerate** and editing your last message undo the replaced reply's edits first when they can.

Your next message tells the assistant which of its edits you undid or redid, so it does not build on edits that are gone. If you undo the assistant's edits while it is still working, it hears about it with its next tool call.

## Following the assistant

With **Follow agents** on, the crosshair button at the top of the AI chat, your view follows the assistant while it works, including to another page when it edits layers there. Following ends when the reply finishes, is stopped, or fails. Clicking, scrolling, zooming, switching pages, or Escape stops following yourself.

## Watching the assistant draw

While an agent edits the open page, whether the built-in chat or a coding agent over MCP, the canvas shows its work: each layer it adds traces in, one after another, layers it changes flash, and the frames it works in shimmer inside a violet outline. When it stops, they flash once and a notice counts the layers it added and changed; **Show** selects them and zooms to them. The motion is drawn over the canvas and never changes the document. Turn it off with **Animate AI edits** in **Settings → Models → Chat**; it also stays off while **Animations** is off, the system asks for reduced motion, or Ultralight mode is on, and the edits then simply appear.

## Notifications

When an agent asks for permission and you have not answered for a few seconds, Pairdraw sends a system notification, so you can work in another app while it runs. **Settings → Notifications** also turns on notifications when a reply finishes or fails. They are sent only while Pairdraw is in the background or shows another document, and clicking one opens that document's chat. In the browser, click **Allow notifications** there first; the desktop app follows your system's notification settings.

## Example Prompts

- "Create a card with a title, description, and a blue button"
- "Make all buttons on this page use the same border radius"
- "What fonts are used in this file?"
- "Change the background of the selected frame to a gradient from blue to purple"
- "Export the selected frame as SVG"
- "Find all text nodes with font size less than 12"
- "Describe the selected component — what role does it look like?"
- "Show me the JSX for this frame"
- "Make this component a switch that I can try in preview"

## Tips

- Select nodes before asking — the assistant knows what's selected.
- Be specific about colors, sizes, and positions for precise results.
- The assistant can modify multiple nodes in one message.
- You can browse other pages while a reply runs: the assistant keeps working on the page where the message started, and its previews show when you return. While you're away, the chat says which page it is working on, with **Go to page** to return.
- Undo anything you don't like with Edit → Undo or **Revert changes**; the chat and the assistant both see it.
- All layout is recomputed automatically after each tool execution.
