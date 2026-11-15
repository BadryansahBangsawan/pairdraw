---
title: Collaborazione
description: Cursori e modalità di inseguimento degli agenti AI, e modifica in tempo reale dei documenti Cloud tramite un server Pairdraw Cloud ospitato da te. Le stanze peer-to-peer sono disattivate nelle build di Pairdraw.
---

# Collaborazione

::: info Le stanze peer-to-peer sono disattivate in Pairdraw
Le build di Pairdraw disattivano le stanze peer-to-peer in tempo reale (`COLLABORATION_INCLUDED` in `src/constants.ts`). Per i documenti locali non c'è il popover **Condividi**, non si entra con un link o un ID di stanza, non c'è la chiamata vocale della stanza e nelle impostazioni non c'è un nome per la collaborazione.

Cosa resta: gli agenti AI mostrano il loro cursore sull'area di lavoro e possono essere seguiti, e i documenti Cloud vengono modificati in tempo reale da chiunque li apra tramite il proprio [server Pairdraw Cloud](/reference/self-hosting-cloud).
:::

## Agenti sull'area di lavoro

La chat con AI integrata, le chat ACP e Pi harness e ogni client MCP collegato compaiono come cursori sui livelli che leggono o modificano, ciascuno con un'etichetta contornata che mostra una scintilla e un nome in codice come *Fern*. Mentre la chat trasmette JSX, il suo cursore percorre gli elementi man mano che compaiono e li contorna. Gli agenti disegnano cursore e contorni in viola.

Il tuo avatar compare nella barra superiore solo finché elenca i tuoi agenti, oppure mentre qualcun altro ha aperto lo stesso documento Cloud. Un avatar conta gli agenti eseguiti da quella persona; passaci sopra il puntatore per vedere ogni agente, cosa sta facendo e su quale pagina. Fai clic su uno dei tuoi agenti per rinominarlo.

**Visualizza → Cursori multigiocatore** (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd>) nasconde e mostra i cursori degli agenti e delle persone.

## Modalità di inseguimento

I tuoi agenti, la chat con AI e i client MCP come Claude Code o Cursor vengono seguiti automaticamente mentre lavorano, così ciò che modificano resta in vista. Puoi disattivarlo con il pulsante di localizzazione (**Segui gli agenti mentre lavorano**) nell'intestazione della chat. Se smetti di seguire un agente mentre lavora, non viene più seguito finché non ha finito e torna a esserlo alla sua esecuzione successiva.

Fai clic su **Segui** accanto a un agente nell'elenco del suo avatar per tenere in vista la pagina e i livelli che sta modificando; l'inseguimento continua tra una risposta e l'altra e termina quando l'agente se ne va. In un documento Cloud, fai clic sull'avatar di una persona per seguire la sua inquadratura: l'area di lavoro si sposta e cambia zoom come la sua vista, e una cornice del suo colore con una barra «Stai seguendo …» indica chi stai seguendo. Per smettere, fai di nuovo clic sull'avatar, premi <kbd>Esc</kbd> oppure fai clic, scorri, cambia zoom o pagina tu stesso.

Con le altre persone in un documento Cloud vengono condivisi solo nome, tipo, modello, stato, pagina, posizione e livelli modificati di un agente, mai richieste o risposte.

## Documenti Cloud

Aprire un documento Cloud lo collega alla sua stanza sul relay del suo server, così chiunque lo abbia aperto vede in tempo reale le modifiche, i cursori, le selezioni e i commenti degli altri. **Condividi** su un documento Cloud apre la finestra di condivisione, dove il server decide chi può aprirlo: link di sola visualizzazione, di commento o di modifica, inviti e link a un'istantanea di una versione salvata. Vedi [Pairdraw Cloud](/user-guide/pairdraw-cloud) per il flusso di lavoro e [Architettura Cloud](/development/cloud#live-collaboration) per il relay.

## Come funziona la sincronizzazione

Lo stato del documento usa un CRDT (conflict-free replicated data type), quindi le modifiche simultanee si uniscono automaticamente senza conflitti.

Anche lo spostamento e il riordino dei livelli si uniscono. Ogni livello ricorda ogni genitore in cui è stato spostato e la sua posizione tra i fratelli, e ogni partecipante ne ricava lo stesso albero dei livelli ([il CRDT ad albero di Evan Wallace](https://madebyevan.com/algos/crdt-mutable-tree-hierarchy/)). Spostamenti, riordini e nuovi livelli di persone diverse vengono tutti applicati; se due persone spostano lo stesso livello nello stesso momento, vince lo stesso spostamento per tutti. Se spostamenti simultanei metterebbero due livelli l'uno dentro l'altro, il più recente viene annullato, e un livello il cui nuovo genitore è stato eliminato nel frattempo torna dov'era.

Chi modifica insieme un documento ha bisogno di una versione di Pairdraw che registri l'albero dei livelli nello stesso modo; le versioni che lo registrano in modo diverso non vedono le modifiche le une delle altre.

## Stanze peer-to-peer (non presenti nelle build di Pairdraw)

Il codice delle stanze resta in `src/app/collab/**`, perché su di esso si basano i documenti Cloud e la presenza degli agenti. Una build con `COLLABORATION_INCLUDED` impostato a `true` riporta le stanze peer-to-peer: **Condividi** mette un documento locale in una stanza il cui link (`/rooms/<room-id>` nel browser, `pairdraw://join?room=<room-id>` nell'app desktop) può essere aperto da chiunque, i partecipanti si collegano direttamente tramite WebRTC con Trystero e ogni dispositivo conserva la propria copia della stanza. Pairdraw non distribuisce né supporta build di questo tipo.
