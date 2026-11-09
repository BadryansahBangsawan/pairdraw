---
title: Text bearbeiten
description: Text auf der Arbeitsfläche erstellen, auswählen und formatieren sowie Schriften verwalten.
---

# Text bearbeiten

Text wird direkt auf der Arbeitsfläche erstellt und bearbeitet. Verschiedene Zeichenbereiche können eigene Stile besitzen.

## Text erstellen

<kbd>T</kbd> drücken und auf die Arbeitsfläche klicken. Pairdraw erstellt ein leeres Textobjekt und aktiviert den Cursor.

## Bearbeitungsmodus

Ein vorhandenes Textobjekt doppelklicken. Eine blaue Umrandung kennzeichnet den Bearbeitungsmodus. Ein Klick außerhalb beendet die Bearbeitung.

## Cursor bewegen und Text auswählen

Die Pfeiltasten bewegen den Cursor zeichen- oder zeilenweise. <kbd>Option</kbd>/<kbd>Strg</kbd> bewegt wortweise. Mit <kbd>Shift</kbd> wird die Auswahl erweitert.

- Klick setzt den Cursor.
- Ziehen markiert einen Bereich.
- Doppelklick wählt ein Wort.
- Dreifachklick wählt den gesamten Text.

## Formatierung

| Aktion | macOS | Windows / Linux |
|--------|-------|-----------------|
| Fett | <kbd>⌘</kbd><kbd>B</kbd> | <kbd>Strg</kbd><kbd>B</kbd> |
| Kursiv | <kbd>⌘</kbd><kbd>I</kbd> | <kbd>Strg</kbd><kbd>I</kbd> |
| Unterstrichen | <kbd>⌘</kbd><kbd>U</kbd> | <kbd>Strg</kbd><kbd>U</kbd> |

Durchgestrichen ist über **S** im Bereich Typografie verfügbar. Die Formatierung wird pro Zeichen gespeichert.

## Links

Text kann auf eine Webseite oder eine E-Mail-Adresse verlinken, für den gesamten Text oder für ausgewählte Zeichen. Wenn die Ebene ausgewählt ist, wählen Sie **Link hinzufügen** im Bereich Typografie des Eigenschaften-Panels, unter **Text → Link hinzufügen** in der Menüleiste oder im Kontextmenü der Arbeitsfläche. Der Link-Editor öffnet sich unter dem Text: Geben Sie eine Adresse ein — eine reine Domain oder `name@host` erhält ihr `https://` bzw. `mailto:` — und drücken Sie <kbd>Enter</kbd>, um sie zu übernehmen, oder <kbd>Escape</kbd>, um ohne Änderungen zu schließen. Der Editor bearbeitet den Link später auch und entfernt ihn.

Ein ⌘-Klick (Strg-Klick unter Windows und Linux) auf einen Link auf der Arbeitsfläche öffnet ihn, ebenso ein Klick in der Vorschau.

## Schriftauswahl

Die Schriftauswahl unterstützt Suche, Vorschau, virtuelles Scrollen und das Anspringen der aktuellen Schrift.

## Variable Schriften

Ist die Schrift variabel, etwa Inter, zeigt der Bereich Typografie ihre Achsen (Stärke, optische Größe, Breite und weitere) mit dem Wert, in dem sie gezeichnet werden. Ein eingegebener oder gezogener Wert setzt die Achse; eine neue Stärke, Neigung oder Familie setzt die Achsen auf die des Schnitts zurück. Die optische Größe zeigt **Automatisch**, solange sie der Schriftgröße folgt; ein Wert oder **Fest** in ihrem Menü hält sie, **Automatisch** lässt sie wieder folgen.

## Schriftquellen

- Inter wird automatisch geladen.
- Die Desktop-App verwendet Systemschriften und aktivierte Kataloge von Google Fonts, Fontsource, Bunny Fonts und Fontshare.
- Chrome und Edge können Systemschriften im Browser verwenden.
- Heruntergeladene Schriftschnitte werden lokal gespeichert.

Zugriff auf Systemschriften und Online-Anbieter verwaltest du unter **Einstellungen › Schriften**, die das Zahnrad neben der Schriftfamilie öffnet; in der Desktop-App verwaltet die Seite auch heruntergeladene Schriften und Fallback-Pakete.

## Dokumentschriften

Ziehe eine TTF-, OTF-, WOFF- oder WOFF2-Datei auf die Arbeitsfläche, um ihre Familie ins Dokument aufzunehmen: Sie erscheint in der Schriftauswahl, reist in der `.fig`-Datei mit und liegt Web- und Storybook-Exporten bei. Mitgebrachte Schriften brauchen keine Installation und keinen Anbieter.

## Fehlende Schriften

Kann eine Familie oder ein Schnitt nicht geladen werden, zeigt Pairdraw eine Warnung mit den verwendeten Ersatzschriften. Betroffene Ebenen können ausgewählt und die Schriften erneut geladen werden.

Fehlt nur ein Schnitt, kann er aus einem anderen Schnitt derselben Familie erzeugt werden. Fehlt die ganze Familie, wird nach Möglichkeit Inter verwendet.
