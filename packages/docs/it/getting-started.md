# Primi passi

## Versione web

Pairdraw funziona anche nel browser, ma non esiste una versione ospitata: avvia l’app web da una copia del repository come descritto in [Compilazione dal codice sorgente](#building-from-source), oppure [scarica l’applicazione desktop](/it/download).

Se vuoi creare un prodotto basato su Pairdraw invece di utilizzare soltanto l'applicazione predefinita, consulta la sezione [Automazione e API](/it/programmable/) e la documentazione del [Vue SDK](/it/programmable/sdk/).

## Applicazione desktop

La [pagina dei download](/it/download) elenca i file dell’ultima versione. Pairdraw 0.16.0 è pubblicato per macOS su Apple Silicon:

| Piattaforma           | File                      |
| --------------------- | ------------------------- |
| macOS (Apple Silicon) | `.dmg` / `.zip` (aarch64) |

Windows, Linux e i Mac Intel non hanno ancora una versione pronta; compilali dal codice sorgente come descritto più sotto. La versione per macOS non è ancora firmata né notarizzata, quindi macOS ne blocca il primo avvio: fai clic destro su Pairdraw in Applicazioni e scegli **Apri**, oppure consentilo in **Impostazioni di Sistema → Privacy e sicurezza**. Ogni versione include un file `SHA256SUMS` per verificare i download.

Per cercare una versione più recente dell’applicazione desktop, scegli **Check for Updates…** nel menu **Help** su Windows e Linux, o nel menu dell’applicazione su macOS. La voce **About** accanto mostra la versione installata. Solo una versione pronta che indica un canale di aggiornamento cerca gli aggiornamenti, e solo quando scegli la voce; una versione compilata dal codice sorgente indica che gli aggiornamenti non sono configurati. Pairdraw 0.16.0 non indica alcun canale di aggiornamento, quindi installa a mano la versione successiva dalla pagina dei download.

## Requisiti di sistema {#system-requirements}

Pairdraw esegue il rendering con CanvasKit su WebGL e usa funzionalità recenti della piattaforma web, quindi richiede un motore del browser aggiornato. L’app web supporta Chrome 111, Edge 111, Firefox 128 e Safari 16.4 o versioni successive; i browser basati su Chromium, come Brave e Opera, seguono la versione di Chrome. L’app desktop usa il WebView di sistema, quindi il requisito minimo dipende dal motore del sistema operativo:

| Piattaforma | Requisito                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| macOS       | macOS 13 Ventura o successivo con gli aggiornamenti correnti di Safari installati (Safari 16.4 è incluso in macOS 13.3). |
| Windows     | Windows 10 o successivo con il runtime Evergreen di Microsoft Edge WebView2, che si aggiorna da solo.                    |
| Linux       | WebKitGTK 2.40 o successivo (`webkit2gtk-4.1`).                                                                          |

Se il motore è troppo vecchio, Pairdraw mostra cosa aggiornare invece di una finestra vuota. Se vedi questo avviso su un sistema che soddisfa i requisiti, usa il link «Report a problem», che precompila i dettagli di browser e motore.

## Compilazione dal codice sorgente {#building-from-source}

### Requisiti

- [Bun](https://bun.sh/) come runtime e package manager;
- [Rust](https://rustup.rs/) soltanto per l'applicazione Tauri.

### Installazione

```sh
git clone https://github.com/BadryansahBangsawan/pairdraw.git
cd pairdraw
bun install
```

### Server di sviluppo

```sh
bun run dev
```

L'editor sarà disponibile all'indirizzo `http://localhost:1420`.

### Comandi

| Comando                         | Funzione                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `bun run dev`                   | Avvia il server di sviluppo con HMR                                                |
| `bun run build`                 | Genera la versione di produzione                                                   |
| `bun run check`                 | Esegue oxlint e controlla i tipi con TypeScript 7                                  |
| `bun run test`                  | Esegue i test E2E e di regressione visiva con Playwright                           |
| `bun run test:update`           | Aggiorna gli screenshot di riferimento                                             |
| `bun run test:unit`             | Esegue gli unit test con bun:test                                                  |
| `bun run docs:dev`              | Avvia il server di sviluppo della documentazione                                   |
| `bun run docs:build`            | Genera rapidamente la documentazione per la verifica locale                        |
| `bun run docs:build:production` | Genera la documentazione completa per la pubblicazione, inclusi i file per gli LLM |

## Applicazione Tauri

Per compilare l'applicazione Tauri sono necessari Rust e i componenti di sistema specifici della piattaforma.

### macOS

```sh
xcode-select --install
cargo install tauri-cli --version "^2"
bun run tauri dev
```

### Windows

1. Installa [Rust](https://rustup.rs/) con il toolchain `stable-msvc`:
   ```sh
   rustup default stable-msvc
   ```
2. Installa [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) e seleziona il workload **Desktop development with C++**.
3. WebView2 è già incluso in Windows 10 dalla versione 1803 e in Windows 11.
4. Esegui:
   ```sh
   bun run tauri dev
   ```

### Linux

In Debian o Ubuntu, installa le dipendenze di sistema:

```sh
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Quindi esegui:

```sh
bun run tauri dev
```

### Generare un pacchetto di installazione

```sh
bun run tauri build                                    # Piattaforma corrente
bun run tauri build --target universal-apple-darwin    # Universal Binary per macOS
```
