# Pairdraw brand sources

- `mark.svg` is the Pairdraw symbol: one vector curve pulled by two anchors, an ink (`#17171C`) square for the person and a Pair Orange (`#FF5B2E`) circle for the agent. The square sits at the bottom-left with a transparent counter; the circle sits at the top-right end of the curve.
- `mark-micro.svg` is the 16px master. It keeps the main geometry; only its intrinsic size differs.
- Both use the same tight `24 24 208 208` viewBox, no `<title>`, and a `data-part` on every element (`square`, `curve`, `anchor`), which the generator uses to derive dark, monochrome, and tile artwork.
- Dark artwork turns the square and the curve white (`#FFFFFF`) and keeps the orange circle. Monochrome artwork is all ink or all white. The circle is orange in every color version.

Edit these SVGs, not generated files. Platform backgrounds, padding, and derived colors live in `tools/generate/brand/src/config.ts`, one `pairdraw` artwork for every target: the app, the desktop icons, and the docs. The official app-icon variant draws the whole mark in white on a Pair Orange rounded tile that fills the image, with transparency only at the rounded corners, in both themes. Native desktop assets retain their platform-specific outer margin. Desktop icons, any-purpose PWA icons, and larger in-app branding share this composition; use `BrandMark` with `variant="app-icon"` for those placements. Favicons use the same tile with the micro master inside, drawn larger so the square's counter still reads at 16px, in both browser themes. Generated `brand/app-icon.svg` and `brand/app-icon-1024.png` are suitable for profile images. For macOS 26 the desktop target also writes `desktop/icons/icon.icon`, an Icon Composer icon with the tile's white mark as its one flat layer and Pair Orange as its fill in the default and dark appearances, because without one macOS segments the ICNS and swaps the orange tile for a dark one; `tauri build` compiles it into `Assets.car` only when Xcode 26's `actool` is selected, and earlier macOS versions and builds without Xcode use `icon.icns`. Apple Touch keeps an opaque orange square for platform rounding; maskable artwork stays opaque and inside the central 80%-diameter safe circle.

## Generation

```sh
bun run generate:icons                    # All targets
bun run generate:icons --target web       # App/browser/PWA
bun run generate:icons --target docs      # Documentation
bun run generate:icons --target desktop   # Native PNG/ICO/ICNS
bun run generate:icons --force            # Ignore the content cache
bun run check:icons                       # Fresh generation, contracts, reproducibility, types
bun test tools/generate/brand/tests
```

Generation is local using pinned RealFaviconGenerator/Sharp and Tauri versions; no hosted generator or credentials are needed. Generated assets and the cache are ignored by Git. Only the artwork masters, settings, code, tests, and the normal Playwright visual baseline are tracked.

Vite ensures web assets before app dev/build. VitePress ensures docs assets before docs dev/build. Storybook prepares the assets for its stories. Tauri's dev/build hooks prepare native icons before compilation. Direct Cargo commands bypass those hooks: run `bun run generate:icons --target desktop` before `cargo check` or `cargo build` on a fresh checkout. CI's native-contract job does this explicitly. No icon generation runs in the shipped application.

Outputs are owned by `tools/generate/brand/src/config.ts`: `public/brand/`, `packages/docs/public/brand/`, the root ICO/Apple Touch files in each public directory, and `desktop/icons/`. The app's manifest remains in `vite/pwa/index.ts`; docs intentionally do not receive an installable-app manifest. Web assets never symlink into desktop output.

Preparation fingerprints the artwork, generator code/settings, lockfile and runtime/tool versions, verifies output hashes, and skips unchanged targets. Missing or corrupted outputs regenerate. A cross-process lock serializes concurrent builds; each file is published atomically and the cache is written last. Destination symlinks are rejected. Native ICNS frame ordering is normalized without re-encoding images.

## Review

Use the **Brand/Mark** Storybook stories for main, micro, dark, and monochrome appearances. `tests/e2e/brand/icons.spec.ts` checks the browser assets, app theme selection, and the main mark's visual baseline. Review intentional changes before updating its snapshot. Run at actual 16/24/32 pixel sizes as well as large sizes.

Do not mechanically replace generic pencil/tool icons or historical screenshots. Social artwork and external profile avatars are separate design/export tasks.
