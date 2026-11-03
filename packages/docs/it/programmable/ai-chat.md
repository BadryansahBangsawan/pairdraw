---
title: Chat con AI
description: Assistente integrato con oltre 90 strumenti per creare, modificare e analizzare design.
---

# Chat con AI

Premi <kbd>⌘</kbd><kbd>J</kbd> o <kbd>Ctrl</kbd><kbd>J</kbd>, oppure fai clic sul pulsante con le scintille tra le azioni del documento nella barra superiore, per aprire l’assistente nella sua colonna. L’assistente può creare forme, modificare stili, configurare disposizioni, lavorare con componenti e analizzare il documento.

## Configurare i modelli

Al primo avvio, la configurazione guidata chiede in cosa deve aiutarti l’IA e cosa usi già: un agente di programmazione come Claude Code, Codex o Gemini CLI nell’app desktop, un account API o un server locale o aziendale. Collega quell’accesso e lo assegna ai ruoli **Design agent** e **Vision**, lasciando invariato ciò che hai configurato a mano. Con OpenRouter puoi accedere invece di incollare una chiave API. Puoi saltarla e riavviarla da **Impostazioni → IA e agenti → Avvia la configurazione guidata**. Per configurare i modelli a mano:

1. Apri la chat.
2. Seleziona l’icona delle impostazioni.
3. Aggiungi un profilo e configura connessione, identificatore del modello, credenziali e capacità.

Puoi salvare più profili e assegnarli separatamente a design, revisioni, attività rapide e immagini. I profili che condividono una connessione riutilizzano la stessa credenziale, archiviata in modo sicuro.

## Provider

OpenPencil supporta connessioni compatibili con OpenAI e Anthropic, oltre a OpenRouter, Google, Amazon Bedrock, Google Vertex AI, Z.ai e provider locali. Amazon Bedrock usa una regione e una chiave API di Bedrock, o chiavi di accesso AWS nell’app desktop; Vertex AI usa un progetto, una posizione e un token di accesso.

Non usa un server intermedio. Le richieste vengono inviate direttamente al provider; nel browser si applicano le sue regole CORS. L’affidabilità delle chiamate agli strumenti in streaming può variare tra i deployment. Consulta la [compatibilità BYOK](/programmable/byok-provider-compatibility).

## Agenti ACP e MCP remoto

L’app desktop può avviare agenti ACP e collegarli a server remoti attendibili compatibili con [Model Context Protocol](https://modelcontextprotocol.io/). In **Impostazioni → Connessioni MCP**, aggiungi un endpoint HTTP trasmissibile, un nome e, se necessario, un token Bearer.

Il token è conservato nell’archivio sicuro delle credenziali, non nelle normali impostazioni, e viene recuperato solo all’avvio della sessione ACP.

Anche la chat integrata con API diretta usa le connessioni attive e offre i loro strumenti al modello come `mcp__<server>__<strumento>`. I server ospitati come Notion o Linear usano l’**Accesso OAuth**: salva la connessione, poi fai clic su **Accedi**. Nell’app desktop una connessione può anche essere un **Comando locale**, un programma che parla MCP su stdin e stdout, con un argomento per riga e variabili d’ambiente facoltative `NOME=valore`. Prima di eseguire una riga di comando per la prima volta, l’app chiede conferma in una finestra di sistema; variabili come `PATH` o `NODE_OPTIONS`, che caricano codice, non sono consentite. Finché la chat chiede prima di agire, chiede anche prima di ogni strumento esterno che il suo server non segna come di sola lettura. Nell’app web un server remoto deve accettare richieste dall’origine dell’app (CORS).

## Strumenti

Gli strumenti coprono lettura, creazione, modifica, struttura, variabili, vettori, analisi, descrizione, generazione di codice e immagini stock. Ogni chiamata agisce sull’editor attivo e partecipa alla cronologia quando applicabile.

Per l’ispezione, `get_jsx` offre la vista JSX di andata e ritorno, `diff_create` e `diff_jsx` i confronti strutturali, `diff_visual` i confronti pixel per pixel e `describe` il ruolo semantico e il rilevamento dei problemi di design.

## Skill

Le skill sono cartelle con un `SKILL.md` nel formato [Agent Skills](https://agentskills.io/specification): istruzioni per un tipo di lavoro, con file di riferimento facoltativi. L’IA integrata vede nome e descrizione di ogni skill attiva e ne carica le istruzioni quando una richiesta corrisponde; gli script di una skill non vengono eseguiti.

In **Impostazioni → Skill** carica una skill come ZIP della sua cartella o come `SKILL.md`. Nell’app desktop vengono lette anche `~/.agents/skills` e `~/.claude/skills`, e le cartelle `.agents/skills` e `.claude/skills` accanto al documento aperto, usate solo dopo **Fidati della cartella**. OpenPencil include skill integrate: guide per landing page, app mobili, app web, dashboard, slide, design system e Tailwind CSS v4, più `layout`, `restyle`, `dark-mode` e `design-review` per un design esistente; una tua skill con lo stesso nome ha la precedenza. Digita `/` all’inizio di un messaggio o usa **Scegli una competenza** sotto il campo del messaggio per scegliere una skill e `@` per menzionare un livello, una pagina o una skill. Le menzioni appaiono come chip, anche nelle risposte; un clic mostra il livello sulla tela.

## Esplorare varianti

**Lascia cuocere**, il cappello da chef sotto il campo del messaggio, esplora una richiesta invece di rispondere una volta sola:

- **Varianti** chiede da due a sei design affiancati, ognuno un nuovo frame di primo livello a destra di tutto ciò che c’è nella pagina. Scegli se esplorano il **Layout** (struttura e disposizione, con un solo stile) o lo **Stile** (colori, tipografia e immagini, con un solo layout). Con un livello selezionato o menzionato, le varianti partono da quello e lo lasciano com’era.
- **Non iterare** chiede un solo design in un unico passaggio, senza la revisione e le correzioni che l’assistente fa di solito.

La scelta resta attiva per i messaggi successivi, e il pulsante la mostra, finché non torni su **Disattivato**.

## Note per l’IA

Seleziona un livello e aggiungi le **Note per l’IA** in fondo al pannello Design. **Contesto** dice agli agenti cosa significa o fa il livello, ad esempio «apre la finestra di registrazione»; **Prompt** è una richiesta sul livello che **Esegui prompt** invia alla chat. Un messaggio porta con sé le note dei livelli che riguarda: quelli che menziona e la selezione oppure, se non ce ne sono, l’intera pagina. Gli agenti rispettano il contesto e agiscono su un prompt solo quando viene chiesto. Le note sono salvate nel file insieme al livello, e le note `context` e le schede prompt di un file `.pen` vengono lette allo stesso modo.

## Verifica visiva

L’assistente può verificare visivamente il proprio lavoro. Con `export_image` abilitato, cattura un’immagine dopo aver creato o modificato un design e controlla il risultato rispetto alla richiesta, individuando problemi di disposizione, elementi mancanti e colori sbagliati che una risposta solo testuale non rileverebbe. `diff_visual`, abilitato per impostazione predefinita, confronta un oggetto modificato con una copia di riferimento e restituisce i pixel e l’area cambiati, così l’assistente può confermare che la modifica sia rimasta nel bersaglio previsto.

## Lavorare su altre pagine

Mentre una risposta è in corso puoi esplorare altre pagine: l’assistente continua a lavorare sulla pagina in cui è partito il messaggio e le sue anteprime compaiono al tuo ritorno. Quando non sei su quella pagina, la chat indica su quale sta lavorando, con **Vai alla pagina** per tornarci. Se è l’assistente a cambiare pagina, la tua vista lo segue.

## Privacy e costi

Le richieste vanno al provider configurato. Verifica condizioni, politica dei dati e prezzi prima di inviare documenti sensibili. OpenPencil non include crediti per i modelli.
