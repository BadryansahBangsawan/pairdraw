# Getting Started

## Web App

Pairdraw also runs in the browser, but there is no hosted copy: run the web app from a checkout as described in [Building from Source](#building-from-source), or [download the desktop app](/download).

If you want to build on top of it instead of only using the default app, see the [Programmable](/programmable/) section and the [Vue SDK](/programmable/sdk/).

## Download Desktop App

The [download page](/download) lists the files of the latest release. Pairdraw 0.18.0 is published for macOS on Apple Silicon:

| Platform              | Download                  |
| --------------------- | ------------------------- |
| macOS (Apple Silicon) | `.dmg` / `.zip` (aarch64) |

Windows, Linux, and Intel Macs have no release build yet; build them from source as described below. The macOS build is not signed or notarized yet, so macOS blocks its first launch: right-click Pairdraw in Applications and choose **Open**, or allow it in **System Settings → Privacy & Security**. Each release lists a `SHA256SUMS` file to check downloads against.

To check for a newer version of the desktop app, choose **Check for Updates…** in the **Help** menu on Windows and Linux, or in the application menu on macOS. The **About** item next to it shows the installed version. Only a release build that names an update feed checks for updates, and only when you choose the item; a build from source says updates aren't set up. Pairdraw 0.18.0 names no update feed, so install the next release from the download page by hand.

## System Requirements

Pairdraw renders with CanvasKit on WebGL and relies on current web platform features, so it needs a recent browser engine. The web app supports Chrome 111, Edge 111, Firefox 128, and Safari 16.4 or later; Chromium-based browsers such as Brave and Opera follow their Chrome version. The desktop app renders in the system WebView, so its floor is the operating system's engine:

| Platform | Requirement                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| macOS    | macOS 13 Ventura or later with the current Safari updates installed (Safari 16.4 shipped with macOS 13.3). |
| Windows  | Windows 10 or later with the Microsoft Edge WebView2 Evergreen runtime, which updates itself.              |
| Linux    | WebKitGTK 2.40 or later (`webkit2gtk-4.1`).                                                                |

When the engine is too old, Pairdraw shows what to update instead of a blank window. If you see that notice on a system that meets the requirements, use its "Report a problem" link, which prefills the browser and engine details.

## Building from Source

### Prerequisites

- [Bun](https://bun.sh/) (package manager and runtime)
- [Rust](https://rustup.rs/) (for desktop app only)

## Installation

```sh
git clone https://github.com/BadryansahBangsawan/pairdraw.git
cd pairdraw
bun install
```

## Development Server

```sh
bun run dev
```

Opens the editor at `http://localhost:1420`.

## Available Scripts

| Command                         | Description                                         |
| ------------------------------- | --------------------------------------------------- |
| `bun run dev`                   | Dev server with HMR                                 |
| `bun run build`                 | Production build                                    |
| `bun run check`                 | Lint (oxlint) + typecheck (TypeScript 7)            |
| `bun run test`                  | E2E visual regression (Playwright)                  |
| `bun run test:update`           | Regenerate screenshot baselines                     |
| `bun run test:unit`             | Unit tests (bun:test)                               |
| `bun run docs:dev`              | Documentation dev server                            |
| `bun run docs:build`            | Build documentation locally (fast validation build) |
| `bun run docs:build:production` | Build deployable documentation, including LLM files |

## Desktop App (Tauri)

The desktop app requires Rust and platform-specific prerequisites.

### macOS

```sh
xcode-select --install
cargo install tauri-cli --version "^2"
bun run tauri dev
```

### Windows

1. Install [Rust](https://rustup.rs/) with `stable-msvc` toolchain:
   ```sh
   rustup default stable-msvc
   ```
2. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++" workload
3. WebView2 is pre-installed on Windows 10 (1803+) and Windows 11
4. Run:
   ```sh
   bun run tauri dev
   ```

### Linux

Install system dependencies (Debian/Ubuntu):

```sh
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Then:

```sh
bun run tauri dev
```

### Build for Distribution

```sh
bun run tauri build                                    # Current platform
bun run tauri build --target universal-apple-darwin    # macOS universal
```
