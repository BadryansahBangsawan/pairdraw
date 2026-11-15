---
title: Collaborazione
description: Segui gli agenti AI sull’area di lavoro e modifica insieme i documenti Cloud.
---

# Collaborazione

Le stanze live non fanno parte di Pairdraw: per i documenti locali non c’è il popover di condivisione, non si entra con un link o un identificatore di stanza, non c’è la chiamata vocale della stanza e nelle impostazioni non c’è un nome per la collaborazione. Per modificare un documento insieme ad altre persone usa [Pairdraw Cloud](/user-guide/pairdraw-cloud#edit-together) sul server Cloud del tuo team. Il livello di presenza resta, perché gli agenti AI mostrano i loro cursori attraverso di esso.

## Agenti sull’area di lavoro

La chat AI integrata, le chat ACP e Pi harness e ogni client MCP collegato compaiono come cursori sui livelli che leggono o modificano, con un’etichetta contornata che mostra una scintilla e un nome in codice come *Fern*. Mentre la chat trasmette JSX, il suo cursore percorre gli elementi man mano che compaiono e li contorna. Gli agenti disegnano cursore e contorno in viola.

**Visualizza → Cursori multigiocatore** nasconde e mostra i cursori degli agenti e delle altre persone sull’area di lavoro.

## Seguire gli agenti

I tuoi agenti, la chat AI e i client MCP come Claude Code o Cursor, vengono seguiti automaticamente mentre lavorano, così ciò che modificano resta in vista. Puoi disattivarlo con il pulsante **Segui gli agenti mentre lavorano** (il mirino) nell’intestazione della chat. Se smetti di seguire un agente mentre lavora, non viene più seguito finché non ha finito e torna a esserlo alla sua esecuzione successiva.

Il tuo avatar compare nella barra superiore solo finché elenca i tuoi agenti. Passaci sopra il puntatore per vedere ogni agente, cosa sta facendo e su quale pagina, e fai clic su **Segui** accanto a un agente per tenere in vista la pagina e i livelli che sta modificando; il seguito continua tra una risposta e l’altra e termina quando l’agente se ne va. Fai clic su uno dei tuoi agenti per rinominarlo.

## Nei documenti Cloud

Chi ha aperto un documento Cloud vede i cursori, le selezioni e gli agenti delle altre persone che lo hanno aperto. Un avatar conta gli agenti eseguiti da quella persona, e la barra «Stai seguendo …» indica chi esegue ciascun agente, così si capisce a chi appartiene.

Fai clic sull’avatar di una persona nella barra superiore per seguire la sua inquadratura. L’area di lavoro si sposta e cambia zoom come la sua vista, e una cornice del suo colore con una barra «Stai seguendo …» indica chi stai seguendo. Per smettere, fai di nuovo clic sull’avatar, premi <kbd>Esc</kbd> oppure fai clic, scorri, cambia zoom o pagina.

## Architettura

Un documento Cloud sincronizza il suo stato con Yjs, un CRDT, attraverso il server Cloud, e le modifiche simultanee si uniscono automaticamente.

Anche lo spostamento e il riordino dei livelli si uniscono. Ogni livello ricorda ogni genitore in cui è stato spostato e la sua posizione tra i fratelli, e ogni partecipante ne ricava lo stesso albero dei livelli ([il CRDT ad albero di Evan Wallace](https://madebyevan.com/algos/crdt-mutable-tree-hierarchy/)). Spostamenti, riordini e nuovi livelli di persone diverse vengono tutti applicati; se due persone spostano lo stesso livello nello stesso momento, vince lo stesso spostamento per tutti. Se spostamenti simultanei metterebbero due livelli l’uno dentro l’altro, il più recente viene annullato, e un livello il cui nuovo genitore è stato eliminato nel frattempo torna dov’era.

Chi modifica insieme un documento ha bisogno di una versione di Pairdraw che registri l’albero dei livelli nello stesso modo.

## Privacy

Degli agenti vengono condivisi solo nome, tipo, modello, stato, pagina, posizione e livelli modificati, mai richieste o risposte. I documenti Cloud restano sul server Cloud scelto da te o dal tuo team.
