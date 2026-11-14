---
title: Privacy
description: Pairdraw sends no usage data. What it connects to over the network, and when.
---

# Privacy

- Pairdraw sends no usage data: no daily ping, no analytics, and no usage statistics, from any build.
- Your designs, file names, layer names, text, prompts, and keys never leave your device unless you share or sync them yourself.
- **Settings → Usage** and **Settings → Diagnostics** keep their records on this device and never send them.

## Network requests

Pairdraw is local-first, but some features reach the network. The desktop app checks for updates on its own; everything else below connects only when you use that feature, and only to the service named.

| Feature                 | Where it connects                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Update checks (desktop) | GitHub Releases, for the latest version number                                                                                                                                                          |
| AI chat and image tools | The provider you configure, with your own key; the model list comes from models.dev. With **Pairdraw Cloud** as the provider, the AI service your Cloud server names, with a token for your workspace |
| Collaboration rooms     | Other people in the room directly; public brokers introduce peers, and a TURN relay carries traffic when a direct connection is not possible                                                            |
| Cloud storage           | The storage provider you configure                                                                                                                                                                      |
| Fonts                   | Google Fonts, which can supply a font a document uses that is not installed                                                                                                                             |
| Icons                   | The Iconify API, when you search or insert icons                                                                                                                                                        |
| Stock photos            | Unsplash or Pexels, with your own key, when you search them or place one of their photos                                                                                                                |

The app and this page are open source, so you can check every request it makes in [the repository](https://github.com/BadryansahBangsawan/pairdraw).
