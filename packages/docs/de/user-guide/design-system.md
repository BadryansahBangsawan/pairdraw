---
title: Ein Designsystem aufbauen
description: Ein Schritt-für-Schritt-Tutorial, das eine Bibliothek mit Button und Card aufbaut, mit Themes, Varianten, Komponenteneigenschaften und Slots.
---

# Ein Designsystem aufbauen

Dieses Tutorial baut ein kleines Designsystem von Grund auf: Farb- und Größentoken mit einem hellen und einem dunklen Theme, einen **Button** mit zwei Varianten und eine **Card**, deren Inhalt und Aktionen Slots sind. Jeder Schritt nutzt Funktionen, die unter [Variablen](./variables), [Auto-Layout](./auto-layout) und [Komponenten](./components) ausführlicher beschrieben sind.

[Laden Sie die fertige Datei herunter](/examples/design-system.fig){download}, um sie mit Ihrer eigenen zu vergleichen oder mit ihr zu beginnen. Sie hat zwei Seiten: **Components** enthält die Hauptkomponenten, und **Examples** zeigt dieselben Cards im Modus Light und Dark.

## 1. Token festlegen

Token sind Variablen, die jede Komponente liest. So ändert sich ein Theme an einer einzigen Stelle.

1. Öffnen Sie **Ansicht → Variablen…**.
2. Klicken Sie auf **+** neben **Sammlungen** und nennen Sie die Sammlung `Theme`. Benennen Sie ihren ersten Modus in `Light` um, klicken Sie dann auf **+** neben **Modi** und nennen Sie den neuen Modus `Dark`.
3. Klicken Sie auf **Variable erstellen**, wählen Sie **Farbe** und legen Sie diese Variablen mit einem Wert pro Modus an. Ein Schrägstrich im Namen gruppiert Variablen, `color/primary` erscheint also als *primary* unter *color*.

   | Variable | Light | Dark |
   | --- | --- | --- |
   | `color/background` | `#F4F5F7` | `#0F1115` |
   | `color/surface` | `#FFFFFF` | `#1A1D23` |
   | `color/border` | `#E1E4EA` | `#2D323B` |
   | `color/text` | `#191C21` | `#F1F3F6` |
   | `color/text-muted` | `#5A616E` | `#A2A9B5` |
   | `color/primary` | `#3451D1` | `#8098F7` |
   | `color/on-primary` | `#FFFFFF` | `#0D1222` |
   | `color/secondary` | `#E9ECF2` | `#272B33` |

4. Erstellen Sie eine zweite Sammlung `Size` mit Variablen vom Typ **Zahl**: `radius/control` = 8, `radius/card` = 12, `space/sm` = 8, `space/md` = 16 und `space/lg` = 24. Größen ändern sich nicht mit dem Theme, daher behält diese Sammlung einen einzigen Modus.

Das Stylesheet unter der Liste zeigt bereits das Ergebnis: die Light-Werte in `:root` und die Dark-Werte unter `[data-theme="dark"]`.

## 2. Den Button bauen

1. Benennen Sie die Seite in `Components` um. Zeichnen Sie einen Frame, drücken Sie <kbd>⇧</kbd><kbd>A</kbd> für Auto-Layout und setzen Sie beide Achsen auf **An Inhalt anpassen**.
2. Fügen Sie eine Textebene mit dem Text `Button` hinzu, in Inter Medium mit 14 px, und nennen Sie sie `Label`.
3. Binden Sie die Token. Binden Sie unter **Füllung** mit **Variable anwenden** die Füllung des Frames an `color/primary` und die Füllung des Texts an `color/on-primary`. Zahlenfelder nehmen Variablen auf dieselbe Weise an: Binden Sie den Eckenradius an `radius/control` und den linken und rechten Innenabstand an `space/md`, und setzen Sie den oberen und unteren Innenabstand auf 10.
4. Drücken Sie <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> (<kbd>Strg</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd>), um daraus eine Komponente zu machen.
5. Doppelklicken Sie in die Komponente und wählen Sie die Ebene Label. Erstellen Sie neben ihrem Text unter **Typografie** mit **Variable/Eigenschaft anwenden → Eigenschaft erstellen…** eine Texteigenschaft namens `Label`. Instanzen setzen ihre Beschriftung nun, ohne gelöst zu werden.
6. Wählen Sie die Komponente und klicken Sie im Kopf des Panels auf **Variante hinzufügen**. Die Komponente wird zu einem Set mit zwei Varianten. Benennen Sie unter **Eigenschaften** die Varianteneigenschaft in `Variant` und ihre Werte in `Primary` und `Secondary` um, und nennen Sie das Set `Button`.
7. Binden Sie in der Variante Secondary die Füllung an `color/secondary` und die Füllung der Beschriftung an `color/text`.
8. Wählen Sie das Set, klicken Sie unter **Verhalten** auf **+** und wählen Sie **Schaltfläche**. Die Vorschau (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> / <kbd>Strg</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd>) führt ihn nun als echten Button aus.

## 3. Die Card bauen

1. Zeichnen Sie einen 320 px breiten Frame, geben Sie ihm vertikales Auto-Layout und setzen Sie seine Höhe auf **An Inhalt anpassen**. Binden Sie seinen Innenabstand an `space/lg`, seinen Abstand an `space/md`, seinen Eckenradius an `radius/card`, seine Füllung an `color/surface` und eine 1 px breite Kontur an `color/border`.
2. Fügen Sie eine Textebene mit dem Text `Card title` hinzu, in Inter Semi Bold mit 18 px, und nennen Sie sie `Title`. Binden Sie ihre Füllung an `color/text` und setzen Sie ihre Breite auf **Füllen**.
3. Fügen Sie darunter einen Frame namens `Content` hinzu, mit vertikalem Auto-Layout, ohne Füllung, mit der Breite **Füllen** und der Höhe **An Inhalt anpassen**. Legen Sie eine Textebene hinein, etwa `Slots hold content that each card chooses for itself.`, in Inter Regular mit 14 px, gebunden an `color/text-muted`, und nennen Sie sie `Body`.
4. Fügen Sie einen Frame namens `Actions` mit horizontalem Auto-Layout hinzu, dessen Abstand an `space/sm` gebunden ist. Ziehen Sie aus **Elemente** einen Button hinein.
5. Wählen Sie den äußeren Frame und machen Sie daraus eine Komponente namens `Card`. Verknüpfen Sie den Titel mit einer Texteigenschaft namens `Title`, wie bei der Beschriftung des Buttons.
6. Wählen Sie den Frame `Content` und wählen Sie **Slot erstellen** im Kontextmenü oder im Bereich **Slots**. Machen Sie dasselbe für `Actions`. Jede Instanz kann nun ersetzen, was diese Frames enthalten, und der Inhalt der Hauptkomponente wird zum Standard.

Die Slot-Einstellungen beschreiben einen Slot, begrenzen, wie viele Ebenen er aufnimmt, und nennen bevorzugte Komponenten. `Actions` könnte zum Beispiel `Button` bevorzugen und höchstens 2 Ebenen aufnehmen.

## 4. Die Komponenten verwenden

1. Fügen Sie eine Seite namens `Examples` hinzu und zeichnen Sie einen Frame namens `Light` mit vertikalem Auto-Layout, Innenabstand und Abstand gebunden an `space/lg` und einer an `color/background` gebundenen Füllung.
2. Platzieren Sie zwei Card-Instanzen darin: Klicken Sie mit der rechten Maustaste auf die Card und wählen Sie **Instanz erstellen**, oder ziehen Sie sie aus **Elemente**. Setzen Sie ihre Eigenschaft **Title** auf `Welcome back` und `Pro plan`.
3. Wählen Sie in der zweiten Card den Button im Slot `Actions` und löschen Sie ihn. Fügen Sie dann zwei Button-Instanzen ein oder ziehen Sie sie hinein: eine Secondary mit der Beschriftung `Not now` und eine Primary mit `Upgrade`. Bearbeiten Sie den Text in ihrem Slot `Content`. Slot-Inhalt gehört zur Instanz und bleibt erhalten, wenn sich die Card ändert; **Slot zurücksetzen** im Menü des Slots stellt den Inhalt der Komponente wieder her.
4. Duplizieren Sie den Frame `Light` und nennen Sie die Kopie `Dark`. Setzen Sie unter **Darstellung** mit **Variablenmodus anwenden** die Sammlung `Theme` auf `Dark`. Jede gebundene Farbe im Frame wechselt, und die Cards bleiben mit ihren Komponenten verknüpft.

Ändern Sie nun ein Token oder eine Hauptkomponente, zum Beispiel `radius/card` oder den Innenabstand des Buttons, und beide Frames aktualisieren sich.

## 5. Wie es weitergeht

- **Als Bibliothek veröffentlichen.** Öffnen Sie **Elemente → Bibliotheken verwalten → Bibliothek veröffentlichen**, damit andere Dateien Button und Card verwenden und Aktualisierungen übernehmen können, wenn Sie sie ändern ([Komponentenbibliotheken](./components#component-libraries)).
- **Die Token an den Code übergeben.** `pairdraw tokens design-system.fig` gibt die Variablen als CSS Custom Properties aus, `--format tailwind` als Tailwind-v4-Theme und `--format dtcg --out tokens/` als W3C-Design-Token-Dateien. Der HTML-Export schreibt gebundene Werte als `var()`-Verweise auf dieselben Properties ([Exportieren](./exporting)).
- **Prüfen.** [Designs prüfen](/user-guide/checking-designs) und `pairdraw lint design-system.fig --fix -o fixed.fig` finden Farben, die einem Token entsprechen, aber nicht daran gebunden sind, und binden sie.
- **Änderungen verfolgen.** Legen Sie die Datei in Git ab und prüfen Sie Änderungen mit [`pairdraw diff files`](/de/programmable/cli/git).

## Das Beispiel per Skript erstellen

Die Beispieldatei wird von diesem Skript erzeugt, das dieselbe [Figma-kompatible Plugin-API](/de/programmable/cli/scripting) wie `pairdraw eval` verwendet. Führen Sie es aus, um die Datei selbst zu erstellen, oder ändern Sie es, um eigene Token auszuprobieren:

```sh
echo '{"children":[]}' > empty.pen
pairdraw eval empty.pen --stdin -o design-system.fig < design-system.js
```

<<< @/public/examples/design-system.js
