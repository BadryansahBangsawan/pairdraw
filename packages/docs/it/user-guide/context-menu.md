---
title: Menu contestuale
description: Azioni del menu contestuale in Pairdraw — appunti, ordine di sovrapposizione, gruppi, componenti e altro.
---

# Menu contestuale

Fai clic con il pulsante destro nell’area di lavoro per aprire il menu contestuale. Se il puntatore è su un oggetto, Pairdraw lo seleziona prima; un clic destro in un’area libera annulla la selezione.

## Copia/Incolla come

Il sottomenu **Copia/Incolla come** offre altri formati degli appunti per gli oggetti selezionati:

| Azione | Scorciatoia (Mac) | Scorciatoia (Win/Linux) |
|--------|-------------------|-------------------------|
| Copia come testo | — | — |
| Copia come SVG | — | — |
| Copia come PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Copia come JSX | — | — |
| Copia come HTML | — | — |

- **Copia come testo**: copia il contenuto testuale visibile della selezione.
- **Copia come SVG**: copia l’albero degli oggetti come markup SVG.
- **Copia come PNG**: esegue il rendering a 2× e lo mette negli appunti di sistema (da incollare in Slack, Notion e simili).
- **Copia come JSX**: copia la rappresentazione Pairdraw JSX da usare con `renderJSX()`.
- **Copia come HTML**: copia un frammento HTML con stili in linea e immagini incorporate, pronto da incollare in una pagina o in un’email; funziona anche nei documenti di sola lettura.

## Esegui la nota come prompt

Quando sono selezionate solo note adesive e almeno una contiene testo, **Esegui la nota come prompt** invia il loro testo alla [chat con AI](../programmable/ai-chat) del documento, con un riferimento a ciascuna nota perché l’assistente sappia da quali note proviene. Compare solo nei documenti che puoi modificare. Se non hai ancora configurato un modello, Pairdraw cerca prima un agente di programmazione sul tuo computer e, se non ne trova, apre la configurazione guidata; poi invia il prompt.

## Appunti

| Azione | Scorciatoia (Mac) | Scorciatoia (Win/Linux) |
|--------|-------------------|-------------------------|
| Copia | <kbd>⌘</kbd><kbd>C</kbd> | <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Taglia | <kbd>⌘</kbd><kbd>X</kbd> | <kbd>Ctrl</kbd> + <kbd>X</kbd> |
| Incolla qui | <kbd>⌘</kbd><kbd>V</kbd> | <kbd>Ctrl</kbd> + <kbd>V</kbd> |
| Duplica | <kbd>⌘</kbd><kbd>D</kbd> | <kbd>Ctrl</kbd> + <kbd>D</kbd> |
| Elimina | ⌫ | <kbd>Backspace</kbd> / Canc |

Le azioni degli appunti sono disattivate quando non è selezionato nulla (tranne Incolla, disponibile quando gli appunti hanno un contenuto).

## Copiare e incollare le proprietà

| Azione | Scorciatoia (Mac) | Scorciatoia (Win/Linux) |
|--------|-------------------|-------------------------|
| Copia proprietà | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Alt</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Incolla proprietà | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>V</kbd> | <kbd>Alt</kbd> + <kbd>Ctrl</kbd> + <kbd>V</kbd> |

Entrambe si trovano nel sottomenu **Copia/Incolla come**.

- **Copia proprietà** mette il livello selezionato negli appunti di sistema come fa Figma, contrassegnato in modo che un normale Incolla lo ignori.
- **Incolla proprietà** applica l’aspetto dell’unico livello negli appunti a ogni livello selezionato, compresi quelli bloccati, in un solo passo di annullamento. Legge una copia fatta con Copia proprietà o con un normale Copia, qui o in Figma.
- L’aspetto comprende riempimenti, contorni, effetti, opacità, metodo di fusione, raggio degli angoli, stili e variabili collegati. Tra frame include disposizione automatica e griglie di layout, e tra livelli di testo lo stile del testo. Posizione, dimensioni, rotazione, nome e contenuto non cambiano mai, e le proprietà che un livello di testo varia da un carattere all’altro restano intatte.

## Ordine di sovrapposizione

| Azione | Scorciatoia |
|--------|-------------|
| Porta in primo piano | ] |
| Porta in secondo piano | [ |

Sposta l’oggetto selezionato in cima o in fondo all’elenco dei figli del suo genitore. Il menu offre anche **Porta avanti** e **Porta indietro** per spostarlo di un solo livello.

## Raggruppare

| Azione | Scorciatoia (Mac) | Scorciatoia (Win/Linux) |
|--------|-------------------|-------------------------|
| Raggruppa | <kbd>⌘</kbd><kbd>G</kbd> | <kbd>Ctrl</kbd> + <kbd>G</kbd> |
| Separa | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>G</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>G</kbd> |
| Aggiungi auto-layout | <kbd>⇧</kbd><kbd>A</kbd> | <kbd>Shift</kbd> + <kbd>A</kbd> |

- **Raggruppa** richiede 2 o più oggetti selezionati.
- **Separa** compare quando è selezionato un gruppo: i figli passano al genitore del gruppo.
- **Aggiungi auto-layout** racchiude la selezione in un nuovo frame con [disposizione automatica](./auto-layout).

## Azioni dei componenti

Le azioni dei componenti appaiono in viola, come il colore dei componenti.

| Azione | Scorciatoia (Mac) | Scorciatoia (Win/Linux) | Disponibile su |
|--------|-------------------|-------------------------|----------------|
| Crea componente | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd> | Qualsiasi selezione |
| Crea set di componenti | — | — | 2+ componenti selezionati |
| Crea istanza | — | — | Componenti (senza scorciatoia) |
| Vai al componente principale | — | — | Istanze |
| Scollega istanza | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd> | Istanze |

Vedi [Componenti](./components) per i dettagli sul lavoro con i componenti.

## Visibilità e blocco

| Azione | Scorciatoia (Mac) | Scorciatoia (Win/Linux) |
|--------|-------------------|-------------------------|
| Nascondi / Mostra | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>H</kbd> |
| Blocca / Sblocca | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>L</kbd> |

L’etichetta cambia in base allo stato attuale dell’oggetto (per esempio «Nascondi» per un oggetto visibile, «Mostra» per uno nascosto). Il blocco impedisce le modifiche accidentali.

## Spostare in un’altra pagina

Il sottomenu **Sposta nella pagina** elenca tutte le pagine tranne quella corrente. Scegli una pagina per trasferire gli oggetti selezionati nella sua area di lavoro, conservandone la geometria.

## Suggerimenti

- Un clic destro su un’area libera dà accesso a Incolla: utile per inserire contenuto in un punto preciso.
- Le azioni dei componenti compaiono solo quando servono (per esempio «Crea istanza» solo per i componenti).
- Il menu contestuale riporta le scorciatoie da tastiera: è un buon modo per scoprire quelle che non conosci ancora.
