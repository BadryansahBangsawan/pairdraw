---
title: Variablen
description: Designvariablen, Sammlungen, Modi und Farbbindungen in Pairdraw.
---

# Variablen

Variablen speichern wiederverwendbare Designtoken wie Farben, Abstände und andere Eigenschaften, die an Objekte gebunden werden können. Ändert sich ein Variablenwert, werden alle Objekte aktualisiert, die ihn verwenden.

## Variablen-Dialog öffnen

Der Dialog öffnet sich über **Ansicht → Variablen…**, über die Suche nach „Variablen“ in der Befehlspalette oder, wenn kein Objekt ausgewählt ist, im Bereich Variablen des Bereichs Design. **Erweitern** in der Ecke des Dialogs gibt ihm den größten Teil des Fensters.

Der Dialog listet links die Variablen der aktiven Sammlung auf, bearbeitet rechts die ausgewählte Variable oder die Sammlung und zeigt darunter das daraus entstehende Stylesheet. In einem schmalen Fenster oder auf dem Smartphone zeigt er jeweils einen Modus an. Eine Variable, die Sammlungseinstellungen oder das Stylesheet öffnen sich dann über der Liste mit einer Zurück-Schaltfläche.

## Sammlungen

Variablen sind in Sammlungen organisiert. In einem breiten Dialog stehen sie in einer Seitenleiste mit der Anzahl der Variablen je Sammlung; schmaler erscheinen sie als Registerkarten, auf dem Smartphone als Menü.

- **Sammlung wechseln:** in der Seitenleiste oder auf der Registerkarte darauf klicken
- **Sammlung erstellen:** neben **Sammlungen** auf **+** oder in der Werkzeugleiste auf die Ordner-Schaltfläche (**Sammlung erstellen**) klicken
- **Umbenennen oder löschen:** Ist keine Variable ausgewählt, bearbeitet die rechte Seite die Sammlung: Dort lässt sich der Name ändern oder die Sammlung über das Menü **⋯** neben dem Namen löschen (**Sammlung löschen**)
- **Umschalt-Attribut:** das Attribut, das manuell umgeschaltete Modi aktiviert, standardmäßig `data-theme` für eine Sammlung namens Theme; ein anderer Name wie `data-color-scheme` passt es an eine bestehende Codebasis an

## Modi

Jede Sammlung kann mehrere Modi enthalten (z. B. Hell und Dunkel). Die Modi erscheinen als Wertespalten in der Liste, und eine Variable hat für jeden Modus einen Wert. Verwaltet werden sie in den **Sammlungseinstellungen**:

- **Modus hinzufügen:** auf **+** neben **Modi** klicken
- **Umbenennen:** den Namen des Modus bearbeiten
- **Duplizieren, als Standard festlegen, löschen:** das Menü **⋯** neben dem Modus verwenden (**Modus duplizieren**, **Als Standard festlegen**, **Modus löschen**)

Der Standardmodus ist **Immer aktiv** und steht in `:root`. Jeder andere Modus hat **Gilt wenn**; das legt fest, wann der Modus im exportierten Stylesheet greift, und das CSS, das daraus entsteht, steht darunter:

| Gilt wenn | CSS |
| --- | --- |
| **manuell umgeschaltet wird** | das Umschalt-Attribut der Sammlung mit dem Modus als Wert, etwa `[data-theme="dark"]` für den Modus Dunkel einer Sammlung Theme |
| **das System im Dunkelmodus ist** / **das System im Hellmodus ist** | `@media (prefers-color-scheme: dark)` / `light` |
| **hoher Kontrast aktiv ist** | `@media (prefers-contrast: more)` |
| **reduzierte Bewegung aktiv ist** | `@media (prefers-reduced-motion: reduce)` |
| **der Bildschirm schmaler ist als** / **der Bildschirm breiter ist als** eine Breite | `@media (max-width: 640px)` / `min-width` |
| **der Container schmaler ist als** / **der Container breiter ist als** eine Breite | `@container (max-width: 640px)` / `min-width` |
| **Benutzerdefiniertes CSS** | ein beliebiger Selektor oder eine Abfrage mit `@media`, `@supports` oder `@container` |

Auf der Arbeitsfläche zeigt eine Ebene einen Modus, sobald sie auf ihn gesetzt ist, unabhängig von der Bedingung. Im exportierten Code wird ein manuell umgeschalteter Modus aktiviert, indem sein Attribut an ein Element gesetzt wird; Ebenen, die auf ihn gesetzt sind, werden daher mit diesem Attribut exportiert. Ebenen, die auf einen Modus mit einer anderen Bedingung gesetzt sind, auch mit benutzerdefinierten Selektoren, werden mit festen Werten statt Tokens exportiert, weil das Stylesheet und nicht die Ebene entscheidet, wann dieser Modus gilt.

## Variablen verwalten

### Formelwerte

Das Wertfeld einer Zahlenvariable nimmt eine Zahl, eine andere Variable oder eine Formel an. Beginnen Sie, den Namen einer Variable zu tippen, und wählen Sie sie aus der Liste, oder wählen Sie **Variable verwenden**: Sie erscheint als Etikett, und das Feld zeigt, was die Formel ergibt, etwa `= 16px`. Etiketten werden nach ID gespeichert, sodass die Formel nach dem Umbenennen einer Variable weiter funktioniert. Wahr/Falsch-, Text- und Farbvariablen behalten ihren Schalter, ihr Textfeld oder ihre Farbauswahl; wählen Sie daneben **Formel verwenden**, um stattdessen eine Formel zu schreiben.

- Zahlen verwenden `+`, `-`, `*`, `/` und Klammern: `space/base * 4`.
- Wahr/Falsch-Werte verwenden `and`, `or` und `not` und vergleichen Zahlen mit `==`, `!=`, `<`, `<=`, `>` und `>=`: `viewport > 1024 and not loading`. `==` und `!=` vergleichen auch Text.
- Text steht in doppelten Anführungszeichen, und `+` verbindet ihn mit anderem Text, einer Zahl oder einem Wahr/Falsch-Wert: `"Hello, " + name`. `text(count)` schreibt eine Zahl wie Figma, mit zwei Nachkommastellen, sofern sie nicht ganzzahlig ist: `3`, `1.50`.
- `if(condition, then, otherwise)` wählt zwischen zwei Zahlen, Texten, Wahr/Falsch-Werten oder Farben: `if(compact, 8, 16)`, `if(dark, gray/900, #FFFFFF)`. Farben werden als `#RRGGBB` geschrieben, mit Deckkraft als `#RRGGBBAA`.
- `truthy(value)` ist falsch für `0`, leeren Text und die Wörter `false`, `no` und `off` und wahr für alles andere, so wie Figma sie liest.
- Unbekannte Variablen, Zirkelbezüge, gemischte Typen und Division durch null werden beim Verlassen des Felds gemeldet, und der gespeicherte Wert bleibt unverändert.

Das Ergebnis folgt den Variablenmodi jeder Ebene und aktualisiert gebundene Ebenen, wenn sich eine verwendete Variable ändert. Formeln rechnen mit gespeicherten Einheiten, Längen also in Pixeln. Die Liste zeigt das Ergebnis jeder Formel; fahren Sie über das Formelsymbol, um die Formel zu lesen.

Im Stylesheet wird eine Zahlenformel als `calc()` über die verwendeten Variablen geschrieben, etwa `calc(var(--spacing-md) * 2 - var(--spacing-base))`, und in jedem Modus erneut deklariert, der eine davon ändert. Formeln mit `if()`, Text oder Wahr/Falsch-Werten haben keine CSS-Form und fehlen im Stylesheet. Ein **CSS-Ausdruck** ersetzt den Wert nur in CSS. Design-Token-Dateien enthalten das Ergebnis jeder Formel, mit der Formel unter `$extensions`. Formeln überstehen Kopieren und Einfügen, Teilen, Rückgängig und das Speichern als `.fig`, und Farb- und Deckkraftausdrücke aus Figma behalten ihre Variablenverweise.

### Variablenliste

Variablen sind nach den Ordnern in ihren Namen gruppiert (`Brand/Primary` erscheint als *Primary* unter *Brand*) und zeigen ihren CSS-Namen sowie einen Wert pro Modus.

- **Variable erstellen:** auf **Variable erstellen** (oder **+**) klicken und einen Typ wählen; die neue Variable wird zur Bearbeitung geöffnet
- **Auswählen:** auf eine Zeile klicken oder mit den Pfeiltasten navigieren und die Eingabetaste drücken. Shift-Klick wählt einen Bereich aus, Cmd-Klick (Strg-Klick unter Windows und Linux) fügt eine Zeile hinzu oder entfernt sie
- **Filtern:** in das Suchfeld tippen, um nach Namen, CSS-Name, Beschreibung oder Wert zu filtern, etwa `--color-brand`, einer Hex-Farbe oder der Variable, auf die ein Alias verweist, mit derselben fehlertoleranten Suche wie die Befehlspalette; in der Seitenleiste auf eine Gruppe klicken, um nur diese Gruppe und die darin enthaltenen Gruppen anzuzeigen, oder über die Filter-Schaltfläche (**Nach Typ filtern**) nur bestimmte Typen anzeigen
- **Umbenennen oder direkt bearbeiten:** auf einen Namen oder einen Zahlen- oder Textwert in der Liste doppelklicken
- **Rechtsklick:** die ausgewählten Variablen umbenennen, duplizieren (**Duplizieren**), in eine Gruppe oder eine neue Gruppe verschieben (**In Gruppe verschieben**, **Neue Gruppe…**) oder löschen (**Variablen löschen**); auch Delete oder Backspace löscht sie
- **Neu anordnen:** eine Zeile ziehen; die Reihenfolge wird in der Datei gespeichert
- **Mehrere ausgewählt:** die rechte Seite verschiebt sie in eine Gruppe, dupliziert sie oder löscht sie
- **Rückgängig und Wiederholen:** Cmd+Z und Cmd+Shift+Z oder Cmd+Y (Strg unter Windows und Linux) wirken im Dialog wie auf der Arbeitsfläche, ein Schritt pro Änderung. Die Eingabetaste übernimmt ein Feld und kehrt zur Liste zurück; solange ein Feld noch nicht übernommenen Text enthält, macht Cmd+Z das Tippen rückgängig

Die Auswahl einer Variable bearbeitet:

- **Name** und **CSS-Name:** den CSS-Namen leer lassen, damit er aus Name und Geltungsbereichen abgeleitet wird, etwa `--color-brand-primary`. Den Namen ohne `--` eingeben; ein Name, den CSS nicht verwenden kann, wird markiert und nicht gespeichert
- **Einheit:** bei Zahlen `px`, `rem`, `%`, `ms`, `s`, `deg` oder keine; Werte werden in dieser Einheit eingegeben
- **Wert** oder **Werte:** einer pro Modus; eine Farbe öffnet die Farbauswahl. Die Variablen-Schaltfläche (**Variable verwenden**) neben einem Wert lässt ihn auf eine andere Variable desselben Typs verweisen, ein Alias, der dieser Variable folgt; **Variable lösen** macht daraus wieder den Wert, den er zeigte
- **CSS-Ausdruck:** Wählen Sie bei Zahlen im Menü **⋯** eines Werts **CSS-Ausdruck hinzufügen**, um statt des Werts CSS wie `clamp(1rem, 4vw, var(--spacing-md))` zu schreiben, während die Arbeitsfläche weiterhin den Wert zeichnet. Token-Namen werden zu `var(--name)` ergänzt und als Etiketten angezeigt, die Variablen-Schaltfläche fügt eines ein, und eine nicht geschlossene Funktion, ein unbekanntes Token oder ein Wert, den die Einheit des Tokens nicht annimmt, wird beim Verlassen des Felds gemeldet. Der Ausdruck bleibt erhalten, wenn der Wert zwischen Zahl, Variable und Formel wechselt; entfernt wird er im selben Menü
- **Geltungsbereiche:** für welche Eigenschaften die Variable angeboten wird
- **Beschreibung**
- **Von Veröffentlichung ausblenden:** Dateien, die diese Datei als Bibliothek verwenden, sehen die Variable nicht

## Stylesheet

Unten im Dialog wird die aktive Sammlung als CSS-Custom-Properties angezeigt. Die Kopieren-Schaltfläche (**Alle Variablen als CSS kopieren**) kopiert die Variablen des gesamten Dokuments als CSS oder als Tailwind-v4-Theme (**Alle Variablen als Tailwind-Theme kopieren**), sodass Aliase auf andere Sammlungen aufgelöst werden.

## Design-Tokens importieren und exportieren

Variablen und Stile wandern als [W3C-Design-Tokens](https://www.designtokens.org/) zwischen Pairdraw, Figma und Code:

- **Exportieren:** Wählen Sie im Kopiermenü des Stylesheets **Als Design-Tokens exportieren**. Das ZIP enthält je Modus einer Sammlung eine Datei, die Figma als Modus importiert, Text- und Effektstile als Typografie- und Schatten-Tokens sowie einen Resolver, der alles für Werkzeuge wie Style Dictionary zusammenführt
- **Importieren:** Klicken Sie in der Werkzeugleiste auf **Design-Tokens importieren** und wählen Sie Token-Dateien oder ein ZIP. Dateien aus Figma, ein Resolver mit den Dateien, die er nennt, und Tokens-Studio-Themes funktionieren
- **Kommandozeile:** `pairdraw tokens app.fig --import theme.css --write` liest die Custom Properties eines lokalen Stylesheets ohne geöffnete App ein; `:root` hält Standardwerte, andere Selektoren werden Modi
- **Projektordner:** `pairdraw tokens app.fig --project ./app --write` importiert CSS-Variablen aus einem lokalen Projekt, einschließlich eines Tailwind-v4-`@theme` und eines shadcn/ui-Paars aus `:root` und `.dark` als Modi Light und Dark. Eine JavaScript-Konfiguration wie `tailwind.config.js` wird gemeldet und nicht ausgeführt
- **Ziel wählen:** Bevor sich etwas ändert, zeigt der Dialog jede gefundene Sammlung und jeden Modus und wohin sie gehen: in eine neue Sammlung oder einen neuen Modus, in einen vorhandenen oder nirgendwohin. Variablen und Stile mit demselben Namen werden aktualisiert, der Rest wird hinzugefügt; nichts wird gelöscht. Er zählt, was hinzugefügt, aktualisiert und übersprungen wird, und nennt für jedes übersprungene Token den Grund
- Der Import ist ein Schritt: **Rückgängig** nimmt ihn ganz zurück

## Mit einem Stylesheet synchronisieren

Custom Properties in einer CSS-Datei werden zu Variablen, und Variablen gehen zurück in die Datei. Klicken Sie in der Variablen-Werkzeugleiste auf **Mit CSS synchronisieren**:

- **CSS-Variablen importieren…** liest eine `.css`-Datei. `:root`, `html` und Tailwinds `@theme` enthalten die Standardwerte jeder Sammlung; `[data-theme="dark"]`, eine Klasse wie `.dark` und `:root`-Blöcke in `@media`, `@supports` oder `@container` werden zu Modi mit dieser Bedingung. Farben, Längen in `px` oder `rem`, Dauern, Zahlen, Text in Anführungszeichen und Schriftlisten werden zu Variablen, `var(--name)` wird zum Alias, und `calc()` oder `clamp()` behält sein CSS als CSS-Ausdruck. Derselbe Import-Dialog zeigt, wohin jede Sammlung und jeder Modus geht, bevor sich etwas ändert
- **Aus … übernehmen** liest die verknüpfte Datei erneut und zeigt, was sich geändert hat. Ein aus dem Dokument exportiertes Stylesheet landet wieder auf denselben Variablen und Modi
- **In … schreiben** schreibt die Variablen direkt in die verknüpfte Datei: geänderte Werte werden in ihrer eigenen Schreibweise ersetzt, fehlende in ihrem Block ergänzt, und Kommentare, andere Regeln und Properties ohne Variable bleiben unverändert. Nichts wird entfernt. Kann der Browser die Datei nicht schreiben, wird stattdessen eine Kopie gespeichert
- **Übernehmen, wenn sich die Datei ändert** importiert jedes Speichern der verknüpften Datei, auf dem Desktop und in Browsern mit Dateizugriff, jeweils als ein Rückgängig-Schritt

## Zwischen Dokumenten einfügen

Ebenen, die in einem geöffneten Dokument kopiert und in ein anderes eingefügt werden, können die Variablen und Stile mitbringen, die sie verwenden. Vor dem Einfügen fragt ein Dialog, wie:

- **Ja, importieren** — fügt die Variablen und Stile hinzu, sodass die eingefügten Ebenen mit ihnen verknüpft bleiben
- **Unverändert einfügen** — fügt die Ebenen mit den Werten ein, die sie zeigten, ohne Verknüpfung zu Variablen oder Stilen
- **Vorhandene verwenden** oder **Umbenannt hinzufügen** — hat dieses Dokument bereits eine Sammlung oder einen Stil mit demselben Namen, wählen Sie pro Zeile: die vorhandene verwenden, wobei Variablen nach Namen zugeordnet und fehlende ergänzt werden, oder die Kopie unter einem neuen Namen wie „Spacing 2“ hinzufügen

Das Einfügen ist ein Schritt: **Rückgängig** entfernt die Ebenen und alles, was dabei hinzugefügt wurde. **Eigenschaften einfügen** verwendet gleichnamige Sammlungen und Stile auf dieselbe Weise.

## Variablen an Füllungen binden

Mit der Variablenauswahl im Bereich Füllung des Eigenschaftenbereichs lässt sich eine Farbvariable an die Füllung eines Objekts binden.

- **Binden:** eine Farbvariable in der Auswahl wählen. Die Füllung zeigt ein violettes Etikett mit dem Variablennamen.
- **Lösen:** auf die Schaltfläche zum Lösen am Etikett klicken, um die Bindung zu entfernen. Die Füllung kehrt zum aufgelösten Farbwert zurück.

Ändert sich der Wert der Variable (oder wird der Modus gewechselt), werden alle gebundenen Füllungen automatisch aktualisiert.

## Hinweise

- Sammlungen gruppieren zusammengehörige Token, etwa `Primitives` für Ausgangsfarben, `Semantic` für rollenbezogene Aliase und `Spacing` für Layoutwerte.
- Modi eignen sich für Themen: Hell- und Dunkel-Werte lassen sich in derselben Sammlung definieren.
- Variablen unterstützen Aliase: Eine Sammlung `Semantic` kann auf Werte einer Sammlung `Primitives` verweisen.
- Wie Füllungen und die Farbauswahl funktionieren, steht unter [Formen zeichnen](./drawing-shapes).
