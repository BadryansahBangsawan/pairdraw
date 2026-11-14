---
title: Headless agents
description: Run a design agent, or a team of them, on a document file through an OpenAI-compatible model.
---

# Headless agents

`pairdraw agent run` drives a document from a model without opening the editor. The model calls the same Core tools the app and MCP server expose, against a document loaded from disk, and saves the result when asked.

## Basic usage

```sh
pairdraw agent run "Add a pricing section under the hero" design.fig \
  --base-url https://api.openai.com/v1 \
  --model gpt-4.1 \
  --output design.agent.fig
```

The API key comes from `--api-key` or `PAIRDRAW_API_KEY`. Passing it by environment keeps it out of shell history and process listings.

Without `--output` or `--write` the run is a dry run: the model works on the document in memory and nothing is written. `--write` saves over the input file; `--output` writes a new one.

`--max-steps` caps model turns (default 25, at most 1000). Each tool call counts toward that ceiling, and a tool result warns the model when the budget is nearly spent.

## Permissions

A run offers the document tools a design session needs and nothing more:

- `eval` is never offered. Scripting stays a separate command you invoke yourself.
- Tools that reach the network or write settings stay withheld until `--allow` names them, such as `stock_photo` or `generate_image`.
- `--deny` withholds a tool the run would otherwise offer.

```sh
pairdraw agent run "Replace the hero photo" design.fig \
  --base-url http://127.0.0.1:11434/v1 --model qwen3 \
  --allow stock_photo --deny delete_node --write
```

Every file a tool writes, and the `--output` path, must stay inside `--root` — the working directory by default, the home directory on Windows. A path that leaves it, directly or through a symlink, is refused, and the model is told why instead of the run failing.

`pairdraw agent tools --json` lists the tools a run offers by default.

## Teams

`--agents` runs several named agents over the same document, in order, and each one sees what the agents before it reported:

```sh
pairdraw agent run "Fix the checkout page" design.fig \
  --base-url https://api.openai.com/v1 --model gpt-4.1 \
  --agents designer,reviewer --output design.agent.fig
```

`pairdraw agent list --json` lists them:

|Agent|What it does|
|---|---|
|`designer`|Edits with every tool the run offers. The default.|
|`reviewer`|Reads the document and reports what needs changing; it cannot edit.|
|`typesetter`|Corrects text content and text properties only, within 12 turns.|

An agent only narrows the run. Its tools are the run's tools intersected with its role, so `--deny`, the `eval` exclusion, and the network rule hold for every agent, and naming an agent never grants a tool the run withheld. An unknown name fails the run rather than quietly running a different agent.

`--json` prints the run as one object: the last agent's `text`, the total `steps`, every `tools` call with `ok` and `error`, a `rounds` entry per agent, and `output` when the document was saved.
