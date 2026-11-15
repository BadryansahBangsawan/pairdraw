---
title: Renderer JSX
description: Creare design modificabili con la stessa libreria dichiarativa di authoring usata dagli agenti di Pairdraw.
---

# Renderer JSX

Il JSX di design di Pairdraw crea nodi della scena, non DOM del browser. Puoi usare alberi di componenti leggibili, espressioni JavaScript e funzioni riutilizzabili per costruire design modificabili.

## Creare design

Lo strumento `render` accetta stringhe JSX nella chat con AI e in MCP. Nel codice dell'applicazione o nelle librerie senza interfaccia, importa `Frame`, `Text` e gli altri export di authoring da `@pairdraw/design-jsx`, poi crea i nodi con `renderTree` o `renderJSX` da `@pairdraw/core/design-jsx`, che aggiungono icone, conversione SVG e layout. Per scrivere gli alberi come TSX, imposta `"jsxImportSource": "@pairdraw/design-jsx"` con `"jsx": "react-jsx"` in `tsconfig.json`, oppure aggiungi al file il commento `/** @jsxImportSource @pairdraw/design-jsx */`. L'ambiente di scripting determina quali API sono esposte a `eval`: lì gli export dei pacchetti non diventano automaticamente variabili globali.

Il [riferimento condiviso per l'authoring dei design](/reference/design-authoring) contiene esempi eseguibili, indicazioni sul layout e l'elenco della sintassi supportata. Viene generato dalla stessa sorgente usata dalla chat, da ACP, dai prompt di generazione del codice e dalla skill installabile per gli agenti.

## Elementi

Usa frame e testo per la composizione, nodi forma per la grafica, e veri componenti e istanze per i contenuti riutilizzabili dell'editor. Una funzione JavaScript da sola non crea l'identità di un componente. Vedi l'[elenco degli elementi](/reference/design-authoring#supported-syntax-inventory).

## Proprietà di stile

Usa Hug/Fill (nell'interfaccia **Adatta al contenuto** e **Riempi**) e flex o griglia per un dimensionamento guidato dal contenuto. Collega variabili semantiche invece di copiare i valori. Vedi [composizione e layout](/reference/design-authoring#composition-and-layout), [pittura e testo](/reference/design-authoring#paint-text-and-artwork) e [variabili e componenti](/reference/design-authoring#variables-and-components).

## Esportare in JSX

```sh
pairdraw export design.fig -f jsx                   # Pairdraw format
pairdraw export design.fig -f jsx --style tailwind  # Tailwind classes
```

Il JSX Pairdraw esportato può essere modificato e disegnato di nuovo nel documento. L'esportazione scrive livelli nascosti e bloccati, vincoli, limiti di dimensione, riempimenti sovrapposti, a sfumatura e immagine, contorni, effetti, maschere e collegamenti alle variabili, quindi disegnare un'esportazione li riproduce e `diff_jsx` mostra le modifiche a ciascuno di essi. Testo formattato con stili misti, tracciati vettoriali, griglie di layout, stili condivisi e definizioni delle proprietà dei componenti non vengono ancora scritti. Le istanze sono scritte come frame con il loro contenuto, così il JSX esportato è autonomo. Vedi [esportazioni dalla CLI](./cli/exporting).

## Confronto visivo

JSX rende le modifiche strutturali ai design revisionabili come codice. Usa `get_jsx` e `diff_jsx` per esaminare le modifiche, poi verifica il risultato effettivamente disegnato: un diff strutturale pulito non dimostra l'equivalenza visiva.
