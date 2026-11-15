---
title: Strumento Penna
description: Disegnare tracciati vettoriali e curve di Bézier con lo strumento Penna, e a mano libera con la Matita.
---

# Strumento Penna

Lo strumento Penna crea tracciati usando il modello di rete vettoriale compatibile con il formato `.fig` di Figma.

## Attivare

Premi <kbd>P</kbd> per attivare lo strumento Penna.

## Disegnare punti

- Un **clic** crea un punto angolare (segmento diritto).
- **Fai clic e trascina** per creare un punto curvo con maniglie di Bézier: direzione e lunghezza del trascinamento determinano la forma della curva.
  - **Tieni premuto <kbd>Space</kbd>** durante il trascinamento (senza rilasciare il pulsante del mouse) per spostare il punto stesso.

Fai clic su più punti per costruire il tracciato un segmento alla volta. Mentre muovi il puntatore, una linea di anteprima lo collega all’ultimo punto creato.

## Chiudere un tracciato

Fai clic sul **primo punto** del tracciato per chiuderlo ad anello. I tracciati chiusi possono essere riempiti.

## Tracciati aperti

Premi <kbd>Enter</kbd> o <kbd>Escape</kbd> per confermare il tracciato corrente come tracciato aperto. I tracciati aperti mostrano solo il contorno e non vengono riempiti.

## Continuare un tracciato

Seleziona un tracciato aperto e attiva Penna. Fai clic su una delle estremità per continuare da lì. Durante la [modifica vettoriale](./vector-edit) puoi muovere le maniglie insieme o separatamente.

## Reti vettoriali

I tracciati di Pairdraw usano le reti vettoriali, un modello più flessibile di un semplice elenco di punti che supporta tracciati ramificati e topologie complesse. È lo stesso modello di Figma, quindi i tracciati si conservano intatti nei file `.fig`.

## Matita

Premi <kbd>⇧</kbd><kbd>P</kbd>, o scegli **Matita** dal menu dello strumento Penna nella barra degli strumenti, per disegnare a mano libera. Ogni tratto diventa un livello vettoriale a sé, levigato in curve che puoi modificare come qualsiasi altro tracciato, e la matita resta attiva per il tratto successivo.

- Ingrandisci per conservare più dettagli: la curva segue il tratto entro pochi pixel dello schermo.
- Tieni premuto <kbd>Shift</kbd> per disegnare dritto, in orizzontale o in verticale, dal punto in cui l’hai premuto.
- Termina un tratto dove è iniziato per chiuderlo ad anello.
- Un tratto finisce nel frame che lo contiene interamente, altrimenti sulla pagina.
- I nuovi tratti contrastano con ciò su cui vengono disegnati. Se cambi il contorno dell’ultimo tratto disegnato, la matita mantiene quello stile.

## Scorciatoie da tastiera

| Azione | macOS | Windows / Linux |
|--------|-------|-----------------|
| Strumento Penna | <kbd>P</kbd> | <kbd>P</kbd> |
| Matita | <kbd>⇧</kbd><kbd>P</kbd> | <kbd>Shift</kbd> + <kbd>P</kbd> |
| Confermare il tracciato aperto | <kbd>Escape</kbd> | <kbd>Escape</kbd> |

## Suggerimenti

- La linea di anteprima parte sempre dall’ultimo punto creato: non salta a (0,0).
- Trascina più a lungo quando crei un punto curvo per allargare la curva.
- Dopo aver creato un tracciato, regola riempimento, contorno ed effetti nel pannello delle proprietà.
