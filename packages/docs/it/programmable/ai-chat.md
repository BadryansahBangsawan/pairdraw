---
title: Chat con AI
description: Assistente AI integrato con 139 strumenti per creare e modificare design.
---

# Chat con AI

Premi <kbd>⌘</kbd><kbd>J</kbd> (<kbd>Ctrl</kbd> + <kbd>J</kbd>), oppure fai clic sul pulsante con le scintille tra le azioni del documento nella barra superiore, per aprire l'assistente AI nella sua colonna accanto al pannello Design. Descrivi ciò che vuoi: crea forme, imposta stili, gestisce il layout, lavora con i componenti e analizza il tuo design.

## Partire da un prompt

La Home chiede **Cosa vuoi progettare?** sopra il campo di ricerca. Descrivi una schermata, un componente o una pagina e premi <kbd>Invio</kbd> (<kbd>Maiusc</kbd> + <kbd>Invio</kbd> va a capo): Pairdraw apre un nuovo design dove la Home ne crea uno, cioè nel tuo spazio di lavoro Cloud o nel bucket di archiviazione se ne è selezionato uno, ne apre la chat e invia il prompt. Se non è ancora configurato alcun modello, il prompt aspetta nella chat del nuovo design mentre Pairdraw cerca un agente di programmazione sul tuo computer (vedi [Configurazione](#setup)), e viene inviato appena ne collega uno. Se non ne trova, si apre prima la configurazione guidata e il prompt viene inviato al termine; chiudendo la configurazione il prompt resta nella Home.

Sul desktop, una pagina vuota di un design offre lo stesso prompt sopra l'area di lavoro. Invia nella chat di quel documento e scompare non appena la pagina ha un livello o un agente inizia a lavorare, mentre l'area di lavoro attorno continua a funzionare come sempre. Chiudilo per nasconderlo in quel documento, oppure disattiva **Prompt on empty pages** in **Impostazioni → Modelli → Chat**. Le lavagne e i documenti di sola lettura non lo mostrano.

Entrambi i prompt elencano esempi in forma di chip: **Pagina di destinazione**, **Schermata di accesso**, **Pannello di controllo** e **Prezzi**. Sceglierne uno compila il prompt con un'idea di partenza e gli dà il focus, così puoi modificarlo prima di inviarlo; non viene inviato nulla finché non premi <kbd>Invio</kbd>.

## Inviare lavoro dall'area di lavoro

- **Esegui la nota come prompt** nel [menu contestuale](/it/user-guide/context-menu#esegui-la-nota-come-prompt) dell'area di lavoro invia il testo delle note adesive selezionate, con un riferimento a ciascuna nota.
- **Applica con l'IA** nel menu di una discussione di commenti chiede all'assistente di applicare il feedback di quella discussione, rispondere dicendo cosa è cambiato e risolverla. Il prompt cita il commento e le sue risposte e collega il livello su cui è fissata la discussione. **Applica i commenti aperti con l'IA** nell'elenco dei commenti fa lo stesso per ogni discussione aperta mostrata; quelle risolte vengono escluse.

Entrambi inviano nella chat del documento, sono disponibili solo nei documenti che puoi modificare e, se non è configurato alcun modello, ne configurano prima uno come fa il prompt della Home. I livelli collegati da un prompt lo accompagnano come riferimenti, come quando li menzioni nel campo della chat.

## Configurazione {#setup}

Al primo avvio Pairdraw non apre alcuna finestra di configurazione. Finché non è configurato nessun modello, cerca un [agente di programmazione](/programmable/coding-agents) già presente sul tuo computer: prima Claude Code, poi Codex, poi Gemini CLI. Uno installato e con l'accesso effettuato diventa subito l'agente di design, e la chat dice **Stai usando Claude Code da questo computer.** con **Cambia** per scegliere un altro modello. Viene usato anche un agente che non indica se l'accesso è stato effettuato, come Gemini CLI; se risulta senza accesso, la chat mostra il comando per accedere. Se a un agente servono ancora un accesso, il suo programma ACP o il server MCP installato, la colonna della chat mostra un solo pulsante, e non viene effettuato alcun accesso né installato nulla finché non lo premi. Un modello che hai configurato tu non viene mai sostituito.

Quando non trova alcun agente, oppure gli agenti non possono essere eseguiti, come nell'app web senza il suo [companion](/programmable/browser-agents), l'invio di un prompt apre la configurazione guidata. Chiede in cosa deve aiutarti l'IA e cosa usi già: un agente di programmazione come Claude Code, Codex, Gemini CLI o Pi nell'app desktop, un account API oppure un server locale o aziendale. Collega quell'accesso e lo assegna ai ruoli **Agente di design** e **Visione**, lasciando invariato ciò che hai configurato a mano. Con OpenRouter puoi accedere invece di incollare una chiave API. Puoi avviarla in qualsiasi momento da **Impostazioni → Modelli → Avvia la configurazione guidata**. Per configurare i modelli a mano:

1. Apri la colonna della chat con AI (<kbd>⌘</kbd><kbd>J</kbd>)
2. Fai clic sull'icona delle impostazioni
3. Aggiungi un modello e configurane provider, ID del modello, credenziali e capacità
4. Salva il modello e assegnalo ad **Agente di design**

Puoi configurare più modelli riutilizzabili e assegnarne separatamente per il lavoro di design, le revisioni, le attività rapide e l'input di immagini. I modelli che usano la stessa connessione a un provider riutilizzano la credenziale salvata.

Il campo del messaggio si allarga con i prompt su più righe. Digita `@` per menzionare un livello, una pagina o una skill, oppure usa il pulsante della selezione per menzionare i livelli selezionati, e `/` all'inizio di un messaggio per eseguire una skill o uno dei comandi di un agente ACP. Le menzioni compaiono come chip, anche nelle risposte, dove l'assistente indica i livelli che ha toccato; un clic su una chip mostra il livello sull'area di lavoro. I messaggi dell'assistente mostrano il ragionamento del provider in sezioni comprimibili e offrono un'azione di copia per ogni risposta. Gli allegati immagine restano disponibili come riferimenti visivi quando è configurato un modello **Visione**. Le risposte in streaming usano un renderer Markdown irrobustito con blocchi di codice evidenziati da Shiki; i protocolli di link non sicuri e le immagini incorporate come dati vengono bloccati.

## Sessioni degli agenti

Un agente di programmazione conduce le sue sessioni con un modello, uno sforzo di ragionamento e una modalità. Il campo del messaggio offre il modello, lo sforzo di ragionamento e la modalità che Claude Code, Codex e Gemini CLI indicano per le loro sessioni. Una scelta si applica subito alla sessione in corso e alle sessioni successive con quell'agente, tranne le modalità che saltano le richieste di permesso, che valgono per una sola sessione.

Sul desktop, ogni chat può dare al suo agente di programmazione una cartella di progetto in cui lavorare, scelta nell'intestazione della chat e confermata prima. Le sessioni lì partono nella modalità predefinita dell'agente, e vengono mantenuti solo il modello e lo sforzo di ragionamento scelti.

## Limite di passaggi

In **Impostazioni → Modelli → Chat**, imposta **Passaggi massimi per messaggio** su un numero intero da 1 a 1.000. Il valore predefinito è 50. Premi Invio o esci dal campo per salvare un valore valido; le bozze non valide non sostituiscono la preferenza salvata. Limiti più alti permettono attività più lunghe guidate dagli strumenti, ma possono aumentare la latenza e il costo del provider.

L'IA integrata registra questo limite all'inizio di ogni messaggio. L'interruzione, gli avvisi sui passaggi rimanenti e l'azione **Continua** usano lo stesso budget. Cambiarlo non interrompe una richiesta in corso; il messaggio successivo o la continuazione usano il nuovo limite. Un passaggio è un'iterazione del modello e può comprendere più chiamate agli strumenti. Gli agenti ACP e Pi gestiscono i propri limiti.

## Accesso agli strumenti

Apri **Impostazioni → Accesso agli strumenti** per scegliere quali strumenti possono usare le connessioni dirette ai modelli AI. Cerca per nome o descrizione, espandi i gruppi di sola lettura o con effetti collaterali e attiva o disattiva singoli strumenti o un intero gruppo. Gli interruttori di gruppo agiscono su tutti gli strumenti del gruppo, non solo sui risultati della ricerca. **Ripristina valori predefiniti** riporta il set di strumenti predefinito: gli strumenti principali di modifica e ispezione, gli strumenti delle librerie (`get_components`, `list_libraries`, `insert_library_component`), commenti, variabili, `lint` e `lint_fix`, `export_image`, `list_pages` e `create_page`. Gli strumenti estesi come `create_component` possono essere attivati singolarmente.

Le preferenze vengono salvate in locale e si applicano al messaggio successivo, anche in una conversazione esistente. Non cambiano una richiesta già in corso. Attivare molti strumenti aumenta gli schemi inviati al modello.

Il segmento **Local MCP** ha impostazioni indipendenti per i client collegati al server MCP di Pairdraw, compresi gli agenti ACP e Pi. Dopo averle cambiate, riavvia il server e ricollega i client stdio. Le connessioni MCP remote, l'accesso WebMCP e i permessi di shell e filesystem di Pi restano separati.

Gli interruttori degli strumenti controllano quali strumenti vengono offerti, non quali operazioni possono eseguire gli script. Uno strumento `eval` attivo, o un altro strumento in grado di eseguire script, può compiere operazioni di design i cui strumenti dedicati sono disattivati; questi interruttori non sono una sandbox.

## Skill

Le skill sono cartelle con un `SKILL.md` nel formato [Agent Skills](https://agentskills.io/specification): istruzioni per un tipo di lavoro, con file di riferimento facoltativi. L'IA integrata vede nome e descrizione di ogni skill attiva e ne carica le istruzioni quando una richiesta corrisponde. Può leggere i file della skill, ma gli script di una skill non vengono eseguiti.

Apri **Impostazioni → Skill** per vedere da dove provengono le skill:

- **Caricate**: carica uno ZIP della cartella di una skill o un singolo `SKILL.md`. I caricamenti restano in Pairdraw e funzionano anche nel browser.
- **Accanto a questo documento** (desktop): le cartelle `.agents/skills` e `.claude/skills` dalla cartella del documento aperto fino al suo repository. Restano disattivate finché non scegli **Fidati della cartella**, perché una skill dà all'IA istruzioni che segue.
- **Integrate**: le skill incluse in Pairdraw. Guide per landing page, app mobili, app web, dashboard, slide, design system e Tailwind CSS v4, e skill che lavorano su un design esistente: `layout`, `restyle`, `dark-mode` e `design-review`. Sono attive fin dall'inizio, funzionano anche nel browser e lasciano il posto a una tua skill con lo stesso nome.
- **Competenze condivise degli agenti** e **Competenze di Claude Code** (desktop): `~/.agents/skills` e `~/.claude/skills`, dove gli altri agenti di programmazione installano le skill. La maggior parte riguarda flussi di lavoro di programmazione, quindi queste cartelle partono disattivate; il passaggio di revisione della configurazione dell'IA ne elenca le skill, così puoi scegliere quelle utili per il design.

I caricamenti sono attivi appena li aggiungi, e ogni cartella o skill può essere attivata o disattivata. La pagina le elenca come **Accesso agli strumenti** elenca gli strumenti: ogni fonte è un gruppo con il proprio interruttore, e ogni skill ha un interruttore accanto. Apri una skill per leggerne le istruzioni, vederne i file o controllare gli avvisi su come si discosta dalla specifica. Quando due skill hanno lo stesso nome, viene usata la prima in quest'ordine.

Per eseguire tu una skill, digita `/` all'inizio di un messaggio e sceglila, oppure sceglila da **Scegli una competenza**, il pulsante con il libro sotto il campo del messaggio; in entrambi i casi il messaggio inizia con `/skill:name`, sostituendo una skill scelta prima. Pi riceve le skill attive come proprie. Gli agenti ACP come Claude Code e Codex caricano le proprie skill.

## Conversazioni salvate

Usa **Cronologia chat** per tornare a una chat salvata, avviare una **Nuova chat** oppure rinominare o eliminare una conversazione. La cronologia e le anteprime degli allegati sono salvate in locale; **Tutte le chat** ti permette di sfogliare le trascrizioni di altri documenti.

Una conversazione che appartiene a un altro documento è di sola lettura finché non apri quel documento. Una trascrizione salvata di un agente non garantisce che la sessione dell'agente esterno possa riprendere: quando la ripresa non è disponibile, avvia una nuova chat. La cronologia locale non è una sincronizzazione nel cloud né un backup.

Nelle impostazioni della chat accanto alla panoramica dei modelli, scegli se il ragionamento è **Compresso per impostazione predefinita**, **Espandi durante il ragionamento** o **Espanso per impostazione predefinita**. Le animazioni di apertura seguono la preferenza dell'app per il movimento ridotto. Espandere un ragionamento precedente non costringe la conversazione a scorrere fino in fondo.

## Provider supportati

| Provider                 | Modelli                                                                    | Configurazione                                                                                               |
| ------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **OpenRouter**           | Claude, GPT, Gemini, DeepSeek, Qwen e altri                                | Chiave API da [openrouter.ai](https://openrouter.ai)                                                         |
| **Anthropic**            | Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1, Claude Haiku 5.5     | Chiave API da [console.anthropic.com](https://console.anthropic.com)                                         |
| **OpenAI**               | GPT-6.1 Sol, GPT-6 Astra, GPT-6 Luna                                       | Chiave API da [platform.openai.com](https://platform.openai.com)                                             |
| **ChatGPT**              | I modelli che il tuo piano ChatGPT offre in Codex, elencati in tempo reale | App desktop: **Accedi con ChatGPT**. Le risposte contano per i limiti di utilizzo del piano.                 |
| **Google AI**            | Gemini 3.8 Flash, Gemini 4 Argon                                           | Chiave API da [aistudio.google.dev](https://aistudio.google.dev)                                             |
| **DeepSeek**             | DeepSeek Flash, DeepSeek V4 Pro                                            | Chiave API da [platform.deepseek.com](https://platform.deepseek.com/api_keys)                                |
| **Z.ai**                 | GLM-5.3, GLM-5.3-Flash, GLM-5.3-FlashX, GLM-5V-Turbo                       | Chiave API da [docs.z.ai](https://docs.z.ai/devpack/quick-start)                                             |
| **MiniMax**              | MiniMax-M3.1-Flash, MiniMax-M3                                             | Chiave API da [platform.minimax.io](https://platform.minimax.io/user-center/basic-information/interface-key) |
| **xAI**                  | Grok 4.7, Grok 4.6, Grok Build 0.1                                         | Chiave API da [console.x.ai](https://console.x.ai)                                                           |
| **Meta**                 | Muse Spark 1.3, Muse Wonder                                                | Chiave API da [dev.meta.ai](https://dev.meta.ai)                                                             |
| **Kimi For Coding**      | Kimi K3.1 Pro, Kimi K3.1 Pro Highspeed, Kimi For Coding                    | Chiave API del piano Kimi Code da [kimi.ai](https://www.kimi.ai/code/console). Solo app desktop.             |
| **Moonshot AI**          | Kimi K3.1 Pro, Kimi K3.1 Pro Highspeed, Kimi K3                            | Chiave API da [platform.moonshot.ai](https://platform.moonshot.ai/console/api-keys)                          |
| **Together AI**          | Kimi K3, DeepSeek V4.1 Flash, GLM-5.3, Muse Spark Open                     | Chiave API da [together.ai](https://api.together.ai/settings/api-keys)                                       |
| **Fireworks AI**         | Kimi K3, DeepSeek V4.1 Flash, GLM 5.3, MiniMax-M3.1-Flash                  | Chiave API da [fireworks.ai](https://app.fireworks.ai/settings/users/api-keys)                               |
| **OpenCode Zen**         | Kimi K3, DeepSeek V4.1 Flash, GLM-5.3, Big Pickle                          | Chiave API da [opencode.ai](https://opencode.ai/auth). Solo app desktop.                                     |
| **OpenCode Go**          | Kimi K3.1 Pro, MiniMax M3.1 Flash, GLM-5.3, DeepSeek V4.1 Flash            | Chiave API del piano Go da [opencode.ai](https://opencode.ai/auth). Solo app desktop.                        |
| **OpenAI-compatible**    | Qualsiasi endpoint con il formato dell'API di OpenAI                       | URL di base personalizzato + chiave. Supporta la scelta tra API Completions e Responses.                     |
| **Anthropic-compatible** | Qualsiasi endpoint con il formato dell'API di Anthropic                    | URL di base personalizzato + chiave                                                                          |
| **Amazon Bedrock**       | Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1, Claude Haiku 5.5     | Regione più una chiave API di Bedrock, oppure chiavi di accesso AWS nell'app desktop                         |
| **Google Vertex AI**     | Claude Sonnet 5.5, Claude Opus 5.5, Gemini 3.8 Flash, Gemini 4 Argon       | Progetto e posizione più un token di accesso; una chiave API raggiunge solo Gemini                           |

Nessun backend: la tua chiave o il tuo accesso comunicano direttamente con il provider. Le richieste dal browser sono soggette alle regole CORS di ciascun provider, e i deployment dei modelli variano nell'affidabilità con cui trasmettono in streaming le chiamate agli strumenti. Vedi [Compatibilità di provider e modelli BYOK](/programmable/byok-provider-compatibility) per i risultati misurati e i passaggi per riprodurli.

Le preimpostazioni xAI, Meta, Kimi For Coding, Moonshot AI, Together AI, Fireworks AI e OpenCode usano l'endpoint di chat compatibile con OpenAI di ciascun provider, quindi cambiano solo l'URL di base e i modelli consigliati; l'elenco completo dei modelli arriva da models.dev. OpenCode Zen e Go elencano solo i modelli che servono tramite quell'endpoint, quindi i modelli Claude, GPT e Gemini lì sono esclusi: per quelli usa il provider Anthropic, OpenAI o Google AI. Kimi For Coding ed entrambe le preimpostazioni OpenCode non inviano intestazioni CORS, quindi funzionano solo nell'app desktop.

**Amazon Bedrock** raggiunge Claude tramite la Messages API di Bedrock su `bedrock-mantle.<region>.api.aws`, con gli ID dei modelli `anthropic.` di Bedrock; un ID di modello personalizzato può indicare un profilo di inferenza come `us.anthropic.claude-opus-5-5`. Scegli la regione, poi accedi con una chiave API di Bedrock oppure, nell'app desktop, con ID della chiave di accesso, chiave di accesso segreta e token di sessione facoltativo, che firmano ogni richiesta con AWS Signature Version 4. I browser non permettono alla risposta CORS di Bedrock di coprire l'intestazione della firma, quindi l'app nel browser accetta solo chiavi API.

**Google Vertex AI** serve Claude tramite `:rawPredict` e Gemini tramite `:generateContent` in un unico progetto Google Cloud. Inserisci l'ID del progetto e una posizione (`global`, `us`, `eu` o una singola regione; le singole regioni servono solo i modelli Claude meno recenti) e incolla un token di accesso ottenuto con `gcloud auth print-access-token`. I token di accesso scadono dopo un'ora, quindi incollane uno nuovo quando le richieste iniziano a fallire. Una chiave API senza progetto usa la modalità express di Vertex AI, che serve solo i modelli Gemini.

**OpenRouter** può essere collegato nella configurazione guidata accedendo invece di incollare una chiave: OpenRouter crea una chiave per Pairdraw, che viene salvata come qualsiasi altra chiave. Nell'app desktop l'accesso apre il browser di sistema e torna su una porta di questo computer scelta dal sistema (`http://localhost:<port>/oauth/openrouter`), quindi non è coinvolta alcuna pagina web esterna al tuo computer; l'app nel browser accede in un popup, quindi consenti i popup per essa.

**ChatGPT** usa il tuo piano ChatGPT invece di una chiave API, tramite lo stesso backend e lo stesso accesso della CLI Codex di OpenAI. L'accesso apre il browser e torna all'app desktop su `localhost:1455`, l'unico indirizzo che OpenAI accetta per questo scopo, quindi chiudi prima un eventuale `codex login` in esecuzione. L'accesso viene salvato come una chiave e si rinnova da solo; l'elenco dei modelli arriva dal tuo account. L'app nel browser non lo offre.

## Connessioni MCP esterne

La chat integrata e gli agenti di programmazione possono usare server [Model Context Protocol](https://modelcontextprotocol.io/) attendibili oltre a quello di Pairdraw. In **Impostazioni → MCP**, sotto **Connessioni MCP**, aggiungi una connessione con un nome e attivala:

- **Server remoto**: un endpoint Streamable HTTP senza autenticazione, con un token bearer oppure con **Accesso OAuth** per server ospitati come Notion o Linear. Salva la connessione, poi fai clic su **Accedi**; la pagina di accesso del server si apre in un popup nell'app web o nel browser di sistema sul desktop. L'app si registra presso il server di autorizzazione del server, usa PKCE e rinnova i token che riceve.
- **Comando locale** (solo app desktop): un programma che parla MCP su stdin e stdout, come `npx` con `-y`, `@modelcontextprotocol/server-filesystem` e una cartella come argomenti, uno per riga, più variabili d'ambiente facoltative `NAME=value`. La prima volta che una riga di comando viene eseguita, l'app chiede conferma in una finestra di sistema; lo chiede di nuovo quando cambiano il programma, un argomento o il nome di una variabile. Le variabili che scelgono il programma o vi caricano codice, come `PATH`, `NODE_OPTIONS` o `LD_PRELOAD`, vengono rifiutate.

La chat con API diretta elenca gli strumenti di ogni server attivo a ogni messaggio e li offre al modello come `mcp__<server>__<tool>`. Un server che non risponde viene escluso da quel messaggio e riprovato un minuto dopo, e un comando locale che hai rifiutato non viene riproposto finché non modifichi la sua connessione. Tutte le chat condividono le connessioni, che restano aperte mentre una risposta è in corso e si chiudono dopo qualche minuto di inattività. Finché la chat chiede conferma prima di agire (**Impostazioni → IA**), anche una chiamata a uno strumento esterno che il suo server non segna come di sola lettura chiede prima conferma. Gli strumenti esterni si attivano e disattivano con la loro connessione, non nell'elenco degli strumenti di Pairdraw. Sul desktop gli agenti ACP ricevono le stesse connessioni all'avvio della sessione; un comando locale viene passato a un agente solo dopo che lo hai approvato nella stessa finestra di sistema, e l'app web non ne passa nessuno. Pi riceve le connessioni remote. Token bearer, accessi OAuth e variabili sono conservati nel backend delle credenziali configurato, non nelle normali impostazioni. **Verifica connessione** si collega una volta e riporta quanti strumenti offre il server.

Nell'app web un server remoto deve accettare richieste dall'origine dell'app (CORS); l'app desktop si collega tramite il proprio client HTTP.

I server remoti devono usare HTTPS. Gli endpoint HTTP di loopback sono accettati per lo sviluppo locale. Esamina un server e accertati che sia attendibile prima di attivarlo: i suoi strumenti potrebbero leggere dati esterni o compiere azioni con le credenziali che fornisci. Il server MCP di design integrato in Pairdraw resta collegato automaticamente e non va aggiunto qui.

## Cosa può fare

Il catalogo configurabile degli strumenti copre queste categorie; gli strumenti offerti a un modello dipendono dalle impostazioni di **Accesso agli strumenti**:

- **Creare**: frame, forme, testo, componenti, pagine. Disegna JSX per i layout complessi.
- **Stile**: riempimenti, contorni, effetti, opacità, raggio degli angoli, metodi di fusione.
- **Layout**: Auto-layout, griglia, allineamento, spaziatura, dimensionamento.
- **Componenti**: crea componenti, istanze, set di componenti e slot. Gestisce le sostituzioni. Dà ai componenti comportamenti Reka UI, così funzionano in anteprima.
- **Variabili**: crea e modifica variabili, raccolte e modalità. Le collega ai riempimenti.
- **Interrogare**: trova nodi, selettori XPath, legge proprietà, elenca pagine, font e selezione.
- **Ispezionare**: `get_jsx` per la vista JSX di andata e ritorno, `diff_create` e `diff_jsx` per i confronti strutturali, `diff_visual` per i confronti pixel per pixel, `describe` per il ruolo semantico e il rilevamento dei problemi di design.
- **Analizzare**: palette dei colori, verifica della tipografia, coerenza delle spaziature, rilevamento di strutture ripetute.
- **Esportare**: PNG, SVG, JSX con classi Tailwind. Verifica visiva tramite `export_image`.
- **Vettori**: operazioni booleane, modifica dei tracciati.

## Esplorare varianti

**Lascia cuocere**, il cappello da chef sotto il campo del messaggio, esplora una richiesta invece di rispondere una volta sola:

- **Varianti** chiede da due a sei design affiancati, ognuno un nuovo frame di primo livello a destra di tutto ciò che c'è nella pagina. Scegli se esplorano il **Layout** (struttura e disposizione, con un solo stile visivo) o lo **Stile** (colori, tipografia e immagini, con un solo layout). Con un livello selezionato o menzionato, le varianti partono da quello e lo lasciano com'era.
- **Non iterare** chiede un solo design in un unico passaggio, senza la revisione e le correzioni che l'assistente fa di solito.

La scelta resta attiva per i messaggi successivi, e il pulsante la mostra, finché non torni su **Disattivato**.

## Note per l'IA

Seleziona un livello e aggiungi le **Note per l'IA** in fondo al pannello Design. **Contesto** dice agli agenti cosa significa o fa il livello, ad esempio «apre la finestra di registrazione»; **Prompt** è una richiesta sul livello che **Esegui prompt** invia alla chat. Un messaggio porta con sé le note dei livelli che riguarda: quelli che menziona e la selezione oppure, se non ce ne sono, l'intera pagina. Gli agenti rispettano il contesto e agiscono su un prompt solo quando viene chiesto. Le note sono salvate nel file insieme al livello, e le note `context` e le schede prompt di un file `.pen` vengono lette allo stesso modo.

## Verifica visiva

L'assistente può verificare visivamente il proprio lavoro. Con `export_image`, attivo per impostazione predefinita, può catturare uno screenshot dopo aver creato o modificato un design e controllare il risultato rispetto alla richiesta originale. Così individua problemi di layout, elementi mancanti e colori sbagliati che una risposta solo testuale non rileverebbe. `diff_visual`, attivo per impostazione predefinita, confronta un nodo modificato con una copia di riferimento e restituisce i pixel e l'area cambiati, così l'assistente può confermare che la modifica sia rimasta entro il bersaglio previsto.

## Messaggi mentre l'assistente lavora

Puoi continuare a scrivere mentre una risposta è in corso. **Invio** invia il messaggio appena terminano le chiamate agli strumenti del passaggio corrente, così l'IA integrata può cambiare direzione senza essere interrotta; **Alt+Invio** aspetta che abbia finito tutto il lavoro. I messaggi in attesa compaiono attenuati sotto la risposta, ciascuno con un pulsante per rimuoverlo. **Esc** interrompe la risposta e invia subito ciò che è in attesa, e **Freccia su** sulla prima riga riprende i messaggi in attesa per modificarli. Gli agenti ACP e Pi prendono un messaggio in attesa al termine del loro turno.

## Interrompere una risposta

**Stop** termina subito una risposta. Una chiamata a uno strumento già in esecuzione arriva a termine e la sua modifica conta come parte della risposta; le chiamate ancora in attesa del loro turno non cambiano nulla. La risposta viene contrassegnata come _Interrotta_, il suo ragionamento e le eventuali chiamate non concluse smettono di apparire in esecuzione, e il tuo messaggio successivo dice all'assistente se quelle chiamate hanno modificato il documento.

## Annullare le modifiche dell'assistente

Ogni chiamata a uno strumento che modifica il documento è un passo in **Modifica → Annulla**. Annullarla con <kbd>⌘</kbd><kbd>Z</kbd> contrassegna la chiamata come _Annullato_ nella chat. Una risposta con solo alcune modifiche annullate dice quante sono; una con tutte le modifiche annullate appare attenuata e contrassegnata come _Modifiche annullate_. Ripeti rimuove i contrassegni. I contrassegni vengono salvati con la conversazione.

**Annulla le modifiche** su una risposta ne annulla le modifiche finché non è stato modificato nulla dopo, e **Ripristina modifiche** riporta le modifiche annullate finché Ripeti è ancora possibile. **Rigenera** e la modifica del tuo ultimo messaggio annullano prima, quando possibile, le modifiche della risposta sostituita.

Il tuo messaggio successivo dice all'assistente quali delle sue modifiche hai annullato o ripetuto, così non costruisce su modifiche che non esistono più. Se annulli le modifiche dell'assistente mentre sta ancora lavorando, lo viene a sapere alla sua successiva chiamata a uno strumento.

## Seguire l'assistente

Con **Segui gli agenti mentre lavorano** attivo, il pulsante con il mirino in cima alla chat con AI, la tua vista segue l'assistente mentre lavora, anche su un'altra pagina quando modifica livelli lì. L'inseguimento termina quando la risposta finisce, viene interrotta o non riesce. Fare clic, scorrere, cambiare zoom o pagina, oppure premere Esc, interrompe l'inseguimento.

## Guardare l'assistente disegnare {#watching-the-assistant-draw}

Mentre un agente modifica la pagina aperta, che sia la chat integrata o un agente di programmazione tramite MCP, l'area di lavoro mostra il suo lavoro: ogni livello che aggiunge si disegna uno dopo l'altro, i livelli che modifica lampeggiano e i frame in cui lavora luccicano dentro un contorno viola. Quando si ferma, lampeggiano una volta e un avviso conta i livelli aggiunti e modificati; **Mostra** li seleziona e li inquadra. L'animazione è disegnata sopra l'area di lavoro e non modifica mai il documento. Disattivala con **Anima le modifiche dell'IA** in **Impostazioni → Modelli → Chat**; resta disattivata anche quando **Animazioni** è disattivato, il sistema chiede di ridurre il movimento o la modalità Ultralight è attiva, e allora le modifiche compaiono e basta.

## Notifiche

Quando un agente chiede un permesso e non rispondi per alcuni secondi, Pairdraw invia una notifica di sistema, così puoi lavorare in un'altra app mentre l'agente procede. **Impostazioni → Notifiche** attiva anche le notifiche quando una risposta finisce o non riesce. Vengono inviate solo mentre Pairdraw è in background o mostra un altro documento, e un clic su una notifica apre la chat di quel documento. Nel browser, fai prima clic su **Consenti notifiche** in quella pagina; l'app desktop segue le impostazioni di notifica del tuo sistema.

## Esempi di prompt

- "Crea una scheda con un titolo, una descrizione e un pulsante blu"
- "Fai in modo che tutti i pulsanti di questa pagina usino lo stesso raggio degli angoli"
- "Quali font sono usati in questo file?"
- "Cambia lo sfondo del frame selezionato in una sfumatura dal blu al viola"
- "Esporta il frame selezionato come SVG"
- "Trova tutti i nodi di testo con dimensione del font inferiore a 12"
- "Descrivi il componente selezionato: che ruolo sembra avere?"
- "Mostrami il JSX di questo frame"
- "Trasforma questo componente in uno switch che posso provare in anteprima"

## Suggerimenti

- Seleziona i nodi prima di chiedere: l'assistente sa cosa è selezionato.
- Indica con precisione colori, dimensioni e posizioni per ottenere risultati accurati.
- L'assistente può modificare più nodi in un solo messaggio.
- Puoi esplorare altre pagine mentre una risposta è in corso: l'assistente continua a lavorare sulla pagina in cui è partito il messaggio e le sue anteprime compaiono al tuo ritorno. Mentre sei altrove, la chat indica su quale pagina sta lavorando, con **Vai alla pagina** per tornarci.
- Annulla tutto ciò che non ti piace con **Modifica → Annulla** o **Annulla le modifiche**; sia la chat sia l'assistente lo vedono.
- Tutto il layout viene ricalcolato automaticamente dopo ogni esecuzione di uno strumento.

## Privacy e costi

Le richieste vanno al provider configurato. Verifica condizioni, politica dei dati e prezzi prima di inviare documenti sensibili. Pairdraw non include crediti per i modelli.
