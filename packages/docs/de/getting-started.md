# Erste Schritte

## Webversion

Pairdraw läuft auch im Browser, eine gehostete Version gibt es aber nicht: Starten Sie die Web-App aus einem Checkout, wie unter [Aus dem Quellcode erstellen](#building-from-source) beschrieben, oder [laden Sie die Desktop-Anwendung herunter](/de/download).

Wenn Sie ein eigenes Produkt auf Pairdraw aufbauen möchten, lesen Sie den Bereich [Automatisierung](/programmable/) und die Dokumentation zum [Vue SDK](/programmable/sdk/).

## Desktop-Anwendung

Die [Download-Seite](/de/download) listet die Dateien der neuesten Version. Pairdraw 0.16.0 erscheint für macOS mit Apple Silicon:

| Plattform             | Datei                     |
| --------------------- | ------------------------- |
| macOS (Apple Silicon) | `.dmg` / `.zip` (aarch64) |

Für Windows, Linux und Intel-Macs gibt es noch keine fertige Version; erstellen Sie sie wie unten beschrieben aus dem Quellcode. Die macOS-Version ist noch nicht signiert oder notarisiert, daher blockiert macOS den ersten Start: Klicken Sie in „Programme“ mit der rechten Maustaste auf Pairdraw und wählen Sie **Öffnen**, oder erlauben Sie es unter **Systemeinstellungen → Datenschutz & Sicherheit**. Jede Version enthält eine Datei `SHA256SUMS`, mit der Sie Downloads prüfen können.

Nach einer neueren Version der Desktop-Anwendung suchen Sie unter Windows und Linux im Menü **Help** mit **Check for Updates…**, unter macOS im Anwendungsmenü. Der Eintrag **About** daneben zeigt die installierte Version. Pairdraw 0.16.0 nennt keinen Update-Feed; installieren Sie die nächste Version daher von Hand über die Download-Seite.

## Systemvoraussetzungen {#system-requirements}

Pairdraw rendert mit CanvasKit über WebGL und nutzt aktuelle Webplattform-Funktionen, daher ist eine neuere Browser-Engine erforderlich. Die Webversion unterstützt Chrome 111, Edge 111, Firefox 128 und Safari 16.4 oder neuer; Chromium-basierte Browser wie Brave und Opera richten sich nach ihrer Chrome-Version. Die Desktop-Anwendung rendert im WebView des Systems, daher bestimmt die Engine des Betriebssystems die Untergrenze:

| Plattform | Voraussetzung                                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| macOS     | macOS 13 Ventura oder neuer mit den aktuellen Safari-Updates (Safari 16.4 wurde mit macOS 13.3 ausgeliefert).   |
| Windows   | Windows 10 oder neuer mit der Laufzeitumgebung Microsoft Edge WebView2 Evergreen, die sich selbst aktualisiert. |
| Linux     | WebKitGTK 2.40 oder neuer (`webkit2gtk-4.1`).                                                                   |

Ist die Engine zu alt, zeigt Pairdraw an, was aktualisiert werden muss, statt ein leeres Fenster darzustellen. Erscheint dieser Hinweis auf einem System, das die Voraussetzungen erfüllt, verwenden Sie den Link „Report a problem“, der die Angaben zu Browser und Engine vorausfüllt.

## Aus dem Quellcode erstellen {#building-from-source}

### Voraussetzungen

- [Bun](https://bun.sh/) als Runtime und Package Manager;
- [Rust](https://rustup.rs/) nur für die Tauri-Anwendung.

### Installation

```sh
git clone https://github.com/BadryansahBangsawan/pairdraw.git
cd pairdraw
bun install
```

### Entwicklungsserver

```sh
bun run dev
```

Der Editor ist anschließend unter `http://localhost:1420` erreichbar.

### Befehle

| Befehl                          | Zweck                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| `bun run dev`                   | Entwicklungsserver mit HMR starten                                                      |
| `bun run build`                 | Produktionsversion erstellen                                                            |
| `bun run check`                 | oxlint und Typprüfung mit TypeScript 7 ausführen                                        |
| `bun run test`                  | E2E- und visuelle Regressionstests mit Playwright ausführen                             |
| `bun run test:update`           | Referenz-Screenshots aktualisieren                                                      |
| `bun run test:unit`             | Unit-Tests mit bun:test ausführen                                                       |
| `bun run docs:dev`              | Entwicklungsserver der Dokumentation starten                                            |
| `bun run docs:build`            | Dokumentation schnell zur lokalen Prüfung erstellen                                     |
| `bun run docs:build:production` | Vollständige veröffentlichungsfähige Dokumentation einschließlich LLM-Dateien erstellen |

## Tauri-Anwendung

Zum Erstellen der Tauri-Anwendung werden Rust und plattformspezifische Systemkomponenten benötigt.

### macOS

```sh
xcode-select --install
cargo install tauri-cli --version "^2"
bun run tauri dev
```

### Windows

1. Installieren Sie [Rust](https://rustup.rs/) mit der Toolchain `stable-msvc`:
   ```sh
   rustup default stable-msvc
   ```
2. Installieren Sie die [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) mit der Workload **Desktop development with C++**.
3. WebView2 ist in Windows 10 ab Version 1803 und in Windows 11 bereits enthalten.
4. Führen Sie Folgendes aus:
   ```sh
   bun run tauri dev
   ```

### Linux

Installieren Sie unter Debian oder Ubuntu die Systemabhängigkeiten:

```sh
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Führen Sie anschließend aus:

```sh
bun run tauri dev
```

### Installationspaket erstellen

```sh
bun run tauri build                                    # Aktuelle Plattform
bun run tauri build --target universal-apple-darwin    # Universal Binary für macOS
```
