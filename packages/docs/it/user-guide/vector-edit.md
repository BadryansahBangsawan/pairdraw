---
title: Modifica vettoriale
description: Modificare punti, maniglie di Bézier e segmenti di un tracciato.
---

# Modifica vettoriale

## Entrare e uscire

1. Seleziona un oggetto vettoriale con Selezione.
2. Fai doppio clic sulla curva o premi <kbd>Enter</kbd>.
3. Premi <kbd>Escape</kbd> per tornare alla selezione normale.

In questa modalità contorno e punti sono modificabili direttamente. Gli angoli del riquadro di selezione non ridimensionano né ruotano l’oggetto.

## Punti

Fai clic su un punto per selezionarlo; usa <kbd>Shift</kbd> per aggiungerlo o rimuoverlo dalla selezione. Trascina per spostarlo. I segmenti collegati si aggiornano durante il movimento.

Premi <kbd>Delete</kbd> o <kbd>Backspace</kbd> per eliminare i punti selezionati.

## Maniglie di Bézier

| Comportamento | macOS | Windows / Linux |
|---------------|-------|-----------------|
| Curva continua | <kbd>⌘</kbd> + trascina | <kbd>Ctrl</kbd> + trascina |
| Angolo, maniglie indipendenti | <kbd>Option</kbd> + trascina | <kbd>Alt</kbd> + trascina |
| Mantieni direzione, cambia lunghezza | <kbd>Shift</kbd> + trascina | <kbd>Shift</kbd> + trascina |

## Segmenti

Fai clic su un segmento per selezionarlo. Trascinalo per incurvarlo; Pairdraw crea le maniglie necessarie. Fai doppio clic per aggiungere un punto.

## Tagliare, unire e rimodellare

- <kbd>X</kbd> attiva lo strumento Taglia. Fai clic su un segmento per tagliarlo in quel punto, o su un punto per separare i segmenti che vi si incontrano. <kbd>X</kbd>, <kbd>Escape</kbd> o un altro tasto strumento lo disattivano.
- Fai doppio clic su un punto per passare da punto morbido ad angolo e viceversa.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + doppio clic su un segmento ne rimuove le maniglie e lo raddrizza.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>J</kbd> unisce due estremi selezionati: se coincidono diventano un solo punto, altrimenti li collega un segmento dritto. Unire i due estremi di un tracciato lo chiude e lo riempie. Durante la modifica di un tracciato questa scorciatoia non apre la chat.
- <kbd>Option</kbd>/<kbd>Alt</kbd> + trascina trascina una copia dei punti o segmenti selezionati. La copia di un punto isolato resta collegata a esso.
- I tasti freccia spostano i punti selezionati della distanza impostata in Impostazioni → Editor, e con <kbd>Shift</kbd> della distanza grande.
- <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + trascina su un segmento lo incurva in modo che il punto afferrato segua il puntatore. Un estremo morbido resta morbido e l’altra sua maniglia ruota con esso. Con <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Option</kbd>/<kbd>Alt</kbd> le maniglie dei segmenti vicini restano ferme e gli estremi diventano angoli.
- Con due punti o segmenti selezionati compare un riquadro di trasformazione intorno a loro. Trascina un angolo o un lato per scalare i punti dal lato opposto; con <kbd>Shift</kbd> mantieni le proporzioni e con <kbd>Option</kbd>/<kbd>Alt</kbd> scali dal centro. Trascina appena fuori da un angolo per ruotarli attorno al centro del riquadro, con <kbd>Shift</kbd> a passi di 15°. Ogni trasformazione si annulla in un solo passaggio.

## Continuare tracciati aperti

Seleziona un’estremità e usa Penna per prolungare il tracciato. Fai clic sull’estremità opposta per chiudere la forma.
