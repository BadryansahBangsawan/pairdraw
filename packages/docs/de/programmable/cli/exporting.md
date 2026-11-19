---
title: Export mit der CLI
description: Dokumentinhalte als Bilder, PDF, PowerPoint, draw.io, `.fig`, JSX, HTML oder Storybook-Stories exportieren, mit Regeln zur Schriftersetzung für Raster- und PDF-Ausgabe.
---

# Export mit der CLI

Die CLI exportiert Designs aus dem Terminal: Rasterbilder, Vektoren, PDF, bearbeitbares PowerPoint, draw.io-Diagramme, Teile eines Dokuments als `.fig`, JSX-Code, HTML oder Storybook-Stories.

Die App in Pairdraw-Builds bietet keinen Export nach PowerPoint oder draw.io mehr an; die CLI schreibt beide Formate weiterhin.

## Bildexport

```sh
pairdraw export design.fig                           # PNG (Standard)
pairdraw export design.fig -f jpg -s 2 -q 90        # JPG mit 2×, Qualität 90
pairdraw export design.fig -f webp -s 3             # WEBP mit 3×
pairdraw export design.fig -f svg                   # SVG-Vektor
pairdraw export design.fig -f pdf                   # PDF
pairdraw export design.fig -f pptx                  # bearbeitbares PowerPoint
pairdraw export design.fig -f drawio                # draw.io-Diagramm
pairdraw export design.fig -f fig --page "Page 1"   # eine Seite als .fig exportieren
pairdraw export design.fig -f fig --node 1:23        # ein Objekt als .fig exportieren
pairdraw export design.fig -f html --css tailwind    # HTML-Fragment mit Tailwind-Klassen
```

Optionen:

- `-f` – Format: `png`, `jpg`, `webp`, `svg`, `pdf`, `pptx`, `drawio`, `jsx`, `tailwind-jsx`, `html`, `fig`, `storybook`
- `-s` – Exportmaßstab (Standard: `1`)
- `-q` – Qualität: `0`–`100` (nur JPG/WEBP)
- `-o` – Ausgabepfad
- `--page` – Seitenname
- `--node` – ID eines bestimmten Objekts

## Regeln zur Schriftersetzung {#font-substitution-policy}

Für dateibasierte Exporte nach PNG, JPG, WEBP und PDF sowie für `pairdraw convert` legen Sie fest, wie mit fehlenden oder ersetzten Schriften umgegangen wird:

```sh
pairdraw export design.fig -f pdf --font-policy strict
pairdraw export design.fig -f png --font-policy warn
pairdraw export design.fig -f webp --font-policy allow
pairdraw convert design.pen --font-policy strict
```

- `warn` (Standard) – Ersetzungen melden und den Export fortsetzen.
- `strict` – mit einem Exit-Status ungleich null abbrechen, wenn die Schriftvorbereitung die angeforderten Schnitte nicht originalgetreu auflösen kann.
- `allow` – ohne die zusätzliche Prüfung der Schrifttreue exportieren.

Prüfen Sie die betroffenen Schnitte zuerst mit [`pairdraw fonts`](./inspecting#font-diagnostics). Die Exportvorbereitung kann konfigurierte Schriftanbieter nutzen, ihr Ergebnis kann daher von der Offline-Diagnose der Datei abweichen.

`convert` lädt Schriften für `.pen`-, draw.io- und Mermaid-Dateien, die die Absicht des Layouts statt fester Größen speichern: Es ordnet sie vor dem Schreiben neu an und misst ihren Text dabei in den eigenen Schriften, sodass `strict` es abbricht, bevor etwas geschrieben wird. Ein Mermaid-Flussdiagramm (`.mmd` oder `.mermaid`) wird beim Einlesen angeordnet, sein Text in den Schriften gemessen, in denen es gezeichnet wird.

Diese Regeln gelten nicht für Exporte aus der laufenden App und nicht für SVG-, PowerPoint-, JSX-, HTML- und `.fig`-Exporte. Sie prüfen die Auflösung der Schriften, nicht die vollständige visuelle Übereinstimmung mit Figma.

## JSX-Export

Export als JSX mit Tailwind-Utility-Klassen:

```sh
pairdraw export design.fig -f tailwind-jsx    # oder: -f jsx --style tailwind
```

Ausgabe:

```html
<div className="flex flex-col gap-4 p-6 bg-white rounded-xl">
  <p className="text-2xl font-bold text-[#1D1B20]">Card Title</p>
  <p className="text-sm text-[#49454F]">Description text</p>
</div>
```

`--style pairdraw` erzeugt das native JSX-Format (siehe [JSX-Renderer](../jsx-renderer)).

## HTML-Export

Export als HTML-Fragment, standardmäßig mit Inline-Stilen oder mit Tailwind-Utility-Klassen:

```sh
pairdraw export design.fig -f html
pairdraw export design.fig -f html --css tailwind
```

`--html standalone` erzeugt ein im Browser zu öffnendes HTML-Dokument mit Reset-Stilen und einem Seiten-Wrapper. Eigenständiges HTML ist als nützliche visuelle und technische Übergabe gedacht, nicht als pixelgenauer Ersatz für den Renderer:

```sh
pairdraw export design.fig -f html --html standalone --css inline
pairdraw export design.fig -f html --html standalone --css tailwind
pairdraw export design.fig -f html --html standalone --css tailwind --assets external
```

Eigenständige Tailwind-Ausgabe wird während des Exports kompiliert und hängt nicht von der Tailwind-Browserlaufzeit ab. `--assets external` schreibt CSS und extrahierte Bilddateien neben die HTML-Datei. Mit `--fonts assets` zusammen mit externen Assets werden die im SceneGraph erkannten Textschriften über die konfigurierten Webschrift-Anbieter von Pairdraw aufgelöst und als lokale `@font-face`-Dateien ausgegeben.

Der HTML-Export schreibt den Namen jeder Ebene als Attribut `data-name`. `--no-layer-names` lässt die Namen weg, und `--layer-ids` ergänzt die ID jeder Ebene als `data-pairdraw-node-id` für Werkzeuge, die das Markup zurück auf das Dokument beziehen.

Der HTML-Export ist im Dateimodus verfügbar.

### Tokens im exportierten Code

HTML und Tailwind-JSX schreiben an Variablen gebundene Eigenschaften als die Design-Tokens, aus denen sie stammen: Eine an `Primary` gebundene Füllung wird zu `background-color: var(--color-primary)`, in Tailwind zu `bg-primary` oder zu `bg-(--name)` für ein Token außerhalb der Tailwind-Namensräume. Eine Ebene, die auf einen anderen Modus gesetzt ist, erhält das Attribut dieses Modus, etwa `data-theme="dark"`, damit die Tokens so aufgelöst werden, wie die Arbeitsfläche sie zeichnet.

Ein Wert bleibt literal, wo CSS ihn nicht wiedergeben würde: Die Ebene zeichnet den Wert der Variablen nicht mehr, das Token ist einheitenlos, wo eine Länge nötig ist, oder die Ebene liegt in einem Modus, den nur seine eigene Bedingung, etwa eine `@media`-Abfrage, auswählen kann. Eigenständiges HTML enthält das Stylesheet für die verwendeten Tokens; für Fragmente und JSX erzeugen Sie es mit `pairdraw tokens` (siehe unten).

## Design-Tokens

Die Variablen des Dokuments als CSS Custom Properties schreiben:

```sh
pairdraw tokens design.fig > tokens.css
pairdraw tokens design.fig --format tailwind > theme.css
pairdraw tokens design.fig --collection Theme --type COLOR
```

Der Standardmodus jeder Sammlung kommt in `:root`. Jeder andere Modus überschreibt die abweichenden Werte unter seiner Bedingung: `[data-theme="dark"]` für den Modus Dark einer Sammlung Theme, oder der Selektor bzw. die `@media`-Abfrage, die der Modus nennt. Aliase bleiben `var()`-Verweise und werden in jedem Modus erneut deklariert, der ändert, worauf sie zeigen; das Umschalten von `data-theme` an einem beliebigen Element gestaltet also alles darauf Aufbauende neu.

```css
:root {
  --color-blue-500: #3b82f5;
  --color-primary: var(--color-blue-500);
}

/* Theme: Dark */
[data-theme='dark'] {
  --color-primary: var(--color-blue-300);
}
```

`--format tailwind` legt Tokens mit einem Tailwind-v4-Namensraum (`--color-*`, `--spacing-*`, `--radius-*`, `--text-*`, …) in `@theme`, sodass `bg-primary` und `rounded-card` funktionieren, und ergänzt pro Modus eine `@custom-variant`, sodass `dark:bg-surface` derselben Bedingung folgt. Importieren Sie die Datei nach `@import "tailwindcss";`. Die Namen stammen aus der Code-Syntax der Variablen, wenn diese eine Custom Property nennt (`--x` oder `var(--x)`), sonst aus Name und Typ: `Blue/500` als Farbe wird zu `--color-blue-500`.

Tokens, die sich nicht schreiben lassen, etwa boolesche Variablen oder eine Bedingung, die weder Selektor noch Abfrage ist, werden auf stderr aufgelistet und ausgelassen. Der Befehl funktioniert im Dateimodus und mit der laufenden App.

### W3C-Design-Tokens

`--format dtcg` schreibt Variablen und Stile als [W3C-Design-Tokens](https://www.designtokens.org/tr/2025.10/format/) in einen Ordner:

```sh
pairdraw tokens design.fig --format dtcg --out tokens
```

Jeder Modus einer Sammlung ist eine Datei, `Theme/Light.tokens.json` und `Theme/Dark.tokens.json`, in der Form, die Figma als Modus importiert: Längen in `px`, Zeiten in `s`, boolesche Werte als mit `com.figma.type` markierte Zahlen und Aliase auf eine andere Sammlung mit deren Namen in `com.figma.aliasData`. Text- und Effektstile werden zu Typografie- und Schatten-Tokens in `styles.tokens.json`, getrennt gehalten, weil Figmas Import zusammengesetzte Tokens ablehnt. `tokens.resolver.json` ist ein DTCG-Resolver, der die Modi jeder Sammlung umschaltet und den Rest schichtet, für Werkzeuge wie Style Dictionary. Pairdraws eigene Felder, etwa die Einheit `rem` eines Tokens, sein CSS-Name, Geltungsbereiche oder ein `clamp()`-Ausdruck, sowie die Bedingung jedes Modus stehen in `$extensions["dev.pairdraw"]`, sodass sich der Export exakt zurücklesen lässt.

Token-Dateien importieren Sie mit dem Werkzeug `import_design_tokens` in ein Dokument, indem Sie Pfad und Text jeder Datei übergeben:

```sh
jq -Rs --arg p tokens/Tokens/Default.tokens.json '{files:[{path:$p,text:.}]}' \
  tokens/Tokens/Default.tokens.json > args.json
pairdraw tool call import_design_tokens design.fig --args-file args.json --write
```

Es liest eine Datei pro Modus, nach Ordnern gruppiert, einen Resolver mit den Dateien, auf die er verweist, oder eine Tokens-Studio-Datei mit `$themes`. Sammlungen und Modi mit vorhandenen Namen sowie Variablen und Stile mit gleichem Namen werden aktualisiert, der Rest wird hinzugefügt, und nichts wird gelöscht. Das Ergebnis listet, was hinzugefügt, aktualisiert und übersprungen wurde, mit dem Grund für jedes Überspringen.

## Storybook-Export

Erzeugt pro Komponentensatz oder Komponente eine CSF3-Datei `.stories.ts`:

```sh
pairdraw export design.fig -f storybook                      # React-Stories in ./design-stories/
pairdraw export design.fig -f storybook --framework vue -o src/stories
pairdraw export design.fig -f storybook --css tailwind     # Komponenten mit Tailwind gestaltet
pairdraw export design.fig -f storybook --framework html --page "Components"
pairdraw export design.pen -f storybook -o src/stories --watch  # bei jedem Speichern neu exportieren
pairdraw export 'src/**/*.pen' -f storybook --beside --watch    # Stories neben jedem Design
pairdraw export design.fig -f storybook --rules stories.json    # Stories und Titel per Regel
```

### Weniger Stories in der Seitenleiste

Jede Story-Datei beginnt mit einer Story `Default`, der Variante, die das Design im Ruhezustand zeigt, mit allen Controls. Jede andere Varianten- oder Zustands-Story trägt das Tag `variant`, und jede Datei die Tags `pairdraw` und `page:<page>`, etwa `page:icons`. Der Filter der Storybook-Seitenleiste wählt nach diesen Tags aus, und `.storybook/main.ts` kann festlegen, was standardmäßig erscheint, etwa eine Story pro Komponente und keine Icons-Seite:

```ts
const config: StorybookConfig = {
  // …
  tags: {
    variant: { defaultFilterSelection: 'exclude' },
    'page:icons': { excludeFromSidebar: true }
  }
}
```

### Stories und Titel per Regel

Was die Tags nicht leisten, etwa Komponenten auslassen oder einen Icon-Satz als Galerie anordnen, entscheidet eine Regeldatei. Der Export liest `pairdraw.stories.json` aus dem Arbeitsverzeichnis, wenn sie dort liegt, oder die mit `--rules` genannte Datei, beim Beobachten bei jedem Export erneut:

```json
{
  "rules": [
    { "match": "**", "title": "Design system/{page}/{name}" },
    { "match": "Icons/**", "stories": "gallery" },
    { "match": "**/_*", "stories": "none" }
  ]
}
```

Eine Regel gilt für jede Story-Datei, deren Pfad `<page>/<name>` zu ihrem Glob passt, gemessen an den Namen im Dokument: dem der Seite und dem des Komponentensatzes bzw. der Komponente oder dem Präfix von Komponenten mit Schrägstrich im Namen, etwa `Icons/icon`. Jede passende Regel gilt der Reihe nach, eine spätere überschreibt also eine frühere, jedes Feld für sich. `generate: false` behält statische Stories für einen Vue- oder React-Export, wo er sonst eine Komponente erzeugen würde, etwa für einen Icon-Satz. `stories` ist `variants`, eine Story pro Variante oder Zustand wie ohne Regeln; `single`, nur die Story `Default`; `gallery`, `Default` und eine Story `Gallery`, die jede Variante mit ihrem Namen anordnet, für statische Stories; oder `none`, das die Datei auslässt. `title` ist der Titel der Datei, in dem `{document}`, `{page}`, `{name}` und `{path}`, der Titel, den sie sonst hätte, ersetzt werden; gleich ausfallende Titel werden wie immer auseinandergehalten. Regeln vergleichen die Namen im Dokument, nie einen umbenannten Titel, das Umbenennen einer Datei ändert also nie, welche Regeln für sie gelten.

### Designs neben ihren Stories

Legen Sie die Designdatei jeder Komponente in den Ordner der Komponente und exportieren Sie mit `--beside`: Die Stories, Designbilder und das Manifest `.pairdraw-stories.json` jedes Dokuments landen im eigenen Ordner dieses Dokuments, neben dem Code der Komponente. Ein Storybook-`stories`-Glob wie `../src/**/*.stories.ts` in `.storybook/main.ts` erfasst sie dann ohne weitere Konfiguration.

Sie können mehrere Dokumente übergeben oder einen Glob in Anführungszeichen wie `'src/**/*.pen'`, den Pairdraw selbst auflöst (Node.js 22 oder neuer). Mehrere Dokumente erfordern `--beside` oder `--output`; `--page` funktioniert nur mit einem Dokument. Die Dokumente werden nacheinander exportiert, und schlägt eines fehl, werden die übrigen trotzdem exportiert, bevor der Befehl mit einem Fehler endet. `--watch` beobachtet jedes passende Dokument; ein Dokument, das nach dem Start der Beobachtung entsteht, erfordert einen neuen Lauf.

Stories werden nach dem Dateinamen des Dokuments betitelt und danach nach der Seite, wenn mehr als eine Seite Komponenten enthält: `pricing.fig` ergibt `pricing/Plan picker`, sodass gemeinsam exportierte Dokumente ihre Stories getrennt halten. Jede Variante eines Komponentensatzes wird zu einer Story, und ihre Variantenmerkmale werden zu `select`-Controls, sodass das Umschalten eines Controls die passende Variante zeigt. Ein Satz mit Verhalten erhält stattdessen die Props des Controls: ein Switch oder eine Checkbox ein boolesches `checked`, ein Toggle `pressed`, ein Collapsible `open` und `disabled`, wenn der Satz einen deaktivierten Zustand zeichnet; Hover, Pressed und Fokus bleiben eigene Stories. Eigenständige Komponenten mit Schrägstrich im Namen, etwa `Button/Primary` und `Button/Secondary`, werden in einer `Button`-Datei mit einem `Variant`-Control zusammengefasst. Eine Kombination, für die das Design keine Variante hat, löst in Storybook einen benannten Fehler aus, statt eine andere Variante zu zeigen.

Die Stories rendern die Komponente wie `-f html` als HTML mit Inline-Stilen und benötigen daher keine Pairdraw-Laufzeit; `--framework` (`react`, `vue` oder `html`) ändert nur den Wrapper und den Import von `Meta`/`StoryObj` aus `@storybook/react-vite`, `@storybook/vue3-vite` oder `@storybook/html-vite`. Text verwendet die Schriftfamilien des Dokuments: Der Export lädt ihre Dateien von den Webschrift-Anbietern, die auch der Editor nutzt, nach `pairdraw/<document>/`, zusammen mit einer `fonts.css`, die jede Story-Datei importiert, sodass die Stories in diesen Schriften zeichnen und nie zuerst in einer Ersatzschrift. Auch die Designvariablen des Dokuments landen dort, als Custom Properties in einer `tokens.css`, die jede Story-Datei importiert, sodass an Variablen gebundene Stile so aufgelöst werden, wie das Design sie zeichnet. Eine Familie, die kein Anbieter hat, etwa Menlo, fällt auf die Schriften des Browsers zurück, wovor der Export warnt; `--fonts none` liefert keine Schriftdateien mit. Statische Stories exportieren Text-, Boolean- und Instanztausch-Eigenschaften noch nicht.

Mit `--framework vue` oder `--framework react` wird stattdessen jeder Komponentensatz und jede eigenständige Komponente zu einer echten Komponente, `<Name>.vue` oder `<Name>.tsx` mit einer `<Name>.module.css` (mit `--css tailwind` Tailwind-Utilities im Markup und ihre Zustände als Varianten wie `data-[state=checked]:`, für ein Projekt, das Tailwind v4 baut). Ausgenommen sind Komponenten mit Schrägstrich im Namen, die in einer Datei zusammengefasst werden, und alle, für die eine Regel `"generate": false` setzt; sie behalten statische Stories. Eine Komponente ohne Verhalten besteht aus den eigenen Elementen des Designs: Ihre Wurzel ist das Element, das das Design zeichnet, ein `div` für einen Rahmen, und sie nimmt die Props dieses Wurzelelements an, etwa `onClick` und `class`. Ihre Variantenmerkmale sind Props, die sie als `data-*`-Attribute setzt, eine Variante `State=hover` ist also ein Prop wie jedes andere; ihre booleschen Eigenschaften sind boolesche Props, die die daran gebundenen Ebenen ein- oder ausblenden; und ihre Slot-Eigenschaften sind Inhalt, den sie anstelle des Designinhalts zeigt, ein benannter `<slot>` in Vue und ein `ReactNode`-Prop in React, mit dem Designinhalt als Rückfall. Eine Komponente, deren Verhalten ein Button, Switch, Checkbox, Toggle, Collapsible, Tabs, Radio group, Toggle group, Accordion, Slider, Progress, Number field, Text field oder Textarea ist, baut auf Reka UI oder auf dem Paket `radix-ui` von Radix UI auf, und ihre Interaktionszustände wie Hover und deaktiviert werden zu echten `:hover`- und `data-disabled`-Stilen. Ihre Varianten werden zu einem Stylesheet kompiliert, das auf die von Reka und Radix gesetzten Zustände reagiert (`data-state`, `data-disabled`, Hover und Fokus), und jedes weitere Variantenmerkmal ist ein Prop, das die Komponente als `data-*`-Attribut setzt. In Vue ist ihr Wert ein `v-model` wie `checked` oder `open`; in React nimmt die Komponente die Props der Radix-Wurzel an, etwa `checked`, `defaultChecked` und `onCheckedChange`. Ihre Texteigenschaften sind String-Props mit den Worten des Designs als Standard, die die daran gebundenen Ebenen zeichnen, mit einem Text-Control in ihren Stories.

Tabs nehmen den geöffneten Tab als `value` an (`v-model:value`, oder `defaultValue` und `onValueChange` in React), benannt nach den Worten jedes Triggers als Slug, etwa `account` oder `password`, und beginnen beim ersten. Jeder Trigger und sein Panel sind die `Tabs`-Teile von Reka bzw. Radix um die Ebenen des Designs; jeder Trigger wird wie die übrigen Trigger des Designs gezeichnet und nimmt das Aussehen des ersten Triggers an, solange sein Tab aktiv ist, und die Stories erhalten ein `select`-Control und eine Story pro Tab. Eine Radio group, Toggle group oder ein Accordion schreibt zwei Komponenten: die Gruppe, die auf dieselbe Weise ein Element wählt und bei dem Element beginnt, das das Design aktiv zeichnet, und `<Group>Item` aus dem Komponentensatz ihrer Elemente, gebaut als Element-Primitive der Gruppe (`RadioGroupItem`, `ToggleGroupItem` oder `AccordionItem` mit seinem Trigger in einem Header), das den `value` annimmt, für den es steht. Die Gruppe verwendet es einmal pro Element in ihrem Elemente-Slot, jeweils mit dem Wert des Elements, benannt nach seiner Label-Eigenschaft oder sonst seinen Worten, und mit seinen Textwerten. Ein Slider, Progress oder Number field bindet seine Zahl als `value` (`v-model:value`, oder `defaultValue` in React, eine Liste für den Slider von Radix), innerhalb des Bereichs, den sein Verhalten festlegt, und beginnt dort, wo das Design es tut; Bereich und Thumb des Sliders sowie der Indikator von Progress verlieren die Position, an der das Design sie zeichnet, da der Wert sie bestimmt, und die Stories erhalten ein Range-Control und je eine Story an beiden Enden. Ein Text field oder eine Textarea zeichnet seine Textebene als natives `input` oder `textarea`, das `value` bindet und in React die Props der Komponente annimmt; zeichnet das Design das Feld gefüllt und leer, sind die Worte des leeren Feldes der Platzhalter und sein Aussehen das des Platzhalters, und das gefüllte Aussehen erscheint, solange das Feld Text enthält. Das Number field von Reka UI zeichnet in Vue die Eingabe und die Stepper; Radix hat keines, daher ist es in React eine native Zahleneingabe, deren Stepper sie um einen Schritt ändern und die beim Verlassen in ihren Bereich zurückfällt. Fokus auf dem Thumb eines Sliders oder der Eingabe eines Feldes zeichnet den Fokuszustand des Controls. Ein Radio wird nur als Element einer Gruppe erzeugt; ein allein verwendetes Toggle oder Collapsible wird weiterhin zu einer eigenen Komponente.

Innerhalb einer erzeugten Komponente verwendet eine Instanz einer anderen, im selben Export erzeugten Komponente diese Komponente, statt ihre Ebenen zu zeichnen: `<Switch>`, importiert aus `./Switch.vue` oder `./Switch`, gesetzt auf die Variante, den Text und die `disabled`-Werte, die die Instanz zeigt. Ein Control, das das Design eingeschaltet zeichnet, etwa ein aktivierter Switch, beginnt eingeschaltet und bleibt bedienbar: eine lokale `ref`, in Vue mit `v-model` gebunden, in React `defaultChecked`. Die übergeordnete Komponente platziert es nur, sodass das Control sein eigenes Aussehen und seine Zustandsstile behält. Nur eine Instanz, die abgesehen von ihren Eigenschaftswerten und ihrer Platzierung durch die übergeordnete Ebene genau wie ihre Variante zeichnet, verwendet die Komponente; eine Instanz mit bearbeitetem Text, den keine Eigenschaft setzt, einer eigenen Füllung oder anderen Änderungen zeichnet ihre eigenen Ebenen, sodass die Story zeigt, was das Design zeigt. Instanzen von nicht exportierten oder nur als statische Stories exportierten Komponenten werden wie bisher gezeichnet. Ein Variantenmerkmal, dessen Standardwert das Dokument leer lässt, beginnt bei der Standardvariante, der in der oberen linken Ecke des Satzes, die seine Stories eröffnet. Ein aus einem Satz platziertes Icon, dessen Pfade nicht bearbeitet wurden, ist die Komponente von Iconify, `<Icon icon="lucide:bell">` aus `@iconify/vue` oder `@iconify/react`, die das Icon beim Anzeigen lädt.

Eine mit einem Shader gefüllte Ebene spielt ihn hinter ihrem Inhalt mit `<Shader>` aus der Bibliothek `shaders` ab, aus `shaders/vue` oder `shaders/react`, jeder Effekt ein Kind mit den Props der Voreinstellung und abgeschalteter Telemetrie (`disableTelemetry`); Browser ohne WebGPU zeigen an seiner Stelle nichts.

Ihre Stories rendern die Komponente, und eine Play-Funktion klickt das Control an und prüft seinen Zustand. Das Storybook-Projekt braucht daher `reka-ui` oder `radix-ui`, außerdem `@iconify/vue` oder `@iconify/react`, wenn Komponenten Icons enthalten, und `shaders`, wenn Ebenen mit Shadern gefüllt sind.

Die Stories enthalten `parameters.design`-Einträge für [`@storybook/addon-designs`](https://github.com/storybookjs/addon-designs):

- **Pairdraw:** Liegt der Dokumentpfad im aktuellen Verzeichnis, ein [`pairdraw://`-Link](../index#url-scheme), der das Dokument in der Desktop-App öffnet und die Variante auswählt, oder ihren Komponentensatz, wenn eine andere Ebene den Namen der Variante trägt. Das Schema adressiert Ebenen über ihren Namen; eine Story, deren Varianten- und Komponentenname beide von anderen Ebenen geteilt werden, erhält keinen Link.
- **Design:** ein PNG der Variante in 2×, das neben der Story in `<Name>.design/` abgelegt und mit `new URL(…, import.meta.url)` referenziert wird, sodass Vite es bündelt. Kopieren Sie den Parameter in die Story Ihrer eigenen Komponente, um die Implementierung mit dem Design zu vergleichen. `--no-design-images` überspringt das Rendern; die Schriftersetzung folgt wie beim Rasterexport `--font-policy`.

`-o` benennt das Ausgabeverzeichnis. Ein dortiges Manifest `.pairdraw-stories.json` hält fest, welches Dokument (als Pfad relativ zum Ausgabeverzeichnis) und welche Seite jede Story und jedes Designbild erzeugt hat; checken Sie es zusammen mit den Stories ein. Ein Export ersetzt die Dateien, die ein früherer Export desselben Dokuments dort erzeugt hat, auch die inzwischen gelöschter oder umbenannter Komponenten; mit `--page` nur die dieser Seite. Er weigert sich, bevor etwas geändert wird, jede andere Datei zu überschreiben – eine handgeschriebene Story, die eines anderen Dokuments oder ein verirrtes Bild. Ein Export einer einzelnen Seite, dessen Dateinamen auf die Stories einer anderen Seite verschoben wurden, verlangt stattdessen einen vollständigen Export. Ohne das Manifest gelten vorhandene Stories als fremd, entfernen Sie sie daher vor einem erneuten Export. `--watch` hält den Befehl am Laufen und exportiert bei jedem Speichern des Dokuments neu, sodass das Hot Reload von Storybook dem Design folgt; ein Speicherstand, der nicht gelesen werden kann, wird gemeldet, und die Beobachtung läuft weiter. Ein fehlendes `--page` oder eine Ersetzung bei `--font-policy strict` beendet den Befehl dennoch.

## Laufende App

Ohne Dateiargument exportiert die CLI aus der laufenden App:

```sh
pairdraw export -f png                       # Auswahl im aktiven Dokument exportieren
pairdraw export --page "Components" -f png   # alle Ebenen einer Seite exportieren
pairdraw export --node 1:23 -f png           # eine Ebene auf einer beliebigen Seite exportieren
```

`--page` nimmt einen Seitennamen und `--page-id` eine Seiten-ID aus `pairdraw documents list`; beide exportieren diese Seite, ohne die App zu ihr wechseln zu lassen. Mit `--document-id` exportieren Sie aus einem anderen als dem aktiven Dokument.

Dieser Modus unterstützt PNG, JPG, WEBP, SVG und PDF. PowerPoint, JSX, HTML, Storybook und `.fig` erfordern ein Dateiargument. Der Export von Vorschaubildern im Dateimodus wird derzeit nicht unterstützt.
