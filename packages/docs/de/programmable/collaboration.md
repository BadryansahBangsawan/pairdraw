---
title: Zusammenarbeit
description: Zeiger und Folgemodus von KI-Agenten sowie gemeinsames Live-Bearbeiten von Cloud-Dokumenten über einen selbst betriebenen Pairdraw-Cloud-Server. Peer-to-Peer-Räume sind in Pairdraw-Builds abgeschaltet.
---

# Zusammenarbeit

::: info Peer-to-Peer-Räume sind in Pairdraw abgeschaltet
Pairdraw-Builds schalten Live-Räume per Peer-to-Peer ab (`COLLABORATION_INCLUDED` in `src/constants.ts`). Für lokale Dokumente gibt es kein Teilen-Popover, keinen Beitritt per Link oder Raumkennung, keinen Sprachanruf im Raum und keinen Namen für die Zusammenarbeit in den Einstellungen.

Erhalten bleibt: KI-Agenten zeigen ihre Zeiger auf der Arbeitsfläche und lassen sich verfolgen, und Cloud-Dokumente bearbeiten alle, die sie öffnen, live über ihren eigenen [Pairdraw-Cloud-Server](/reference/self-hosting-cloud).
:::

## Agenten auf der Arbeitsfläche

Der integrierte AI-Chat, ACP- und Pi-Harness-Chats und jeder verbundene MCP-Client erscheinen als Zeiger an den Ebenen, die sie lesen oder bearbeiten; ihre umrandete Beschriftung zeigt ein Funkelsymbol und einen Rufnamen wie *Fern*. Während der Chat JSX streamt, wandert sein Zeiger durch die Elemente, sobald sie erscheinen, und umrandet sie. Agenten zeichnen Zeiger und Umrandung in Violett.

Ihr eigener Avatar erscheint in der oberen Leiste nur, solange er Ihre Agenten auflistet oder jemand anderes dasselbe Cloud-Dokument geöffnet hat. Ein Avatar zählt die Agenten, die die Person ausführt; beim Daraufzeigen sehen Sie jeden Agenten, seine Tätigkeit und die jeweilige Seite. Ein Klick auf einen Ihrer eigenen Agenten benennt ihn um.

**Ansicht → Multiplayer-Cursor** (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd>) blendet die Zeiger von Agenten und Personen aus und wieder ein.

## Folgemodus {#follow-mode}

Ihren eigenen Agenten, dem AI-Chat und MCP-Clients wie Claude Code oder Cursor, folgt die Ansicht automatisch, während sie arbeiten, sodass im Blick bleibt, was sie bearbeiten. Abschalten lässt sich das mit der Schaltfläche **Agenten bei der Arbeit folgen** (Fadenkreuz) in der Kopfzeile des Chats. Beenden Sie das Folgen, während ein Agent arbeitet, bleibt er bis zum Ende seiner Arbeit unbeachtet und wird beim nächsten Durchlauf wieder verfolgt.

Mit **Folgen** neben einem Agenten in der Liste seines Avatars bleiben die Seite und die Ebenen, die er bearbeitet, im Blick; das Folgen läuft zwischen seinen Antworten weiter und endet, wenn er geht. In einem Cloud-Dokument folgt ein Klick auf den Avatar einer Person deren Ansicht: Ihre Arbeitsfläche verschiebt und zoomt sich passend zu ihrer Ansicht, und ein Rahmen in ihrer Farbe mit einer Leiste „Du folgst …“ zeigt, wem Sie folgen. Zum Beenden klicken Sie erneut auf den Avatar, drücken <kbd>Esc</kbd> oder klicken, scrollen, zoomen oder wechseln selbst die Seite.

In einem Cloud-Dokument werden von einem Agenten nur Name, Art, Modell, Status, Seite, Position und bearbeitete Ebenen mit anderen geteilt, niemals Prompts oder Antworten.

## Cloud-Dokumente

Das Öffnen eines Cloud-Dokuments tritt seinem Raum auf dem Relay seines Servers bei, sodass alle, die es geöffnet haben, die Änderungen, Zeiger, Auswahlen und Kommentare der anderen sehen, sobald sie entstehen. **Teilen** an einem Cloud-Dokument öffnet seinen Teilen-Dialog, in dem der Server entscheidet, wer es öffnen darf: Links zum Ansehen, Kommentieren oder Bearbeiten, Einladungen und Snapshot-Links auf eine gespeicherte Version. Den Ablauf beschreibt [Pairdraw Cloud](/user-guide/pairdraw-cloud#edit-together), das Relay die [Cloud-Architektur](/development/cloud#live-collaboration).

## So funktioniert die Synchronisierung

Der Dokumentzustand verwendet ein CRDT (konfliktfrei replizierter Datentyp), sodass gleichzeitige Änderungen automatisch und ohne Konflikte zusammengeführt werden.

Auch das Verschieben und Umordnen von Ebenen wird zusammengeführt. Jede Ebene merkt sich jedes Elternelement, in das sie verschoben wurde, und ihre Position unter ihren Geschwistern; jeder Teilnehmer leitet daraus denselben Ebenenbaum ab ([Evan Wallaces Baum-CRDT](https://madebyevan.com/algos/crdt-mutable-tree-hierarchy/)). Verschiebungen, Umordnungen und neue Ebenen verschiedener Personen werden alle übernommen; verschieben zwei Personen gleichzeitig dieselbe Ebene, setzt sich bei allen dieselbe Verschiebung durch. Würden gleichzeitige Verschiebungen zwei Ebenen ineinander legen, wird die spätere rückgängig gemacht, und eine Ebene, deren neues Elternelement inzwischen gelöscht wurde, kehrt an ihren vorherigen Platz zurück.

Alle, die ein Dokument gemeinsam bearbeiten, brauchen eine Pairdraw-Version, die den Ebenenbaum auf dieselbe Weise speichert; Versionen, die ihn anders speichern, sehen die Änderungen der anderen nicht.

## Peer-to-Peer-Räume (nicht in Pairdraw-Builds)

Der Raumcode bleibt in `src/app/collab/**`, weil Cloud-Dokumente und die Anwesenheit von Agenten darauf laufen. Ein Build mit `COLLABORATION_INCLUDED` auf `true` bringt Peer-to-Peer-Räume zurück: Teilen bringt ein lokales Dokument in einen Raum, dessen Link (`/rooms/<room-id>` im Browser, `pairdraw://join?room=<room-id>` in der Desktop-App) jeder öffnen kann; Teilnehmer verbinden sich über Trystero direkt per WebRTC, und jedes Gerät behält seine eigene Kopie des Raums. Pairdraw liefert solche Builds weder aus noch unterstützt es sie.
