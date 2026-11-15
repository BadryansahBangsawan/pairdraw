---
title: Analizzare i design
description: Esaminare colori, tipografia, spaziature e strutture ripetute nei file .fig.
---

# Analizzare i design

I comandi `analyze` esaminano un intero design system dal terminale: trovano le incoerenze, estraggono la palette reale e segnalano i componenti che aspettano di essere estratti.

## Colori

```sh
pairdraw analyze colors design.fig
```

Trova tutti i colori del file, ne conta gli utilizzi e mostra un istogramma visivo:

```
#1d1b20  ██████████████████████████████ 17155×
#49454f  ██████████████████████████████ 9814×
#ffffff  ██████████████████████████████ 8620×
#6750a4  ██████████████████████████████ 3967×
```

## Tipografia

```sh
pairdraw analyze typography design.fig
```

Elenca ogni combinazione di famiglia, dimensione e peso del font con il numero di utilizzi. È utile per individuare stili di testo isolati che andrebbero unificati.

## Spaziatura

```sh
pairdraw analyze spacing design.fig
```

Esamina i valori di spaziatura e di spaziatura interna nei frame con Auto-layout. Aiuta a trovare incoerenze nella scala delle spaziature, per esempio una spaziatura isolata di `13px` tra valori che altrimenti sono `8/16/24`.

## Strutture ripetute

```sh
pairdraw analyze clusters design.fig
```

Trova schemi di nodi ripetuti che potrebbero essere estratti in componenti:

```
3771× frame "container" (100% match)
     size: 40×40, structure: Frame > [Frame]

2982× instance "Checkboxes" (100% match)
     size: 48×48, structure: Instance > [Frame]
```

## Output JSON

Tutti i comandi `analyze` supportano `--json` per un output leggibile dalle macchine:

```sh
pairdraw analyze colors design.fig --json
```

Passalo a `jq`, usalo nei controlli di CI o in script che impongono un limite al numero di token di design.
