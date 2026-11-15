---
title: Zusammenarbeit
description: KI-Agenten auf der Arbeitsfläche verfolgen und Cloud-Dokumente gemeinsam bearbeiten.
---

# Zusammenarbeit

Live-Räume gehören nicht zu Pairdraw: Für lokale Dokumente gibt es kein Teilen-Popover, keinen Beitritt per Link oder Raumkennung, keinen Sprachanruf im Raum und keinen Namen für die Zusammenarbeit in den Einstellungen. Gemeinsam bearbeiten Sie Dokumente über [Pairdraw Cloud](/user-guide/pairdraw-cloud#edit-together) auf dem Cloud-Server Ihres Teams. Die Anwesenheitsebene bleibt erhalten, weil KI-Agenten ihre Zeiger darüber zeigen.

## Agenten auf der Arbeitsfläche

Der integrierte AI-Chat, ACP- und Pi-Harness-Chats und jeder verbundene MCP-Client erscheinen als Zeiger an den Ebenen, die sie lesen oder bearbeiten; ihre umrandete Beschriftung zeigt ein Funkelsymbol und einen Rufnamen wie *Fern*. Während der Chat JSX streamt, wandert sein Zeiger durch die Elemente, sobald sie erscheinen, und umrandet sie. Agenten zeichnen Zeiger und Umrandung in Violett.

**Ansicht → Multiplayer-Cursor** blendet die Zeiger von Agenten und anderen Personen auf der Arbeitsfläche aus und wieder ein.

## Agenten folgen

Ihren eigenen Agenten, dem AI-Chat und MCP-Clients wie Claude Code oder Cursor, folgt die Ansicht automatisch, während sie arbeiten, sodass im Blick bleibt, was sie bearbeiten. Abschalten lässt sich das mit der Schaltfläche **Agenten bei der Arbeit folgen** (Fadenkreuz) in der Kopfzeile des Chats. Beenden Sie das Folgen, während ein Agent arbeitet, bleibt er bis zum Ende seiner Arbeit unbeachtet und wird beim nächsten Durchlauf wieder verfolgt.

Ihr eigener Avatar erscheint in der oberen Leiste nur, solange er Ihre Agenten auflistet. Beim Daraufzeigen sehen Sie jeden Agenten, seine Tätigkeit und die jeweilige Seite; mit **Folgen** neben einem Agenten bleiben die Seite und die Ebenen, die er bearbeitet, im Blick. Die Verfolgung läuft zwischen seinen Antworten weiter und endet, wenn er geht. Ein Klick auf einen Ihrer Agenten benennt ihn um.

## In Cloud-Dokumenten

Wer ein Cloud-Dokument geöffnet hat, sieht die Zeiger, Auswahlen und Agenten der anderen Personen darin. Ein Avatar zählt die Agenten, die die Person ausführt, und nennt sie in der Leiste „Du folgst …“, sodass erkennbar ist, wem ein Agent gehört. Geteilt werden nur Name, Art, Modell, Status, Seite, Position und bearbeitete Ebenen eines Agenten, niemals Prompts oder Antworten.

Ein Klick auf einen Avatar folgt der Ansicht dieser Person. Position und Zoom werden angepasst, und ein Rahmen in ihrer Farbe mit einer Leiste „Du folgst …“ zeigt, wem Sie folgen. Zum Beenden klicken Sie erneut auf den Avatar, drücken <kbd>Esc</kbd> oder klicken, scrollen, zoomen oder wechseln selbst die Seite.

## Technische Grundlage

Ein Cloud-Dokument synchronisiert seinen Zustand mit Yjs als CRDT über den Cloud-Server, der gleichzeitige Änderungen automatisch zusammenführt.

Auch das Verschieben und Umordnen von Ebenen wird zusammengeführt. Jede Ebene merkt sich jedes Elternelement, in das sie verschoben wurde, und ihre Position unter ihren Geschwistern; jeder Teilnehmer leitet daraus denselben Ebenenbaum ab ([Evan Wallaces Baum-CRDT](https://madebyevan.com/algos/crdt-mutable-tree-hierarchy/)). Verschiebungen, Umordnungen und neue Ebenen verschiedener Personen werden alle übernommen; verschieben zwei Personen gleichzeitig dieselbe Ebene, setzt sich bei allen dieselbe Verschiebung durch. Würden gleichzeitige Verschiebungen zwei Ebenen ineinander legen, wird die spätere rückgängig gemacht, und eine Ebene, deren neues Elternelement inzwischen gelöscht wurde, kehrt an ihren vorherigen Platz zurück.

Alle, die ein Dokument gemeinsam bearbeiten, brauchen eine Pairdraw-Version, die den Ebenenbaum auf dieselbe Weise speichert.
