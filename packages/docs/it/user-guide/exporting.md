---
title: Esportare
description: Esportare la selezione in PNG, JPG, WEBP o SVG e salvare file `.fig`.
---

# Esportare

## Esportazione di immagini

Seleziona un oggetto e apri **Esporta** nel pannello delle proprietà. Ogni impostazione definisce formato (PNG, JPG, WEBP, SVG, PDF o HTML), scala o larghezza esplicita, suffisso del nome e qualità per JPG/WEBP.

Un oggetto può avere più impostazioni. L’anteprima appare su uno sfondo a scacchi per verificare la trasparenza.

Puoi anche aprire **Esporta…** dal menu contestuale.

L’app non offre l’esportazione in PowerPoint (`.pptx`) né in draw.io. La [CLI](/reference/cli#export) esporta ancora entrambi: `pairdraw export design.fig -f pptx` o `-f drawio`.

## HTML, PDF e qualità

- **Le righe JPG e WEBP** hanno un campo qualità da 1 a 100 (90 se non modificato), salvato con il livello.
- **PDF** con più livelli selezionati crea un solo PDF con una pagina per livello, nell’ordine di selezione, ciascuna grande quanto il suo livello.
- **File › Esporta cornici in PDF…** salva le cornici della pagina in un solo PDF, una pagina per cornice nell’ordine dei livelli, ciascuna grande quanto la sua cornice. Contano anche le cornici dentro le sezioni; forme, testi e gruppi sciolti no. Con livelli selezionati, si esportano solo quelli.
- **HTML** scrive il livello come pagina web. Il pulsante delle opzioni accanto al formato sceglie se includere la struttura HTML (una pagina intera o un frammento da incollare in una pagina), lo stile CSS o Tailwind, immagini incorporate o file separati (salvati insieme in un `.zip`) e se scrivere come attributi i nomi dei livelli (`data-name`, attivo per impostazione predefinita) e gli ID dei livelli (`data-pairdraw-node-id`, disattivo per impostazione predefinita). La vista HTML del pannello Codice esporta allo stesso modo, con lo stile che mostra.
- Nel pannello Codice i componenti Vue e React possono prendere le icone da Lucide, Heroicons o Font Awesome invece che da Iconify, e i componenti React anche da React Icons; un’icona che il pacchetto non ha resta su Iconify.

## Copia come

Il menu contestuale copia la selezione come testo, SVG, PNG o JSX.

## Salvare documenti

**Salva** aggiorna il file corrente. **Salva con nome…** sceglie una nuova posizione. Tauri usa finestre native; Chrome ed Edge possono usare File System Access API; gli altri browser scaricano il file.

I file `.fig` esportati includono dati Kiwi, compressione Zstandard e miniatura. Componenti e insiemi vengono conservati per riaprire il file in Figma.

## Scegliere il formato

- PNG conserva la trasparenza ed è adatto alle interfacce.
- JPG riduce le dimensioni delle fotografie.
- WEBP offre una buona compressione per il Web.
- SVG mantiene vettori modificabili ed è adatto a icone e codice.
