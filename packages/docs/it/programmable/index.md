---
layout: doc
title: Automazione
description: Chat con AI, CLI, renderer JSX, server MCP e le altre interfacce di automazione costruite sul motore dell'editor Pairdraw.
---

# Automazione

Pairdraw tratta i file di design come dati. Ogni operazione disponibile nell'editor (creare forme, impostare riempimenti, gestire l'Auto-layout, esportare risorse) è disponibile anche dal terminale, dagli agenti AI e dal codice. Nessun plugin da installare, nessuna chiave API, nessuna lista d'attesa.

L'interfaccia dell'editor e le interfacce di automazione usano lo stesso motore. Se puoi farlo con un clic, puoi farlo con uno script.

## L'idea più ampia

Pairdraw non vuole essere solo un'app di design.

Vuole essere anche un insieme di strumenti: qualcosa che puoi incorporare in altri prodotti, avvolgere con la tua interfaccia e usare per costruire flussi di editing adatti al tuo settore.

Per questo l'automazione è importante. L'app, la CLI, gli strumenti di AI, il renderer JSX, il server MCP e l'SDK si basano tutti sullo stesso motore dell'editor.

## Chat con AI

L'assistente integrato ha accesso a oltre 130 strumenti che coprono l'intera superficie dell'editor. Descrivi ciò che vuoi in linguaggio naturale: "aggiungi un'ombra esterna di 16px a tutti i pulsanti", "crea un componente scheda con una variante per la modalità scura", "esporta ogni frame di questa pagina a 2×".

[Chat con AI →](./ai-chat)

## Collaborazione

Gli agenti AI mostrano il loro cursore sull'area di lavoro mentre lavorano, e la vista li segue. I documenti cloud su un server Pairdraw Cloud ospitato da te vengono modificati in tempo reale da chiunque li apra, con cursori, modalità di inseguimento e sincronizzazione CRDT. Le stanze peer-to-peer sono disattivate nelle build di Pairdraw.

[Collaborazione →](./collaboration)

## Vue SDK

Crea editor basati su Pairdraw con lo stesso Vue SDK che l'app usa internamente. L'SDK espone il contesto dell'editor, il collegamento dell'area di lavoro, lo stato della selezione, i modelli dei comandi, i composable dei pannelli delle proprietà e componenti senza stile.

[Vue SDK →](./sdk/)

## Renderer JSX

Descrivi l'interfaccia in JSX, la stessa sintassi che i modelli linguistici conoscono già da React. Una sola chiamata può creare un intero albero di componenti con frame, testo, Auto-layout, riempimenti e contorni. Compatto, dichiarativo e facile da confrontare.

Nella direzione opposta, puoi esportare qualsiasi selezione in JSX con classi Tailwind: utile per consegnare il lavoro allo sviluppo o per restituire i design a un modello linguistico.

[Renderer JSX →](./jsx-renderer)

## CLI

Esamina, controlla con il lint, esporta e analizza documenti di design senza aprire l'editor. Elenca pagine, cerca nodi, estrai token di design, individua problemi di layout o di accessibilità ed esegui il rendering in PNG, tutto dal terminale e con output JSON leggibile dalle macchine.

La CLI si collega anche all'app desktop in esecuzione tramite RPC, quindi puoi automatizzare l'editor mentre lo usi: aprire, salvare e cambiare documento, annullare, modificare le impostazioni e chiamare qualsiasi strumento MCP.

[Esaminare i file](./cli/inspecting) · [Esportare](./cli/exporting) · [Analizzare i design](./cli/analyzing) · [Scripting](./cli/scripting) · [Controllare l'app](/programmable/cli/app-control)

## Server MCP

Collega a Pairdraw Claude Code, Cursor, Windsurf o qualsiasi client compatibile con MCP. Il server espone oltre 130 strumenti per leggere, creare e modificare design, gli stessi usati dalla chat con AI integrata. Funziona tramite stdio o HTTP, con supporto alle sessioni.

[Server MCP →](/programmable/mcp-server)

## Schema URL {#url-scheme}

L'app desktop registra `pairdraw://`, quindi una pagina pubblicata (una storia Storybook, una revisione del design, un README) può rimandare direttamente a un livello:

```
pairdraw://open?file=web/design/hikyo.pen&node=Button/Large/Default
```

`file` è un percorso relativo al repository che termina con `.pen` o `.fig`; percorsi assoluti e segmenti `.` o `..` vengono rifiutati. `node` è facoltativo. Entrambi i valori sono codificati come URL (i separatori di percorso possono restare letterali, ma un `+` letterale va inviato come `%2B`) e una chiave ripetuta prende l'ultimo valore.

L'app confronta `file` con i percorsi delle schede aperte come sequenza completa di segmenti finali e porta in primo piano quella scheda senza rileggere il documento, quindi anche un file spostato o diventato illeggibile dopo l'apertura ottiene comunque la selezione del livello. Vince la prima scheda aperta il cui percorso termina con quello richiesto, il che conta quando due copie di lavoro hanno aperto lo stesso file. I segmenti vengono confrontati come fa il filesystem della piattaforma: senza distinguere maiuscole e minuscole ASCII su macOS e Windows, in modo esatto su Linux, quindi `Web/Design/hikyo.pen` e `web/design/hikyo.pen` sono lo stesso file su un Mac e due file diversi su Linux. Se nessuna scheda aperta corrisponde, un selettore di file chiede il file una sola volta; il file scelto deve terminare con lo stesso percorso relativo, altrimenti il link viene annullato. Nessun percorso viene unito a una radice e non viene concesso alcun accesso al filesystem oltre a quanto restituisce il selettore. Un file che il link apre davvero (quello scelto) entra nell'elenco dei file recenti come qualsiasi altro file aperto; portare in primo piano una scheda già aperta non tocca l'elenco, perché non è stato aperto nulla.

Con un nome di nodo, l'app seleziona ogni livello con quel nome esatto nella pagina corrente e adatta la vista all'intera selezione. Se la pagina corrente non ne contiene, passa alla prima pagina che ne ha, caricando le pagine se necessario. Un nome sconosciuto mostra un avviso e lascia aperto il documento. Aprire un file e selezionare livelli è tutto ciò che lo schema può fare.

L'app web accetta lo stesso link dalla propria barra degli indirizzi:

```
http://localhost:1420/?file=https://raw.githubusercontent.com/BadryansahBangsawan/pairdraw/master/tests/fixtures/pencil_button.pen&node=Button/Large/Default
```

Qui `file` è un URL `https:` assoluto che termina con `.pen` o `.fig`: l'app web non ha un filesystem, quindi un percorso relativo, un URL `http:` o qualsiasi altra estensione vengono rifiutati con un avviso nella console e nient'altro. L'estensione viene letta dal percorso dell'URL, quindi una query string sul file collegato non cambia nulla. Un frammento viene scartato prima del download: non raggiunge mai il server, quindi `…/hikyo.pen#a` e `…/hikyo.pen#b` aprono una sola scheda, non due. `node` si comporta esattamente come sopra: stessa selezione per nome esatto con zoom, stesso avviso quando nessun livello ha quel nome. Entrambi i valori sono codificati come URL, un `+` letterale va inviato come `%2B` e una chiave ripetuta prende l'ultimo valore, come nell'app desktop. Il link viene gestito su qualsiasi percorso, quindi `/demo?file=…` funziona come `/?file=…`.

Il browser scarica il file da un'altra origine, quindi l'host deve consentirlo: `raw.githubusercontent.com` invia `Access-Control-Allow-Origin: *` e funziona. La richiesta non porta credenziali e si rifiuta di seguire i reindirizzamenti, così un link `https:` non può essere dirottato verso uno in chiaro: un URL `https://github.com/<owner>/<repo>/raw/...` reindirizza a `raw.githubusercontent.com` e viene quindi rifiutato, perciò collega direttamente l'host raw. `file` e `node` vengono rimossi dalla barra degli indirizzi tramite il router appena letti (prima del download, e anche quando il link è stato rifiutato), quindi un ricaricamento non riapre il documento e né un URL copiato né una navigazione successiva nell'app portano con sé il contenuto del link. Un documento collegato ha un limite di 64 MiB: il corpo viene contato mentre arriva, senza fidarsi di `Content-Length`, e la richiesta viene interrotta appena supera il limite, con il link che segnala che il file supera 64 MiB. Un'installazione che serve l'app con una Content-Security-Policy deve consentire l'host collegato in `connect-src`, altrimenti il download viene bloccato e il link segnala che non è stato possibile aprire il file.

Su macOS lo schema appartiene al bundle dell'app installata, quindi i link raggiungono una build installata e non un processo `tauri dev`. Su Windows e Linux il link arriva tramite il plugin per i deep link, anche quando l'app non è ancora in esecuzione: il link viene messo in coda all'avvio e gestito quando l'editor è pronto; su Linux la voce desktop inclusa passa il link tramite `%U`.

## Perché aperto?

Figma è una piattaforma chiusa. Il suo server MCP è di sola lettura. L'accesso CDP dal browser è stato eliminato nella versione 126. I file di design vivono in un formato proprietario sui server di qualcun altro. Sviluppare plugin richiede un runtime personalizzato con API limitate.

Pairdraw è l'alternativa: open source, con licenza MIT, ogni operazione automatizzabile, dati conservati in locale. I tuoi file di design sono tuoi: esaminali, trasformali, inviali alla CI, forniscili a un modello linguistico. Senza chiedere il permesso a nessuno.
