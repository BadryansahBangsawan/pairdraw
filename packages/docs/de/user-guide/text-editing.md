---
title: Text bearbeiten
description: Text in Pairdraw mit Formatierung, Schriften und Bearbeitung direkt auf der Arbeitsfläche erstellen und bearbeiten.
---

# Text bearbeiten

Erstellen Sie Textobjekte und bearbeiten Sie sie direkt auf der Arbeitsfläche, mit voller Unterstützung für formatierten Text.

## Text erstellen

Drücken Sie <kbd>T</kbd>, um das Textwerkzeug zu aktivieren, und klicken Sie auf die Arbeitsfläche. Ein leeres Textobjekt mit blinkendem Cursor erscheint; Sie können sofort lostippen.

## Direkt bearbeiten

Doppelklicken Sie auf ein vorhandenes Textobjekt, um es direkt zu bearbeiten. Eine blaue Umrandung kennzeichnet den Bearbeitungsmodus. Ein Klick außerhalb des Textobjekts übernimmt die Änderungen und beendet die Bearbeitung.

Text wird direkt auf der Arbeitsfläche gezeichnet; ein separates Eingabefeld darüber gibt es nicht.

## Cursor bewegen

| Aktion | macOS | Windows / Linux |
|--------|-------|-----------------|
| Nach links/rechts | <kbd>←</kbd> / <kbd>→</kbd> | <kbd>←</kbd> / <kbd>→</kbd> |
| Nach oben/unten | <kbd>↑</kbd> / <kbd>↓</kbd> | <kbd>↑</kbd> / <kbd>↓</kbd> |
| Wortweise | <kbd>⌥</kbd><kbd>←</kbd> / <kbd>⌥</kbd><kbd>→</kbd> | <kbd>Strg</kbd> + <kbd>←</kbd> / <kbd>Strg</kbd> + <kbd>→</kbd> |
| Zum Zeilenanfang/-ende | <kbd>⌘</kbd><kbd>←</kbd> / <kbd>⌘</kbd><kbd>→</kbd> | <kbd>Pos1</kbd> / <kbd>Ende</kbd> |

Halten Sie mit einer beliebigen Bewegungstaste <kbd>Shift</kbd>, um die Auswahl zu erweitern.

## Text auswählen

- **Klicken** in ein Textobjekt setzt den Cursor.
- **Klicken und Ziehen** markiert einen Textbereich.
- **Doppelklicken** auf ein Wort wählt es aus.
- **Dreifachklicken** wählt den gesamten Text des Objekts aus.

## Formatierung

Formatieren Sie markierten Text oder, wenn nichts markiert ist, schalten Sie den Stil für das gesamte Objekt um.

| Aktion | macOS | Windows / Linux |
|--------|-------|-----------------|
| Fett | <kbd>⌘</kbd><kbd>B</kbd> | <kbd>Strg</kbd> + <kbd>B</kbd> |
| Kursiv | <kbd>⌘</kbd><kbd>I</kbd> | <kbd>Strg</kbd> + <kbd>I</kbd> |
| Unterstrichen | <kbd>⌘</kbd><kbd>U</kbd> | <kbd>Strg</kbd> + <kbd>U</kbd> |

Durchgestrichen ist über die Schaltfläche **S** im Bereich „Typografie“ des Eigenschaften-Panels verfügbar (ohne Tastenkürzel, da <kbd>⌘</kbd><kbd>S</kbd> für Speichern belegt ist).

Die Formatierung wird pro Zeichen gespeichert. Tippen Sie zwischen einem fetten und einem normalen Abschnitt, übernimmt der neue Text den Stil des vorangehenden Abschnitts.

Auch die Schaltflächen **B / I / U / S** im Bereich „Typografie“ des Eigenschaften-Panels formatieren Text.

## Links

Text kann auf eine Webseite oder eine E-Mail-Adresse verlinken, für den gesamten Text oder für ausgewählte Zeichen. Wenn die Ebene ausgewählt ist, wählen Sie **Link hinzufügen** im Bereich „Typografie“ des Eigenschaften-Panels, unter **Text → Link hinzufügen** in der Menüleiste oder im Kontextmenü der Arbeitsfläche. Der Link-Editor öffnet sich unter dem Text: Geben Sie eine Adresse ein — eine reine Domain oder `name@host` erhält ihr `https://` bzw. `mailto:` — und drücken Sie <kbd>Enter</kbd>, um sie zu übernehmen, oder <kbd>Escape</kbd>, um ohne Änderungen zu schließen. Der Editor bearbeitet den Link später auch und entfernt ihn.

Ein ⌘-Klick (Strg-Klick unter Windows und Linux) auf einen Link auf der Arbeitsfläche öffnet ihn, ebenso ein Klick in der Vorschau.

## Bearbeiten

| Aktion | macOS | Windows / Linux |
|--------|-------|-----------------|
| Wort vor dem Cursor löschen | <kbd>⌥</kbd><kbd>⌫</kbd> | <kbd>Strg</kbd> + <kbd>Backspace</kbd> |
| Bis zum Zeilenanfang löschen | <kbd>⌘</kbd><kbd>⌫</kbd> | — |
| Ausschneiden | <kbd>⌘</kbd><kbd>X</kbd> | <kbd>Strg</kbd> + <kbd>X</kbd> |
| Kopieren | <kbd>⌘</kbd><kbd>C</kbd> | <kbd>Strg</kbd> + <kbd>C</kbd> |
| Einfügen | <kbd>⌘</kbd><kbd>V</kbd> | <kbd>Strg</kbd> + <kbd>V</kbd> |

## Schriftauswahl

Öffnen Sie die Schriftauswahl im Bereich „Typografie“ des Eigenschaften-Panels, um die Schriftfamilie zu ändern. Die Auswahl bietet:

- **Suchfilter:** Tippen grenzt die Schriftliste ein.
- **Schriftvorschau:** Jeder Schriftname wird in seiner eigenen Schrift dargestellt.
- **Virtuelles Scrollen:** Auch große Schriftlisten bleiben flüssig.
- **Zur aktuellen Schrift springen:** Beim Öffnen ist die aktuelle Schrift hervorgehoben.

## Schriftfamilie aus Variablen

Eine Schriftfamilie kann aus einer String-Variable kommen. Wählen Sie im Bereich „Typografie“ neben der Familie **Variable auf Schriftfamilie anwenden** und wählen Sie eine Variable, deren Wert der Name einer Schriftfamilie ist. Der Text folgt dann der Variable: Ein Wechsel des Variablenmodus oder eine Änderung ihres Werts ändert die Familie, und der Editor lädt die Schriften der neuen Familie. Wählen Sie eine Schrift in der Schriftauswahl, wird die Variable getrennt und diese Schrift direkt gesetzt.

## Text auf einem Pfad

Aus Figma importierte Text-auf-Pfad-Ebenen behalten ihre gekrümmte Glyphenanordnung. Sie können Text und Typografie bearbeiten, die Ebenen in der Größe ändern und auswählen und das Ergebnis speichern oder exportieren, wobei die Pfadanordnung erhalten bleibt. Das unterstützt vorhandene importierte Pfadtext-Ebenen; ein eigenes Zeichenwerkzeug, um beliebigen Text an einen neuen Pfad zu hängen, gibt es nicht.

## Schriftschnitt

Den Schriftschnitt ändern Sie im Bereich „Typografie“ des Eigenschaften-Panels. Welche Schnitte verfügbar sind, hängt von der gewählten Schriftfamilie ab (zum Beispiel Regular, Medium, Bold, Black).

## Variable Schriften

Ist die Schrift variabel, etwa Inter, zeigt der Bereich „Typografie“ ihre Achsen (Stärke, optische Größe, Breite und weitere, die die Schrift hat) mit dem Wert, in dem sie gezeichnet werden. Ein eingegebener oder gezogener Wert setzt die Achse; eine neue Stärke, Neigung oder Familie setzt die Achsen auf die des jeweiligen Schnitts zurück. Die optische Größe zeigt **Automatisch**, solange sie der Schriftgröße folgt; ein Wert oder **Fest** in ihrem Menü hält sie, **Automatisch** lässt sie wieder der Größe folgen.

## Schriftquellen

- **Standardschrift:** Inter wird automatisch geladen.
- **Desktop-App:** Systemschriften sowie aktivierte Kataloge von Google Fonts, Fontsource, Bunny Fonts und Fontshare.
- **Browser:** Systemschriften stehen in Chrome und Edge mit der Berechtigung für lokale Schriften zur Verfügung. Aktivierte Anbieter Fontsource, Bunny Fonts und Fontshare können Online-Schriften laden, abhängig vom Netzwerkzugang und den CORS-Regeln des Browsers; Google Fonts ist in der Browser-App von Pairdraw deaktiviert.
- **Heruntergeladene Schriften:** Die Desktop-App speichert heruntergeladene Schnitte zur Wiederverwendung auf demselben Rechner.

Zugriff auf Systemschriften und Online-Anbieter verwalten Sie unter **Einstellungen › Schriften**, die das Zahnrad neben der Schriftfamilie öffnet; in der Desktop-App verwaltet die Seite auch heruntergeladene Schriften und Fallback-Pakete.

## Dokumentschriften

Ziehen Sie eine TTF-, OTF-, WOFF- oder WOFF2-Datei auf die Arbeitsfläche, um ihre Familie in das Dokument selbst aufzunehmen: Sie erscheint in der Schriftauswahl, reist in der `.fig`-Datei mit und liegt Web- und Storybook-Exporten bei. Schriften, die das Dokument mitbringt, brauchen keine Installation und keinen Anbieter.

## Fehlende Schriften und Ersatzschriften

Kann eine angeforderte Familie oder ein Schnitt nicht geladen werden, zeigt Pairdraw über dem Editor eine Warnung, statt eine Ersatzdarstellung stillschweigend als originalgetreue Typografie auszugeben.

Klappen Sie die Warnung auf, um jeden betroffenen Schnitt und seinen aktiven Ersatz zu sehen. Mit **Ebenen auswählen** finden Sie alle betroffenen Textobjekte, und mit **Schriften erneut laden** versuchen Sie es nach einer Änderung des Netzwerkzugangs, der Berechtigung für lokale Schriften oder der Anbietereinstellungen erneut. Ein Schnitt kann aus einem anderen geladenen Schnitt derselben Familie erzeugt werden; fehlt die ganze Familie, wird nach Möglichkeit Inter verwendet.

## Tipps

- Die Schriftliste wird beim Start vorgeladen, sodass die Auswahl ohne Verzögerung öffnet.
- IME-Eingabe (Chinesisch, Japanisch, Koreanisch) wird vollständig unterstützt.
- Formatierungen bleiben beim Öffnen und Speichern von `.fig`-Dateien erhalten.
- Wie Textüberschreibungen in Komponenteninstanzen funktionieren, beschreibt [Komponenten](./components).
