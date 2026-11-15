---
title: Komponenten
description: Wiederverwendbare Komponenten, Instanzen, Komponentensätze, Überschreibungen und Live-Synchronisierung in Pairdraw.
---

# Komponenten

Komponenten sind wiederverwendbare Designelemente. Bearbeiten Sie die Hauptkomponente, aktualisieren sich alle ihre Instanzen automatisch.

## Komponenten durchsuchen

Öffnen Sie im linken Panel die Registerkarte **Elemente** (Assets), um lokale Komponenten und aktivierte Bibliotheken zu durchsuchen. Wählen Sie Raster- oder Listenansicht, suchen Sie nach dem Komponentennamen und wählen Sie eine Komponente aus, um ihre Details zu sehen. Ein Asset fügen Sie per Klick, mit <kbd>Enter</kbd> oder durch Ziehen auf die Arbeitsfläche ein.

Lokale Assets sind nach ihrer Ursprungsseite gruppiert. Veröffentlichte Bibliotheks-Assets bleiben verfügbar, sobald ihre Version heruntergeladen wurde, auch wenn der entfernte Anbieter vorübergehend offline ist.

## Komponente erstellen

Wählen Sie einen Rahmen oder eine Gruppe aus und drücken Sie <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> (<kbd>Strg</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd>). Die Auswahl wird zu einer wiederverwendbaren Komponente.

Jede andere Ebene, auch mehrere Ebenen, wird in eine neue weiße Komponente in der Größe ihres gemeinsamen Begrenzungsrahmens eingeschlossen, an der Stelle der obersten Ebene in der Ebenenliste; eine einzelne eingeschlossene Ebene gibt der Komponente ihren Namen.

Über Komponenten steht eine violette Beschriftung mit einem Rautensymbol.

## Komponentensätze und Varianten

Wählen Sie mindestens zwei Komponenten aus und wählen Sie im Kontextmenü **Komponentensatz erstellen**, um sie zu einem Komponentensatz zusammenzufassen: einem Container mit gestricheltem violettem Rand und 20 px Innenabstand um seine Kinder, wie in Figma. Sätze, die Skripte mit `figma.combineAsVariants()` erstellen, umschließen ihre Komponenten genau, wie Figmas Plugin-API.

Jede Komponente in einem Satz kann Werte über mehrere Variantendimensionen festlegen, etwa `Size=Small`, `State=Hover` und `Theme=Dark`. Pairdraw unterstützt lückenhafte Kombinationen; ein Satz muss also nicht jede mögliche Kombination enthalten. Die Variante oben links ist der Standard und dient als Ersatz, wenn ein Update eine genaue Kombination nicht mehr enthält.

Wählen Sie eine Komponente aus und klicken Sie im Kopf des Panels auf **Variante hinzufügen**, um sie wie in Figma in einen Komponentensatz umzuwandeln: Die Komponente wird zu `Property 1=Default`, und darunter erscheint eine Kopie namens `Property 1=Variant2`. Bei einem Satz kopiert **Variante hinzufügen** die letzte Variante mit dem nächsten Wert. Die Varianteneigenschaften des Satzes sind Zeilen seiner Liste **Eigenschaften**; klicken Sie auf eine, um sie umzubenennen oder ihre Werte hinzuzufügen, umzubenennen, per Ziehen neu zu ordnen oder zu entfernen. Entfernen Sie einen Wert, den Varianten noch verwenden, werden diese zuerst auf einen anderen Wert verschoben, und Varianten, die in allen Werten übereinstimmen, werden in einem Hinweis genannt, der sie auswählt.

## Komponenteneigenschaften

Komponenten und Komponentensätze unterstützen wiederverwendbare Text-, boolesche Sichtbarkeits-, Instanztausch- und Slot-Eigenschaften. Wählen Sie eine Instanz aus, um ihre Werte zu bearbeiten, ohne sie zu lösen. Eigenschaften und ihre Werte bleiben beim Speichern und erneuten Öffnen von `.fig`-Dateien erhalten.

Um eine Ebene einer Hauptkomponente mit einer Eigenschaft zu verknüpfen, verwenden Sie die Verknüpfungsschaltfläche dort, wo ihr Feld steht: **Typografie** für den Textinhalt, **Darstellung** für die Sichtbarkeit und der Kopf der Instanz für die ausgetauschte Komponente. Erstellen Sie eine Eigenschaft aus dem aktuellen Wert der Ebene oder wählen Sie eine vorhandene; das Feld zeigt dann die Eigenschaft statt ihres Werts. Tippen in verknüpften Text setzt die Eigenschaft: in der Hauptkomponente ihren Standardwert, in einer Instanz den Wert der Instanz.

Wählen Sie die Hauptkomponente aus, um ihre **Eigenschaften** zu sehen. Klicken Sie auf eine Eigenschaft, um sie umzubenennen, ihren Standardwert zu ändern, die von ihr gesteuerten Ebenen zu sehen und zu trennen oder sie zu löschen; per Ziehen ordnen Sie Eigenschaften neu. **+** fügt eine Text-, boolesche oder Instanztausch-Eigenschaft hinzu.

Um die Eigenschaften einer verschachtelten Instanz auf Instanzen der Komponente anzuzeigen, wählen Sie **+ → Verschachtelte Instanzen** und haken sie an, wie Figmas **Expose properties from nested instances**. Instanzen der Komponente listen ihre Eigenschaften dann unter ihrem Namen. Nur eine Instanz, deren Komponente Eigenschaften hat, lässt sich freigeben.

## Slots

Ein Slot ist ein Rahmen einer Hauptkomponente, dessen Inhalt jede Instanz ändern kann. Wählen Sie einen Rahmen innerhalb einer Hauptkomponente aus und wählen Sie **Slot erstellen** im Kontextmenü oder im Bereich „Slots“, oder wählen Sie andere Ebenen aus, um sie in einen neuen Slot-Rahmen einzuschließen. Die Slot-Einstellungen legen eine Beschreibung, die bevorzugten Komponenten und die Anzahl der Elemente fest; eine Instanz außerhalb dieser Grenzen zeigt eine Warnung. In einer Instanz fügen Sie die Elemente eines Slots hinzu, ordnen sie neu und entfernen sie oder setzen den Slot auf den Inhalt der Komponente zurück.

## Verhalten und Vorschau {#behaviours-and-preview}

Ein Verhalten lässt eine Hauptkomponente oder einen Komponentensatz wie ein echtes Steuerelement arbeiten, nach dem Vorbild der Primitive von [Reka UI](https://reka-ui.com): Schaltfläche, Textfeld, Textbereich, Zahlenfeld, Umschalter, Schalter, Kontrollkästchen, Option, Optionsgruppe, Umschaltergruppe, Schieberegler, Fortschritt, Tabs, Ausklappbereich oder Akkordeon. Wählen Sie die Komponente aus und wählen Sie über **+** im Bereich **Verhalten** eines aus.

Der Bereich listet, was das Steuerelement braucht:

- **Values** (Werte): die Eigenschaft, die jeden Wert hält: eine Varianten- oder boolesche Eigenschaft für An, Ausgewählt, Gedrückt, Geöffnet, Ausgefüllt oder Deaktiviert (mit den Variantenwerten, die an und aus bedeuten), eine Texteigenschaft für den Text eines Felds oder Minimum, Maximum, Schrittweite und Standardwert eines Schiebereglers.
- **Parts** (Teile): der Slot, der jeden Teil zeichnet, etwa den Regler eines Schalters, Spur, Bereich und Regler eines Schiebereglers oder eine Tab-Liste. Der Elemente-Slot einer Gruppe enthält Instanzen ihrer Optionen, Umschalter oder Ausklappbereiche.
- **Zustände:** eine Varianteneigenschaft, deren Werte Standard, Hover, Gedrückt, Fokus und Deaktiviert zeichnen. Werte, die wie diese Zustände heißen, werden automatisch zugeordnet.

Zeilen, die das Steuerelement benötigt, stehen zuerst; der Rest liegt unter **Weitere Optionen**. Hat eine Komponente noch nichts zum Binden, bietet eine Zeile an, es zu erstellen: eine Textebene und Texteigenschaft, Varianten für Aus und An oder einen Slot. **Zustände** bietet **Zustandsvarianten hinzufügen** an, das die Varianten Default, Hover, Pressed, Focus und Disabled der Komponente hinzufügt. Eine einzelne Hauptkomponente, die auf diese Weise Varianten erhält, wird zu einem Komponentensatz, und ein zu einem Satz hinzugefügter Slot erscheint in jeder Variante. Bis das Steuerelement funktioniert, sagt eine Zeile unter seinem Namen, was noch fehlt; ein Klick darauf führt dorthin.

Drücken Sie <kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> (<kbd>Strg</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd>), wählen Sie **Ansicht → Vorschau** oder verwenden Sie die Schaltfläche ▶ Vorschau in der oberen Leiste, um eine Vorschau der Arbeitsfläche zu sehen. Jede Ebene der obersten Stufe mit Steuerelementen läuft als Live-Komponente von Reka UI über der Arbeitsfläche, gezeichnet von den Varianten der Komponente: Schalter klappen um, Schieberegler lassen sich ziehen, Tabs und Akkordeons öffnen sich, und Textfelder sind echte Eingabefelder mit Cursor, Auswahl und Einfügen des Browsers. Die Vorschau ändert weder das Dokument noch seinen Verlauf. **Zurücksetzen** stellt alle Steuerelemente wie gestaltet wieder her, und <kbd>Esc</kbd> oder die Schließen-Schaltfläche des Etiketts kehrt zur Bearbeitung zurück. In der geteilten Ansicht zeigt jede Arbeitsfläche ihre eigene Vorschau.

Verhalten werden in `.fig`-Dateien gespeichert und mit Bibliothekskomponenten veröffentlicht.

## Komponentenbibliotheken {#component-libraries}

Eine Komponentenbibliothek veröffentlicht wiederverwendbare Komponenten als unveränderliche Version. Jedes veröffentlichte Asset hat eine dauerhafte Bibliotheks-, Asset- und Versionskennung, sodass verschiedene Instanzen auf unterschiedlichen Versionen bleiben können, bis Sie sie ausdrücklich aktualisieren.

**Pairdraw Basics** ist der mitgelieferte Originalsatz: Button, Input, Badge, Card und Avatar als `pairdraw-basics`. Er steht im Elemente-Panel ohne Katalog: Aktivieren Sie ihn dort, um seine Komponenten einzufügen, auch offline; er bleibt nach einem Neuladen erhalten. `pairdraw libraries seed --root ./catalog` veröffentlicht denselben Satz weiterhin in einen Dateikatalog.

### Bibliothek veröffentlichen

1. Erstellen Sie die Komponenten und Komponentensätze, die Sie teilen möchten.
2. Öffnen Sie **Elemente** und wählen Sie **Bibliotheken verwalten**.
3. Wählen Sie **Bibliothek veröffentlichen**.
4. Geben Sie eine dauerhafte Bibliotheks-ID und einen Anzeigenamen ein. Die Bibliotheks-ID ist nach der ersten Veröffentlichung gesperrt.
5. Durchsuchen Sie bei Bedarf die Änderungsliste und geben Sie eine Versionsbeschreibung ein.
6. Wählen Sie die hinzugefügten, geänderten, umbenannten oder entfernten Assets aus, die aufgenommen werden sollen.
7. Bestätigen Sie das Ziel und wählen Sie **Bibliothek veröffentlichen**.

Bei späteren Veröffentlichungen bleiben nicht angehakte Änderungen ausstehend. Unveränderte Assets behalten ihre zuvor veröffentlichten Definitionen, und entfernte Definitionen bleiben verfügbar, solange Dokumente noch auf ihre frühere Version verweisen.

### Bibliotheks-Assets aktivieren und einfügen

Öffnen Sie **Elemente → Bibliotheken verwalten**, um eine veröffentlichte Bibliothek zu aktivieren. Ihre Komponenten erscheinen im Elemente-Panel neben den lokalen Komponenten. Fügen Sie eine per Klick, über die Tastatur oder durch Ziehen auf die Arbeitsfläche ein.

Veröffentlichte Definitionen sind in nutzenden Dokumenten schreibgeschützt. Um eine Definition zu ändern, bearbeiten Sie das Quelldokument und veröffentlichen eine weitere Version. Instanzen, die mit diesen Definitionen verknüpft sind, bleiben über ihre Komponenteneigenschaften und Überschreibungen bearbeitbar.

### Updates prüfen und übernehmen

Öffnen Sie **Bibliotheken verwalten → Aktualisierungen**, um neuere Versionen zu finden. Die Suche verändert das Dokument nicht. Sie können die aktuelle und die aktualisierte Instanz nebeneinander vergleichen, zwischen betroffenen Instanzen wechseln und dann aktualisieren:

- die ausgewählte Instanz
- alle Instanzen eines Assets
- die Instanzen auf der aktuellen Seite
- die Instanzen auf allen Seiten

Pairdraw behält kompatible Text-, Sichtbarkeits- und Instanztausch-Zuweisungen bei. Gibt es eine genaue Variante nicht mehr, nennt die Prüfung vor der Bestätigung die Ersatzvariante oben links. Das Übernehmen eines Updates erzeugt einen Rückgängig-Eintrag.

### Lokal, mit Speicheranbieter und offline

Bibliotheken können den lokalen Browserkatalog oder einen eingerichteten Speicheranbieter nutzen. Entfernte Veröffentlichungen verwenden unveränderliche Versionsobjekte und einen bedingten Zeiger auf die neueste Version, damit sich zwei Veröffentlichende nicht unbemerkt gegenseitig überschreiben.

Heruntergeladene Versionen werden lokal zwischengespeichert. Ein Dokument kann heruntergeladene Definitionen offline weiter rendern und einfügen. Integritätsfehler werden gemeldet, statt von zwischengespeicherten Daten verdeckt zu werden.

### Nutzende Dokumente speichern

Bindungen an aktivierte Bibliotheken und die benötigten Definitionen werden mit `.fig`-Dokumenten gespeichert. Beim erneuten Öffnen einer nutzenden Datei bleiben ihre verknüpften Instanzen und Versionskennungen erhalten, auch wenn die entfernte Bibliothek nicht erreichbar ist.

## Instanzen erstellen

Klicken Sie mit der rechten Maustaste auf eine Komponente und wählen Sie im Kontextmenü **Instanz erstellen**. Die Instanz erscheint 40 px rechts neben der Ausgangskomponente und sieht genauso aus.

Instanzen lassen sich nur über das Kontextmenü erstellen; eine Schaltfläche in der Werkzeugleiste gibt es nicht.

## Instanz lösen

Wählen Sie eine Instanz aus und drücken Sie <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> (<kbd>Strg</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd>), um sie zu lösen. Die Instanz wird zu einem gewöhnlichen Rahmen ohne Verbindung zur ursprünglichen Komponente. Alle Überschreibungen werden übernommen.

## In Frame umwandeln

Wählen Sie eine Hauptkomponente aus und drücken Sie <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> (<kbd>Strg</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd>), also die Tasten für „Komponente erstellen“, oder wählen Sie **In Frame umwandeln** in ihrem Kontextmenü, im Menü des Ebenentyps oder unter **Objekt › In Frame umwandeln**, um sie wieder in einen Rahmen umzuwandeln. Hat die Komponente Instanzen, nennt eine Bestätigung ihre Anzahl; beim Umwandeln wird jede Instanz in einen Rahmen gelöst, der sein Aussehen behält, auch Kopien, die in Instanzen anderer Komponenten verschachtelt sind. Die gesamte Änderung ist ein einziger Rückgängig-Schritt.

## Zur Hauptkomponente

Klicken Sie mit der rechten Maustaste auf eine Instanz und wählen Sie **Zur Hauptkomponente**. Der Editor springt zur Hauptkomponente und wählt sie aus, bei Bedarf auf einer anderen Seite.

## Live-Synchronisierung

Wenn Sie eine Komponente bearbeiten, aktualisieren sich alle ihre Instanzen automatisch, wie in Figma: Jede Eigenschaft, die eine Instanz nicht überschreibt, folgt der Komponente. Dazu gehören Größe, Füllungen, Konturen mit Stärke, Ausrichtung, Enden, Verbindungen und Strichelung, Effekte, Deckkraft, Mischmodus, Eckenradien und Glättung, Layouteinstellungen und Raster, Beschnitt, gemeinsame Stile und Text, von Schrift und Größe bis zu Zeichenabstand, Zeilenhöhe, Groß-/Kleinschreibung, Auszeichnung, Ausrichtung und formatierten Bereichen.

Eine Ebene innerhalb einer Instanz übernimmt außerdem Position, Drehung, Spiegelungen, Constraints und Maske von der Komponente. Verschieben oder drehen Sie eine Ebene in der Komponente, bewegt sie sich in jeder Instanz. Hat eine Instanz eine andere Größe als ihre Komponente, wird die Ebene nach ihren Constraints platziert; eine rechts verankerte Ebene behält also ihren Abstand zum rechten Rand. Innerhalb von Auto-Layout platziert das Layout sie.

Die Synchronisierung läuft automatisch nach Aktualisierungen, Verschiebungen und Größenänderungen von Objekten innerhalb einer Komponente.

## Überschreibungen

Instanzen können einzelne Eigenschaften überschreiben, ohne die Synchronisierung zu unterbrechen. Ist eine Eigenschaft in einer Instanz überschrieben, wird sie bei der Synchronisierung übersprungen; andere Eigenschaften werden weiterhin von der Hauptkomponente aktualisiert.

### Überschreibbare Eigenschaften

Eine Ebene innerhalb einer Instanz kann ihren Namen, ihren Text, formatierte Bereiche und die Schrift überschreiben, außerdem jede oben genannte visuelle und Texteigenschaft, ihre Größe und ob sie sichtbar oder gesperrt ist. Position, Drehung, Spiegelungen, Constraints und Maske lassen sich nicht überschreiben: Sie kommen immer von der Komponente. Skripte, die Position, Drehung, Constraints oder Maske setzen, erhalten Figmas Fehlermeldung. Slot-Inhalte gehören der Instanz und bleiben bearbeitbar.

Überschreibungen in einer `.fig`-Datei kommen beim Öffnen als Überschreibungen zurück und werden so gespeichert, wie Figma sie schreibt.

### Neue Kinder

Fügen Sie einer Komponente ein Kind hinzu, erhalten alle vorhandenen Instanzen automatisch eine Kopie. Die Reihenfolge der Kinder in Instanzen entspricht immer der Komponente.

### Variablenmodi

Eine Instanz oder eine Ebene darin, die den Modus einer Variablensammlung setzt, behält diesen Modus und übernimmt für alle anderen Sammlungen weiterhin die Modi der Komponente. Ändern Sie den Dichte-Modus der Hauptkomponente, folgt eine Instanz, die nur ihr Thema gewechselt hat, der neuen Dichte.

### Instanz austauschen

Wählen Sie eine Instanz aus, auch eine verschachtelte, und klicken Sie auf die Tauschen-Schaltfläche in ihrem Kopf, um an ihrer Stelle eine andere Komponente anzuzeigen. Die Liste enthält jede Komponente des Dokuments; eine, die sich selbst enthalten würde, ist deaktiviert. Eine ausgetauschte verschachtelte Instanz bleibt ausgetauscht, wenn sich die umgebende Komponente ändert. Ist der Tausch mit einer Instanztausch-Eigenschaft verknüpft, zeigt der Kopf stattdessen die Eigenschaft.

### Eine Ebene innerhalb einer Instanz ersetzen

Kopieren Sie eine Ebene, wählen Sie eine Ebene innerhalb einer Instanz aus und drücken Sie <kbd>⌥</kbd><kbd>⇧</kbd><kbd>R</kbd> (<kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>) oder wählen Sie **Innerhalb der Instanz ersetzen** im Menü „Bearbeiten“ oder im Kontextmenü. Die kopierte Ebene nimmt Platz und Position der ausgewählten als Überschreibung der Instanz ein, ohne sie zu lösen: Der Rest der Instanz folgt weiter seiner Komponente, und der Ersatz bleibt bei Änderungen der Komponente erhalten, bis die Komponente die ersetzte Ebene löscht. Sind mehrere Ebenen ausgewählt, erhält jede ihre eigene Kopie. Ist nichts innerhalb einer Instanz ausgewählt, fügen die Tasten zum Ersetzen ein.

Wählen Sie den Ersatz aus und klicken Sie in seinem Kopf auf **Komponentenebene wiederherstellen**, um die Ebene der Komponente zurückzuholen. Ersetzungen werden in `.fig`-Dateien als Pairdraw-Plugin-Daten an der Instanz gespeichert; Figma zeigt stattdessen die Ebene der Komponente.

## Treffererkennung

Komponenten und Instanzen sind geschlossene Container: Ein Klick auf ein Kind wählt die Komponente selbst aus, nicht das Kind. Mit einem **Doppelklick** betreten Sie die Komponente und wählen Kinder darin aus.

## Darstellung

| Element | Aussehen |
|---------|------------|
| Komponentenbeschriftung | Violett mit Rautensymbol, immer sichtbar |
| Instanzbeschriftung | Violett mit Rautensymbol, immer sichtbar |
| Rand eines Komponentensatzes | Gestrichelter violetter Umriss |

## Tastenkürzel

| Aktion | macOS | Windows / Linux |
|--------|-------|-----------------|
| Komponente erstellen | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> | <kbd>Strg</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd> |
| Instanz lösen | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> | <kbd>Strg</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd> |
| Vorschau | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> | <kbd>Strg</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd> |

## Tipps

- Text in einer Instanz zu bearbeiten erzeugt eine Überschreibung; der Text wird bei Änderungen der Komponente nicht überschrieben.
- Mit Komponentensätzen ordnen Sie mehrdimensionale Varianten wie Größe, Zustand und Thema.
- Veröffentlichen Sie wiederverwendbare Assets aus ihrem Quelldokument; veröffentlichte Definitionen sind in nutzenden Dokumenten absichtlich schreibgeschützt.
- Prüfen Sie Updates vor dem Übernehmen, wenn eine Version eine genaue Variantenkombination entfernt.
- Alle Aktionen rund um Komponenten finden Sie unter [Kontextmenü](./context-menu).
