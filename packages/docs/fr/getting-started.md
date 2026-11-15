# Premiers pas

## Version web

Pairdraw fonctionne aussi dans le navigateur, mais aucune version n’est hébergée : lancez l’app web depuis une copie du dépôt comme indiqué dans [Compiler le code source](#building-from-source), ou [téléchargez l’application de bureau](/fr/download).

Si vous souhaitez développer votre propre produit avec Pairdraw plutôt que vous limiter à l'application par défaut, consultez la section [Automatisation](/fr/programmable/) et la documentation du [Vue SDK](/fr/programmable/sdk/).

## Application de bureau {#download-desktop-app}

La [page de téléchargement](/fr/download) liste les fichiers de la dernière version. Pairdraw 0.16.0 est publié pour macOS sur Apple Silicon :

| Plateforme            | Fichier                   |
| --------------------- | ------------------------- |
| macOS (Apple Silicon) | `.dmg` / `.zip` (aarch64) |

Windows, Linux et les Mac Intel n’ont pas encore de version prête à l’emploi ; compilez-les à partir des sources comme décrit plus bas. La version macOS n’est pas encore signée ni notarisée, donc macOS bloque le premier lancement : faites un clic droit sur Pairdraw dans Applications et choisissez **Ouvrir**, ou autorisez-le dans **Réglages Système → Confidentialité et sécurité**. Chaque version fournit un fichier `SHA256SUMS` pour vérifier les téléchargements.

Pour rechercher une version plus récente de l’application de bureau, choisissez **Check for Updates…** dans le menu **Help** sous Windows et Linux, ou dans le menu de l’application sous macOS. L’élément **About** voisin affiche la version installée. Seule une version prête à l’emploi qui déclare un flux de mises à jour en recherche, et uniquement quand vous choisissez cet élément ; une version compilée à partir des sources indique que les mises à jour ne sont pas configurées. Pairdraw 0.16.0 ne déclare aucun flux de mises à jour : installez donc la version suivante à la main depuis la page de téléchargement.

## Configuration requise {#system-requirements}

Pairdraw affiche le rendu avec CanvasKit sur WebGL et s’appuie sur des fonctionnalités récentes de la plateforme web ; il faut donc un moteur de navigateur récent. L’application web prend en charge Chrome 111, Edge 111, Firefox 128 et Safari 16.4 ou version ultérieure ; les navigateurs basés sur Chromium, comme Brave et Opera, suivent leur version de Chrome. L’application de bureau s’affiche dans la WebView du système : le minimum dépend donc du moteur du système d’exploitation.

| Plateforme | Configuration requise                                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| macOS      | macOS 13 Ventura ou version ultérieure, avec les dernières mises à jour de Safari installées (Safari 16.4 est fourni avec macOS 13.3). |
| Windows    | Windows 10 ou version ultérieure, avec le runtime Evergreen de Microsoft Edge WebView2, qui se met à jour seul.                        |
| Linux      | WebKitGTK 2.40 ou version ultérieure (`webkit2gtk-4.1`).                                                                               |

Lorsque le moteur est trop ancien, Pairdraw indique ce qu’il faut mettre à jour au lieu d’afficher une fenêtre vide. Si cet avis apparaît sur un système conforme, utilisez son lien « Report a problem », qui préremplit les informations sur le navigateur et le moteur.

## Compiler le code source {#building-from-source}

### Prérequis

- [Bun](https://bun.sh/) comme runtime et package manager ;
- [Rust](https://rustup.rs/) uniquement pour l'application Tauri.

### Installation

```sh
git clone https://github.com/BadryansahBangsawan/pairdraw.git
cd pairdraw
bun install
```

### Serveur de développement

```sh
bun run dev
```

L'éditeur sera accessible à l'adresse `http://localhost:1420`.

### Commandes

| Commande                        | Rôle                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| `bun run dev`                   | Démarrer le serveur de développement avec HMR                                               |
| `bun run build`                 | Générer la version de production                                                            |
| `bun run check`                 | Exécuter oxlint et vérifier les types avec TypeScript 7                                     |
| `bun run test`                  | Exécuter les tests E2E et de régression visuelle avec Playwright                            |
| `bun run test:update`           | Mettre à jour les captures de référence                                                     |
| `bun run test:unit`             | Exécuter les tests unitaires avec bun:test                                                  |
| `bun run docs:dev`              | Démarrer le serveur de développement de la documentation                                    |
| `bun run docs:build`            | Générer rapidement la documentation pour la vérifier en local                               |
| `bun run docs:build:production` | Générer la documentation complète pour publication, y compris les fichiers destinés aux LLM |

## Application Tauri

La compilation de l'application Tauri nécessite Rust et les composants système propres à chaque plateforme.

### macOS

```sh
xcode-select --install
cargo install tauri-cli --version "^2"
bun run tauri dev
```

### Windows

1. Installez [Rust](https://rustup.rs/) avec le toolchain `stable-msvc` :
   ```sh
   rustup default stable-msvc
   ```
2. Installez [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) et sélectionnez le workload **Desktop development with C++**.
3. WebView2 est déjà inclus dans Windows 10 à partir de la version 1803 et dans Windows 11.
4. Exécutez :
   ```sh
   bun run tauri dev
   ```

### Linux

Sous Debian ou Ubuntu, installez les dépendances système :

```sh
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Exécutez ensuite :

```sh
bun run tauri dev
```

### Générer un package d'installation

```sh
bun run tauri build                                    # Plateforme actuelle
bun run tauri build --target universal-apple-darwin    # Universal Binary pour macOS
```
