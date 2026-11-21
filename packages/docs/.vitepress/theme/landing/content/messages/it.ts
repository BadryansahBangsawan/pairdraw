import type { LandingMessages } from './types'

export const it: LandingMessages = {
  nav: {
    label: 'Pairdraw',
    home: 'Pairdraw, torna in cima',
    howItWorks: 'Come funziona',
    features: 'Funzioni',
    agents: 'Agenti',
    scripting: 'Scripting',
    faq: 'FAQ',
    docs: 'Documentazione',
    github: 'GitHub',
    download: 'Scarica'
  },
  hero: {
    frame: 'Hero',
    kicker: 'Editor di design open source, con licenza MIT',
    title: 'Progetta accanto al tuo agente.',
    lede: 'Pairdraw apre i tuoi file .fig e .pen e lascia che un agente AI disegni sulla stessa tela mentre continui a modificare.',
    download: 'Scarica per {platform}',
    downloadAny: 'Scarica Pairdraw',
    github: 'Vedi su GitHub',
    finePrint:
      'Gratis per macOS, Windows e Linux. Usa il tuo modello o il tuo agente di programmazione.',
    prompt: 'Scrivi il titolo dell’hero: «Progetta accanto al tuo agente.» Tienilo su due righe.',
    status: {
      reading: '{agent} sta leggendo la pagina',
      adding: '{agent} sta aggiungendo H1',
      writing: '{agent} sta scrivendo H1'
    },
    comment: 'Tieni il titolo su due righe.',
    reply: 'Impostato a 890 di larghezza, così va a capo dopo «accanto».',
    now: 'ora',
    measure: 'W 890 × H 280',
    layers: 'Livelli',
    layer: {
      frame: { name: 'Cornice Hero', detail: 'Cornice, 1200 × 980' },
      heading: {
        name: 'H1',
        adding: '{agent} lo sta aggiungendo',
        writing: '{agent} lo sta scrivendo',
        detail: '{agent} lo sta ridimensionando'
      },
      comment: { name: 'Commento', detail: '{human}, 1 risposta' },
      lead: { name: 'Introduzione', detail: 'Testo, 24 px' }
    },
    pause: 'Metti in pausa l’animazione',
    play: 'Riproduci l’animazione'
  },
  how: {
    title: 'Da una frase a livelli che puoi modificare.',
    lede: 'L’agente raggiunge la tela tramite il server MCP di Pairdraw e modifica il file che hai aperto. Niente viene esportato, incollato o ricostruito.',
    steps: [
      {
        title: 'Chiedi in chat',
        detail:
          'Descrivi la schermata in chat, nella Pagina iniziale o nel campo sotto la tela. Usa la tua chiave API o un agente di programmazione già presente sul tuo computer.'
      },
      {
        title: 'Guardalo disegnare',
        detail:
          'I livelli compaiono uno dopo l’altro mentre la cornice su cui sta lavorando luccica. Quando l’agente si ferma, un avviso conta cosa è cambiato.'
      },
      {
        title: 'Modifica il risultato',
        detail:
          'Quello che l’agente ha disegnato sono normali livelli nel tuo file. Selezionali, cambiali o chiedi un altro passaggio. Ogni turno si può annullare.'
      }
    ],
    frames: ['1  Chiedi in chat', '2  Guardalo disegnare', '3  Modifica il risultato'],
    request: 'Aggiungi una schermata Obiettivi con un anello di risparmio e tre obiettivi.',
    reading: 'Lettura di Budget app.fig, pagina 1',
    placeholder: 'Chiedi modifiche a Obiettivi',
    send: 'Invia',
    card: {
      title: 'Obiettivi',
      amount: '$2,400',
      saved: 'di $3,500 risparmiati',
      goals: [
        { title: 'Nuovo portatile', detail: '$900 / $1,400' },
        { title: 'Viaggio a Bali', detail: '$1,100 / $1,500' },
        { title: 'Emergenze', detail: '$400 / $600' }
      ]
    },
    progress: '{count} di {total} livelli',
    props: { title: 'Anello di risparmio', ring: 'Anello', size: 'Dimensione' },
    toast: '{count} livelli aggiunti',
    undo: 'Annulla'
  },
  features: {
    title: 'Un editor completo, con ogni strumento aperto all’agente.',
    lede: 'Quello che puoi fare a mano, l’agente può richiamarlo. Lavorate entrambi sugli stessi livelli, nello stesso file.',
    frame: 'Funzioni, fai clic su un livello per cambiare',
    list: 'Livelli',
    tabs: {
      ai: {
        label: 'L’AI crea design',
        title: 'L’AI crea design',
        detail:
          'Descrivi quello che vuoi in chat, nella Pagina iniziale o nel campo sotto la tela. {count} strumenti creano e modificano i livelli.'
      },
      browser: {
        label: 'Browser integrato',
        title: 'Browser integrato',
        detail:
          'Apri una pagina nella sua finestra, importa la pagina o un elemento come livelli e lascia che la chat la legga e ci faccia clic con la tua approvazione.'
      },
      controls: {
        label: 'Controlli funzionanti',
        title: 'Controlli funzionanti',
        detail:
          'Dai a un componente un comportamento Reka UI come interruttore, cursore o schede, e provalo dal vivo con input reali e tastiera.'
      },
      prototypes: {
        label: 'Prototipi',
        title: 'Prototipi',
        detail:
          'Collega le cornici con interazioni al clic o dopo un ritardo, poi riproducile sulla tela con transizioni istantanee o in dissolvenza.'
      },
      layout: {
        label: 'Auto layout e CSS Grid',
        title: 'Auto layout e CSS Grid',
        detail:
          'Layout flex e a griglia con padding, spaziatura, allineamento e tracce che si adattano quando cambia il contenuto.'
      }
    },
    ai: {
      prompt:
        'Progetta una schermata di impostazioni con interruttori per le notifiche e un pulsante per uscire.',
      settings: 'Impostazioni',
      alerts: 'Avvisi di budget',
      summary: 'Riepilogo settimanale',
      signIn: 'Nuovo accesso',
      signOut: 'Esci'
    },
    browser: {
      url: 'https://example.com/pricing',
      import: 'Importa come livelli',
      imported: 'Importato come livelli'
    },
    controls: {
      period: 'Periodo di fatturazione',
      monthly: 'Mensile',
      yearly: 'Annuale',
      limit: 'Limite di budget',
      roundUp: 'Arrotonda',
      notify: 'Avvisami'
    },
    prototypes: {
      overview: 'Panoramica',
      budgets: 'Budget',
      action: 'Vedi i budget',
      back: 'Indietro'
    },
    layout: {
      alignment: 'Allineamento',
      vertical: ['In alto', 'Al centro', 'In basso'],
      horizontal: ['a sinistra', 'al centro', 'a destra']
    }
  },
  agents: {
    title: 'Porta l’agente che usi già.',
    lede: 'Funziona con il tuo abbonamento e raggiunge la tela tramite il server MCP dell’editor. «Connetti» installa l’adattatore e fa accedere l’agente, passo dopo passo.',
    frame: 'Report mensile, 5 agenti sulla tela',
    report: 'Report mensile',
    month: 'nov',
    server: 'Server MCP di Pairdraw',
    connect: { before: 'Nel browser, esegui', after: 'e apri il link che mostra.' }
  },
  scripting: {
    title: 'Automatizza ogni parte.',
    lede: 'Il documento che l’agente modifica è aperto anche ai tuoi script. Ogni comando supporta --json.',
    items: [
      {
        title: 'CLI',
        detail:
          'Ispeziona, interroga, esporta, converti e controlla file .fig e .pen senza aprire l’editor.'
      },
      {
        title: 'Server MCP',
        detail:
          'Collega Claude Code, Cursor o qualsiasi client MCP all’app in esecuzione o ai file su disco.'
      },
      {
        title: 'Vue SDK',
        detail: 'Primitive e composable headless per costruire un editor tutto tuo.'
      }
    ],
    terminal: 'Terminale'
  },
  privacy: {
    frame: 'Privacy',
    title: 'Pairdraw non invia dati di utilizzo.',
    lede: 'Nessun ping giornaliero, analytics o statistiche di utilizzo. La pagina sulla privacy elenca a cosa si collega l’app e quando.',
    link: 'Leggi la pagina sulla privacy',
    items: [
      {
        title: 'Prima in locale',
        detail: 'I documenti restano sul tuo computer, a meno che tu non li metta su un server.'
      },
      {
        title: 'Le tue chiavi',
        detail:
          'Usa la tua chiave o lascia che la chat usi un agente di programmazione che hai già in funzione.'
      },
      {
        title: 'Un cloud tuo',
        detail:
          'Per modificare insieme, tieni il documento su un server Pairdraw Cloud gestito dal tuo team.'
      }
    ]
  },
  faq: {
    title: 'Domande',
    lede: 'Il resto è nella {docs}, oppure apri una issue su {github}.',
    docs: 'documentazione',
    github: 'GitHub',
    items: [
      {
        question: 'Pairdraw è gratuito?',
        answer:
          'Sì. Pairdraw ha licenza MIT. Pairdraw Cloud, il server opzionale, ha licenza Apache 2.0.'
      },
      {
        question: 'Su quali piattaforme posso usarlo?',
        answer:
          'macOS 13 o successivo, Windows 10 o successivo e Linux con WebKitGTK 2.40 o successivo. L’app web si avvia da una copia del repository.'
      },
      {
        question: 'Mi serve una chiave API?',
        answer:
          'No. Usa la tua chiave per i principali provider o lascia che la chat usi un agente di programmazione già presente sul tuo computer.'
      },
      {
        question: 'Può aprire i miei file Figma?',
        answer:
          'Pairdraw legge e scrive file .fig nativi, apre i documenti .pen supportati e copia e incolla livelli tra le app.'
      },
      {
        question: 'Cosa invia l’app?',
        answer:
          'Niente su come la usi: nessun ping giornaliero, analytics o statistiche di utilizzo. La pagina sulla privacy elenca ogni connessione.'
      }
    ]
  },
  closing: {
    frame: 'Download',
    title: 'I tuoi file. Il tuo agente. Una sola tela.',
    you: 'Tu',
    platforms: {
      mac: 'Apple Silicon e Intel',
      windows: 'Windows 10 o successivo',
      linux: 'WebKitGTK 2.40 o successivo'
    },
    updates: 'Le copie installate si aggiornano da sole dall’app.'
  },
  overlay: {
    title: 'Scarica Pairdraw',
    version: 'Versione {version}. Gratuito e con licenza MIT.',
    close: 'Chiudi',
    platforms: {
      mac: 'Apple Silicon e Intel, macOS 13 o successivo',
      windows: 'x64 e ARM64, Windows 10 o successivo',
      linux: 'x64 e ARM64, WebKitGTK 2.40+'
    },
    note: 'Le copie installate si aggiornano da sole dall’app. La build non è ancora firmata, quindi la prima volta aprila con clic destro, poi Apri.',
    allFiles: 'Tutti i file, con checksum',
    unavailable:
      'Non è stato possibile caricare l’elenco dei download. Tutti i file sono nella pagina delle versioni su GitHub.'
  },
  footer: {
    tagline: 'Un editor di design open source dove tu e un agente AI disegnate sulla stessa tela.',
    product: 'Prodotto',
    roadmap: 'Roadmap',
    changelog: 'Changelog',
    cloud: 'Pairdraw Cloud',
    docs: 'Documentazione',
    gettingStarted: 'Per iniziare',
    cli: 'Riferimento CLI',
    mcp: 'Server MCP',
    sdk: 'Vue SDK',
    community: 'Community',
    issues: 'Issue',
    security: 'Segnala un problema di sicurezza',
    legal: 'Note legali',
    mit: 'Licenza MIT',
    apache: 'Apache 2.0 per Cloud',
    privacy: 'Privacy',
    license: 'Pairdraw ha licenza MIT. Pairdraw Cloud ha licenza Apache 2.0.',
    language: 'Lingua'
  },
  loading: 'Caricamento dell’editor',
  clipboard: {
    copy: 'Copia',
    copied: 'Copiato'
  },
  stage: {
    activate: 'Provalo dal vivo'
  },
  download: {
    title: 'Scarica Pairdraw',
    lede: 'L’app desktop, gratuita e open source, senza registrazione. Le piattaforme senza una versione pronta si compilano dal codice sorgente.',
    version: 'Versione {version}, pubblicata il {date}',
    forPlatform: 'Scarica per {platform}',
    moreFiles: 'Altri download per {platform}',
    releaseNotes: 'Note di rilascio',
    yourSystem: 'Il tuo sistema',
    arch: {
      appleSilicon: 'Apple Silicon',
      intel: 'Intel',
      x64: 'x64',
      arm: 'ARM'
    },
    formats: {
      dmg: 'Immagine disco',
      zip: 'App in un archivio zip',
      exe: 'Programma di installazione',
      msi: 'Per installazioni gestite',
      appimage: 'Funziona sulla maggior parte delle distribuzioni',
      deb: 'Debian, Ubuntu',
      rpm: 'Fedora, openSUSE',
      'tar.gz': 'Si avvia da qualsiasi cartella, senza installazione'
    },
    requirements: 'Requisiti di sistema',
    allTitle: 'Tutti i download',
    checksums: 'Checksum SHA-256',
    onGitHub: 'Versione su GitHub',
    unavailable:
      'Non è stato possibile caricare l’elenco dei download. Tutti i file sono nella pagina delle versioni su GitHub.',
    others: {
      title: 'Altri modi per averla',
      cli: {
        title: 'Riga di comando',
        detail: 'Ispeziona, esporta, controlla e automatizza file .fig senza aprire l’app.'
      },
      source: {
        title: 'Dai sorgenti',
        detail: 'Compila l’app da te con Bun e Rust.',
        action: 'Istruzioni di compilazione'
      }
    },
    beta: {
      badge: 'Beta',
      title: 'Prova quello che arriva',
      lede: 'Le beta portano in anticipo le funzioni della prossima versione, prima che arrivino a tutti.',
      caveats: [
        'Un’app sulla versione stabile non si aggiorna a una beta; installa la beta per provarla.',
        'Su Linux, rimuovi una beta installata con .deb o .rpm prima di installare la versione finale.',
        'Le beta della CLI e dell’SDK sono su npm con il tag next.'
      ],
      notes: 'Novità'
    }
  }
}
