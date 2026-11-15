---
title: Esaminare i file
description: Esplorare l'albero dei nodi, cercare per nome o tipo e analizzare le proprietà dal terminale.
---

# Esaminare i file

La CLI ti permette di esplorare i documenti di design senza aprire l'editor. Ogni comando funziona anche sull'app in esecuzione: basta omettere l'argomento del file.

::: tip Installazione

```sh
npm install -g @pairdraw/cli
# or
bun add -g @pairdraw/cli
```

:::

## Informazioni sul documento

Ottieni un riepilogo rapido: numero di pagine, totale dei nodi, font usati e dimensione del file.

```sh
pairdraw info design.fig
```

## Diagnostica dei font {#font-diagnostics}

Riporta gli stili dei font richiesti, le fonti disponibili, le sostituzioni e i livelli interessati:

```sh
pairdraw fonts design.fig
pairdraw fonts design.fig --json
pairdraw fonts --document-id tab-123 --page-id 0:1
```

In modalità file vengono controllate tutte le pagine del documento usando i font disponibili sull'host della CLI, senza scaricare font online. In modalità app viene riportato il documento o la pagina dell'app indicati, i cui font caricati possono essere diversi da quelli dell'host della CLI. Gli stili vengono riportati come `available`, `substituted` o `unresolved`; l'output JSON include `faithful`, `faces` e `issues`.

Usa le [regole sui font nell'esportazione](./exporting#font-substitution-policy) per ricevere un avviso o rifiutare le sostituzioni durante le esportazioni raster e PDF basate su file.

## Albero dei nodi

Stampa l'intera gerarchia dei nodi:

```sh
pairdraw tree design.fig
```

```
[0] [page] "Getting started" (0:46566)
  [0] [section] "" (0:46567)
    [0] [frame] "Body" (0:46568)
      [0] [frame] "Introduction" (0:46569)
        [0] [frame] "Introduction Card" (0:46570)
          [0] [frame] "Guidance" (0:46571)
```

## Trovare i nodi

Cerca per tipo:

```sh
pairdraw find design.fig --type TEXT
```

Cerca per nome:

```sh
pairdraw find design.fig --name "Button"
```

Puoi combinare i due flag per restringere ancora i risultati.

## Interrogare con XPath

Usa i selettori XPath per trovare i nodi in base a tipo, attributi e struttura dell'albero:

```sh
pairdraw query design.fig "//FRAME"
```

### Schemi utili

**Per tipo:**

```sh
pairdraw query design.fig "//TEXT"                    # All text nodes
pairdraw query design.fig "//COMPONENT"               # All components
pairdraw query design.fig "//INSTANCE"                # All instances
```

**Per attributi:**

```sh
pairdraw query design.fig "//FRAME[@width < 300]"                # Frames under 300px wide
pairdraw query design.fig "//*[@cornerRadius > 0]"               # Rounded corners
pairdraw query design.fig "//*[@visible = false]"                # Hidden nodes
pairdraw query design.fig "//TEXT[@fontSize >= 24]"              # Large text
pairdraw query design.fig "//*[@opacity < 1]"                    # Semi-transparent nodes
```

**Per nome e contenuto del testo:**

```sh
pairdraw query design.fig "//TEXT[contains(@name, 'Button')]"    # Name contains 'Button'
pairdraw query design.fig "//TEXT[contains(@text, 'Hello')]"     # Text content contains 'Hello'
```

**Per gerarchia:**

```sh
pairdraw query design.fig "//SECTION//TEXT"            # Text inside sections
pairdraw query design.fig "//FRAME/TEXT"               # Direct text children of frames
pairdraw query design.fig "//COMPONENT_SET//INSTANCE"  # Instances inside component sets
```

### Attributi interrogabili

`name`, `width`, `height`, `x`, `y`, `visible`, `opacity`, `cornerRadius`, `fontSize`, `fontFamily`, `fontWeight`, `layoutMode`, `itemSpacing`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`, `strokeWeight`, `rotation`, `locked`, `blendMode`, `text`, `lineHeight`, `letterSpacing`

### Esempio di output

```
  Found 5 nodes

[0] [frame] "Logo  92×32" (0:9)
[1] [frame] "logo-short-6  31×32" (0:10)
[2] [frame] "wrapper  128×73" (0:20)
[3] [frame] "pen-drawing  148×52" (0:21)
[4] [frame] "surprised-emoji  32×32" (0:26)
```

## Dettagli di un nodo

Esamina tutte le proprietà di un nodo specifico tramite il suo ID:

```sh
pairdraw node design.fig --id 1:23
```

## Pagine

Elenca tutte le pagine del documento:

```sh
pairdraw pages design.fig
```

## Variabili

Elenca le variabili di design e le relative raccolte:

```sh
pairdraw variables design.fig
```

`pairdraw formats` mostra invece i formati di file registrati e le relative capacità di lettura e scrittura.

## Modalità app in esecuzione

Quando l'app desktop è in esecuzione, ometti l'argomento del file: la CLI si collega tramite RPC e lavora sull'area di lavoro attiva.

```sh
pairdraw documents list    # list open document/page IDs
pairdraw tree              # inspect the active live document
pairdraw tree --document-id tab-123 --page-id 0:1
pairdraw eval --document-id tab-123 --page-id 0:1 -c "..."
```

Nei flussi di lavoro con agenti usa `pairdraw documents list --json`, poi passa esplicitamente `--document-id` e `--page-id` invece di affidarti alla scheda o alla pagina attiva visibile. Per aprire, salvare, cambiare e chiudere documenti, annullare, modificare le impostazioni o chiamare qualsiasi strumento dell'editor, vedi [Controllare l'app](/programmable/cli/app-control).

## Lint dei design

Controlla i documenti per problemi di denominazione, layout, struttura e accessibilità:

```sh
pairdraw lint design.fig
pairdraw lint design.pen --preset strict
pairdraw lint design.fig --rule color-contrast
pairdraw lint design.fig --list-rules
pairdraw lint design.fig --fix -o fixed.fig
```

Usa `--json` per un output leggibile dalle macchine; ogni messaggio include `fix` e `suggestions` come dati. `--fix` applica le correzioni sicure (collega i colori alla variabile di colore corrispondente e arrotonda la geometria a pixel interi) e scrive il risultato nel file `.fig` indicato con `-o`.

## Output JSON

Tutti i comandi supportano `--json` per un output leggibile dalle macchine: passalo a `jq`, usalo negli script di CI o elaboralo con altri strumenti.

```sh
pairdraw tree design.fig --json | jq '.[] | .name'
```

Usa `pairdraw --help`, o aggiungi `--help` a un sottocomando, per vedere tutte le opzioni.
