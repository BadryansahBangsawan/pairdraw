---
title: Privacy
description: Pairdraw sends no usage data. What it connects to over the network, and when.
---

# Privacy

- Pairdraw sends no usage data: no daily ping, no analytics, no usage statistics, and no crash reports, from any build.
- Your designs, file names, layer names, text, prompts, and keys never leave your device unless you send them to a service yourself, such as an AI provider, your storage bucket, or a Cloud server.
- **Settings → Usage** and **Settings → Diagnostics** keep their records on this device and never send them.

## Network requests

Pairdraw is local-first. The features below connect only when you use them, and only to the service named.

| Feature                 | Where it connects                                                                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Update checks (desktop) | When you choose **Check for Updates…**, the update feed its release names, by default the repository's GitHub Releases. Pairdraw 0.16.0 and builds from source name no feed and make no request                          |
| AI chat and image tools | The provider you configure, with your own key; the model list comes from models.dev. In the desktop app, signing in to OpenRouter or ChatGPT returns to a port on this computer, with no relay page in between. With **Pairdraw Cloud** as the provider, the AI service your Cloud server names |
| Coding agents           | Claude Code, Codex, Gemini CLI, or Pi run on your computer and talk to their own services under your own subscription                                                                                                        |
| Pairdraw Cloud          | Only the Cloud servers you connect in **Settings → Cloud**; there is no default server                                                                                                                                      |
| Cloud storage           | The storage provider you configure                                                                                                                                                                                           |
| Fonts                   | Google Fonts, which can supply a font a document uses that is not installed, and the font catalogs you enable                                                                                                                |
| Icons                   | The Iconify API, when you search or insert icons                                                                                                                                                                             |
| Stock photos            | Unsplash or Pexels, with your own key, when you search them or place one of their photos                                                                                                                                     |
| Built-in browser        | The `http` and `https` pages you open in it                                                                                                                                                                                  |

The app and this page are open source, so you can check every request it makes in [the repository](https://github.com/BadryansahBangsawan/pairdraw).
