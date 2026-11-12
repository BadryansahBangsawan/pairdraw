import { params } from "@nanostores/i18n";

import { i18n } from "#vue/i18n/create";

/** Shader Mode: one shader shown large, played, scrubbed, and tuned on its own. */
export const shaderMessageDefaults = {
  mode: "Shader Mode",
  open: "Open in Shader Mode",
  region: params("Shader Mode: {name}"),
  done: "Done",
  leave: params("Leave Shader Mode ({shortcut})"),
  play: "Play",
  pause: "Pause",
  restart: "Back to start",
  phase: "Animation phase",
  position: params("{time} of {duration}"),
  preview: "Shader preview",
  settings: "Shader settings",
  starting: "Starting the shader…",
  failed: "This shader could not play here, so its still frame is shown.",
  readOnly:
    "This document is read-only: the shader plays, but its settings cannot change.",
  inputs: "Inputs",
  bindInput: "Bind input",
} as const;

export const shaderMessages = i18n("shaders", shaderMessageDefaults);
