---
layout: doc
title: AI und Automatisierung
description: AI-Chat, CLI, JSX-Renderer, MCP-Server und weitere Automatisierungsschnittstellen auf Basis des Pairdraw-Editorkerns.
---

# AI und Automatisierung

Pairdraw behandelt Designdateien als Daten. Jeder Vorgang aus dem Editor — Formen erstellen, Füllungen ändern, automatische Anordnung konfigurieren oder Ressourcen exportieren — steht auch im Terminal, für AI-Agenten und im Code zur Verfügung. Keine Plugins zu installieren, keine API-Schlüssel, keine Warteliste.

Editor und Automatisierung verwenden denselben Kern. Was sich per Klick erledigen lässt, lässt sich auch per Skript erledigen.

## Die größere Idee

Pairdraw soll nicht nur eine Design-App sein.

Es soll auch ein Baukasten sein: etwas, das Sie in andere Produkte einbetten, mit einer eigenen Oberfläche versehen und für Bearbeitungsabläufe nutzen können, die zu Ihrem eigenen Fachgebiet passen.

Deshalb sind die Automatisierungsschnittstellen wichtig. Die App, die CLI, die AI-Werkzeuge, der JSX-Renderer, der MCP-Server und das SDK bauen alle auf demselben Editor-Kern auf.

## AI-Chat

Der integrierte Assistent hat Zugriff auf mehr als 130 Werkzeuge, die den gesamten Funktionsumfang des Editors abdecken. Beschreiben Sie in natürlicher Sprache, was Sie möchten — „füge allen Buttons einen Schlagschatten von 16 px hinzu“, „erstelle eine Kartenkomponente mit einer Variante für den dunklen Modus“, „exportiere jeden Rahmen auf dieser Seite in 2×“.

[AI-Chat →](./ai-chat)

## Zusammenarbeit

KI-Agenten zeigen ihre Zeiger auf der Arbeitsfläche, während sie arbeiten, und die Ansicht folgt ihnen. Cloud-Dokumente auf einem selbst betriebenen Pairdraw-Cloud-Server bearbeiten alle, die sie öffnen, live, mit Zeigern, Folgemodus und CRDT-Synchronisierung. Peer-to-Peer-Räume sind in Pairdraw-Builds abgeschaltet.

[Zusammenarbeit →](./collaboration)

## Vue SDK

Bauen Sie Editoren auf Pairdraw-Basis mit demselben Vue SDK, das die App intern verwendet. Das SDK stellt Editor-Kontext, Anbindung der Arbeitsfläche, Auswahlzustand, Befehlsmodelle, Composables für Eigenschaftspanels und Headless-Primitive bereit.

[Vue SDK →](./sdk/)

## JSX-Renderer

Beschreiben Sie eine Oberfläche als JSX — dieselbe Syntax, die Sprachmodelle bereits aus React kennen. Ein einziger Aufruf kann einen vollständigen Komponentenbaum aus Rahmen, Text, automatischer Anordnung, Füllungen und Konturen erstellen. Kompakt, deklarativ und vergleichbar.

In der Gegenrichtung exportiert Pairdraw jede Auswahl zurück als JSX mit Tailwind-Klassen — nützlich für die Übergabe an die Entwicklung oder um Designs wieder in ein Sprachmodell einzuspeisen.

[JSX-Renderer →](./jsx-renderer)

## CLI

Die CLI untersucht, prüft, exportiert und analysiert Designdokumente ohne geöffneten Editor. Sie listet Seiten auf, sucht Objekte, extrahiert Designtoken, findet Layout- und Barrierefreiheitsprobleme und rendert PNG — alles im Terminal mit maschinenlesbarer JSON-Ausgabe.

Über RPC verbindet sich die CLI außerdem mit der laufenden Desktop-App, sodass Sie den Editor skripten können, während Sie ihn benutzen: Dokumente öffnen, speichern und wechseln, Änderungen rückgängig machen, Einstellungen ändern und jedes MCP-Werkzeug aufrufen.

[Dateien untersuchen](./cli/inspecting) · [Export](./cli/exporting) · [Designs analysieren](./cli/analyzing) · [Skripte](./cli/scripting) · [App steuern](/programmable/cli/app-control)

## MCP-Server

Verbinden Sie Claude Code, Cursor, Windsurf oder jeden anderen MCP-kompatiblen Client mit Pairdraw. Der Server stellt mehr als 130 Werkzeuge zum Lesen, Erstellen und Ändern von Designs bereit — dieselben, die der integrierte AI-Chat verwendet. Er läuft über stdio oder HTTP mit Sitzungsunterstützung.

[MCP-Server →](/programmable/mcp-server)

## URL-Schema {#url-scheme}

Die Desktop-Anwendung registriert `pairdraw://`. Eine veröffentlichte Seite – eine Storybook-Story, eine Design-Review, eine README – kann damit direkt auf eine Ebene verweisen:

```
pairdraw://open?file=web/design/hikyo.pen&node=Button/Large/Default
```

`file` ist ein auf das Repository bezogener Pfad, der auf `.pen` oder `.fig` endet; absolute Pfade und Segmente `.` oder `..` werden abgelehnt. `node` ist optional. Beide Werte sind URL-kodiert – Pfadtrenner dürfen unkodiert bleiben, ein literales `+` muss jedoch als `%2B` gesendet werden –, und bei einem wiederholten Schlüssel gilt der letzte Wert.

Die App gleicht `file` mit den Pfaden der geöffneten Tabs als vollständige abschließende Segmentfolge ab und fokussiert diesen Tab, ohne das Dokument erneut zu lesen. So wird die Ebene auch dann ausgewählt, wenn die Datei seit dem Öffnen verschoben wurde oder nicht mehr lesbar ist. Es gilt der erste geöffnete Tab, dessen Pfad auf den angeforderten Pfad endet; das ist wichtig, wenn zwei Checkouts dieselbe Datei geöffnet haben. Die Segmente werden so verglichen, wie es das Dateisystem der Plattform tut: unter macOS und Windows ohne Beachtung der ASCII-Groß-/Kleinschreibung, unter Linux exakt. `Web/Design/hikyo.pen` und `web/design/hikyo.pen` sind daher auf einem Mac dieselbe Datei und unter Linux zwei verschiedene. Passt kein geöffneter Tab, fragt ein Dateidialog einmal nach der Datei; die gewählte Datei muss auf denselben relativen Pfad enden, sonst wird der Link abgebrochen. Es wird kein Pfad an ein Stammverzeichnis angehängt, und über das, was der Dialog liefert, hinaus wird kein Dateisystemzugriff gewährt. Eine Datei, die der Link tatsächlich öffnet – die gewählte –, kommt wie jede andere geöffnete Datei in die Liste der zuletzt geöffneten Dateien; das Fokussieren eines bereits geöffneten Tabs ändert die Liste nicht, weil nichts geöffnet wurde.

Mit einem Objektnamen wählt die App alle Ebenen auf der aktuellen Seite aus, die genau diesen Namen tragen, und zoomt die Ansicht auf die gesamte Auswahl. Enthält die aktuelle Seite keine, wechselt die App zur ersten Seite, die eine enthält, und lädt dazu bei Bedarf Seiten nach. Ein unbekannter Name zeigt einen Hinweis und lässt das Dokument geöffnet. Das Schema kann nur eine Datei öffnen und Ebenen auswählen.

Die Webversion nimmt denselben Link aus ihrer Adressleiste an:

```
http://localhost:1420/?file=https://raw.githubusercontent.com/BadryansahBangsawan/pairdraw/master/tests/fixtures/pencil_button.pen&node=Button/Large/Default
```

Hier ist `file` eine absolute `https:`-URL, die auf `.pen` oder `.fig` endet – die Webversion hat kein Dateisystem, daher werden ein relativer Pfad, eine `http:`-URL oder jede andere Endung mit einer Warnung in der Konsole und sonst ohne Folgen abgelehnt. Die Endung wird dem Pfad der URL entnommen, ein Query-String an der verlinkten Datei ändert also nichts. Ein Fragment wird vor dem Abruf entfernt: Es erreicht den Server nie, daher öffnen `…/hikyo.pen#a` und `…/hikyo.pen#b` einen Tab, nicht zwei. `node` verhält sich genau wie oben: dieselbe Auswahl nach exaktem Namen samt Zoom, derselbe Hinweis, wenn keine Ebene den Namen trägt. Beide Werte sind URL-kodiert, ein literales `+` muss als `%2B` gesendet werden, und bei einem wiederholten Schlüssel gilt der letzte Wert, wie in der Desktop-Anwendung. Der Link wird auf jeder Route verarbeitet, `/demo?file=…` funktioniert also wie `/?file=…`.

Der Browser ruft die Datei Cross-Origin ab, der Host muss das daher erlauben: `raw.githubusercontent.com` sendet `Access-Control-Allow-Origin: *` und funktioniert. Die Anfrage enthält keine Zugangsdaten und folgt keinen Weiterleitungen, damit ein `https:`-Link nicht auf einen unverschlüsselten umgeleitet werden kann – eine URL der Form `https://github.com/<owner>/<repo>/raw/...` leitet auf `raw.githubusercontent.com` weiter und wird deshalb abgelehnt; verlinken Sie daher direkt den Raw-Host. `file` und `node` werden über den Router aus der Adressleiste entfernt, sobald sie gelesen wurden – vor dem Abruf und auch dann, wenn der Link abgelehnt wurde –, sodass ein Neuladen das Dokument nicht erneut öffnet und weder eine kopierte URL noch eine spätere Navigation in der App den Link enthält. Ein verlinktes Dokument ist auf 64 MiB begrenzt: Der Body wird beim Streamen mitgezählt, nicht aus `Content-Length` übernommen, und die Anfrage wird abgebrochen, sobald die Grenze überschritten ist; der Link meldet dann, dass die Datei 64 MiB überschreitet. Eine Bereitstellung, die die App mit einer Content-Security-Policy ausliefert, muss den verlinkten Host in `connect-src` erlauben, sonst wird der Abruf blockiert und der Link meldet, dass die Datei nicht geöffnet werden konnte.

Unter macOS gehört das Schema dem installierten App-Bundle, Links erreichen daher einen installierten Build und keinen `tauri dev`-Prozess. Unter Windows und Linux kommt der Link über das Deep-Link-Plugin an, auch wenn die App noch nicht läuft: Der Link wird beim Start vorgemerkt und verarbeitet, sobald der Editor bereit ist; unter Linux reicht der mitgelieferte Desktop-Eintrag den Link über `%U` weiter.

## Warum offen? {#why-open}

Figma ist eine geschlossene Plattform. Sein MCP-Server kann nur lesen. Der Browserzugriff über CDP wurde mit Version 126 abgeschaltet. Designdateien liegen in einem proprietären Format auf fremden Servern. Die Plugin-Entwicklung erfordert eine eigene Laufzeitumgebung mit eingeschränkten APIs.

Pairdraw ist die Alternative: Open Source, MIT-lizenziert, jeder Vorgang skriptbar, Daten lokal gespeichert. Ihre Designdateien gehören Ihnen — untersuchen Sie sie, wandeln Sie sie um, verarbeiten Sie sie in CI oder übergeben Sie sie einem Sprachmodell. Ohne um Erlaubnis zu fragen.
