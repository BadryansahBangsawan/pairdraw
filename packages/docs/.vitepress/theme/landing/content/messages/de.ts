import type { LandingMessages } from './types'

export const de: LandingMessages = {
  nav: {
    label: 'Pairdraw',
    home: 'Pairdraw, zurück nach oben',
    howItWorks: 'So funktioniert es',
    features: 'Funktionen',
    agents: 'Agenten',
    scripting: 'Skripte',
    faq: 'FAQ',
    docs: 'Doku',
    github: 'GitHub',
    download: 'Herunterladen'
  },
  hero: {
    frame: 'Hero',
    kicker: 'Open-Source-Design-Editor, MIT-lizenziert',
    title: 'Design neben Ihrem Agenten.',
    lede: 'Pairdraw öffnet Ihre .fig- und .pen-Dateien und lässt einen KI-Agenten auf derselben Leinwand zeichnen, während Sie weiter bearbeiten.',
    download: 'Für {platform} herunterladen',
    downloadAny: 'Pairdraw herunterladen',
    github: 'Auf GitHub ansehen',
    finePrint:
      'Kostenlos für macOS, Windows und Linux. Mit Ihrem eigenen Modell oder Coding-Agenten.',
    prompt:
      'Schreib die Hero-Überschrift: „Design neben Ihrem Agenten.“ Halte sie auf zwei Zeilen.',
    status: {
      reading: '{agent} liest die Seite',
      adding: '{agent} fügt H1 hinzu',
      writing: '{agent} schreibt H1'
    },
    comment: 'Die Überschrift bitte auf zwei Zeilen lassen.',
    reply: 'Auf 890 Breite gesetzt, damit sie nach „neben“ umbricht.',
    now: 'jetzt',
    measure: 'W 890 × H 280',
    layers: 'Ebenen',
    layer: {
      frame: { name: 'Hero-Rahmen', detail: 'Rahmen, 1200 × 980' },
      heading: {
        name: 'H1',
        adding: '{agent} fügt sie hinzu',
        writing: '{agent} schreibt sie',
        detail: '{agent} ändert ihre Größe'
      },
      comment: { name: 'Kommentar', detail: '{human}, 1 Antwort' },
      lead: { name: 'Einleitung', detail: 'Text, 24 px' }
    },
    pause: 'Animation anhalten',
    play: 'Animation abspielen'
  },
  how: {
    title: 'Von einem Satz zu Ebenen, die Sie bearbeiten können.',
    lede: 'Der Agent erreicht die Leinwand über den MCP-Server von Pairdraw und bearbeitet die Datei, die Sie geöffnet haben. Nichts wird exportiert, eingefügt oder nachgebaut.',
    steps: [
      {
        title: 'Im Chat fragen',
        detail:
          'Beschreiben Sie den Bildschirm im Chat, auf der Startseite oder im Eingabefeld unter der Leinwand. Nutzen Sie Ihren eigenen API-Schlüssel oder einen Coding-Agenten, der schon auf Ihrem Computer ist.'
      },
      {
        title: 'Beim Zeichnen zusehen',
        detail:
          'Ebenen erscheinen nacheinander, während der Rahmen, an dem gearbeitet wird, schimmert. Sobald der Agent fertig ist, zählt ein Hinweis, was sich geändert hat.'
      },
      {
        title: 'Ergebnis bearbeiten',
        detail:
          'Was der Agent gezeichnet hat, sind normale Ebenen in Ihrer Datei. Wählen Sie sie aus, ändern Sie sie oder bitten Sie um einen weiteren Durchgang. Jeder Schritt lässt sich rückgängig machen.'
      }
    ],
    frames: ['1  Im Chat fragen', '2  Beim Zeichnen zusehen', '3  Ergebnis bearbeiten'],
    request: 'Füge einen Ziele-Bildschirm mit einem Spar-Ring und drei Zielen hinzu.',
    reading: 'Liest Budget app.fig, Seite 1',
    placeholder: 'Änderungen an „Ziele“ anfragen',
    send: 'Senden',
    card: {
      title: 'Ziele',
      amount: '$2,400',
      saved: 'von $3,500 gespart',
      goals: [
        { title: 'Neuer Laptop', detail: '$900 / $1,400' },
        { title: 'Bali-Reise', detail: '$1,100 / $1,500' },
        { title: 'Notgroschen', detail: '$400 / $600' }
      ]
    },
    progress: '{count} von {total} Ebenen',
    props: { title: 'Spar-Ring', ring: 'Ring', size: 'Größe' },
    toast: '{count} Ebenen hinzugefügt',
    undo: 'Rückgängig'
  },
  features: {
    title: 'Ein vollständiger Editor, in dem jedes Werkzeug auch dem Agenten offensteht.',
    lede: 'Was Sie von Hand tun können, kann der Agent aufrufen. Sie arbeiten beide an denselben Ebenen, in derselben Datei.',
    frame: 'Funktionen, zum Wechseln eine Ebene anklicken',
    list: 'Ebenen',
    tabs: {
      ai: {
        label: 'KI erstellt Designs',
        title: 'KI erstellt Designs',
        detail:
          'Beschreiben Sie im Chat, auf der Startseite oder im Eingabefeld unter der Leinwand, was Sie möchten. {count} Werkzeuge erstellen und ändern die Ebenen.'
      },
      browser: {
        label: 'Integrierter Browser',
        title: 'Integrierter Browser',
        detail:
          'Öffnen Sie eine Seite in einem eigenen Fenster, importieren Sie die Seite oder ein Element als Ebenen und lassen Sie den Chat sie mit Ihrer Zustimmung lesen und anklicken.'
      },
      controls: {
        label: 'Funktionierende Steuerelemente',
        title: 'Funktionierende Steuerelemente',
        detail:
          'Geben Sie einer Komponente ein Reka-UI-Verhalten wie Schalter, Schieberegler oder Tabs und probieren Sie es live mit echten Eingaben und Tastatur aus.'
      },
      prototypes: {
        label: 'Prototypen',
        title: 'Prototypen',
        detail:
          'Verbinden Sie Rahmen mit Interaktionen bei Klick oder nach Verzögerung und spielen Sie sie auf der Leinwand mit sofortigem oder überblendetem Übergang ab.'
      },
      layout: {
        label: 'Auto-Layout und CSS Grid',
        title: 'Auto-Layout und CSS Grid',
        detail:
          'Flex- und Grid-Layout mit Innenabstand, Abstand, Ausrichtung und Spuren, die sich anpassen, wenn sich der Inhalt ändert.'
      }
    },
    ai: {
      prompt:
        'Gestalte einen Einstellungsbildschirm mit Schaltern für Benachrichtigungen und einem Abmelde-Button.',
      settings: 'Einstellungen',
      alerts: 'Budget-Warnungen',
      summary: 'Wochenübersicht',
      signIn: 'Neue Anmeldung',
      signOut: 'Abmelden'
    },
    browser: {
      url: 'https://example.com/pricing',
      import: 'Als Ebenen importieren',
      imported: 'Als Ebenen importiert'
    },
    controls: {
      period: 'Abrechnungszeitraum',
      monthly: 'Monatlich',
      yearly: 'Jährlich',
      limit: 'Budgetgrenze',
      roundUp: 'Aufrunden',
      notify: 'Benachrichtigen'
    },
    prototypes: {
      overview: 'Übersicht',
      budgets: 'Budgets',
      action: 'Budgets ansehen',
      back: 'Zurück'
    },
    layout: {
      alignment: 'Ausrichtung',
      vertical: ['Oben', 'Mitte', 'Unten'],
      horizontal: ['links', 'Mitte', 'rechts']
    }
  },
  agents: {
    title: 'Bringen Sie den Agenten mit, den Sie schon nutzen.',
    lede: 'Er läuft über Ihr eigenes Abonnement und erreicht die Leinwand über den MCP-Server des Editors. „Verbinden“ installiert den Adapter und meldet den Agenten Schritt für Schritt an.',
    frame: 'Monatsbericht, 5 Agenten auf der Leinwand',
    report: 'Monatsbericht',
    month: 'Nov.',
    server: 'Pairdraw-MCP-Server',
    connect: {
      before: 'Führen Sie im Browser',
      after: 'aus und öffnen Sie den Link, den der Befehl ausgibt.'
    }
  },
  scripting: {
    title: 'Alles lässt sich skripten.',
    lede: 'Das Dokument, das der Agent bearbeitet, steht auch Ihren Skripten offen. Jeder Befehl unterstützt --json.',
    items: [
      {
        title: 'CLI',
        detail:
          '.fig- und .pen-Dateien untersuchen, abfragen, exportieren, konvertieren und prüfen, ohne den Editor zu öffnen.'
      },
      {
        title: 'MCP-Server',
        detail:
          'Verbinden Sie Claude Code, Cursor oder einen beliebigen MCP-Client mit der laufenden App oder mit Dateien auf der Festplatte.'
      },
      {
        title: 'Vue SDK',
        detail: 'Headless-Primitive und Composables, um einen eigenen Editor zu bauen.'
      }
    ],
    terminal: 'Terminal'
  },
  privacy: {
    frame: 'Datenschutz',
    title: 'Pairdraw sendet keine Nutzungsdaten.',
    lede: 'Kein täglicher Ping, keine Analytics, keine Nutzungsstatistiken. Die Datenschutzseite listet auf, womit sich die App verbindet und wann.',
    link: 'Datenschutzseite lesen',
    items: [
      {
        title: 'Lokal zuerst',
        detail: 'Dokumente bleiben auf Ihrem Computer, es sei denn, Sie legen sie auf einen Server.'
      },
      {
        title: 'Ihre Schlüssel',
        detail:
          'Verwenden Sie Ihren eigenen Schlüssel oder lassen Sie den Chat einen Coding-Agenten nutzen, den Sie schon verwenden.'
      },
      {
        title: 'Ihre eigene Cloud',
        detail:
          'Um gemeinsam zu bearbeiten, legen Sie das Dokument auf einen Server mit Pairdraw Cloud, den Ihr Team betreibt.'
      }
    ]
  },
  faq: {
    title: 'Fragen',
    lede: 'Alles Weitere steht in der {docs}, oder eröffnen Sie ein Issue auf {github}.',
    docs: 'Dokumentation',
    github: 'GitHub',
    items: [
      {
        question: 'Ist Pairdraw kostenlos?',
        answer:
          'Ja. Pairdraw steht unter der MIT-Lizenz. Pairdraw Cloud, der optionale Server, steht unter Apache 2.0.'
      },
      {
        question: 'Auf welchen Plattformen läuft es?',
        answer:
          'macOS 13 oder neuer, Windows 10 oder neuer und Linux mit WebKitGTK 2.40 oder neuer. Die Web-App läuft aus einem Checkout des Repositorys.'
      },
      {
        question: 'Brauche ich einen API-Schlüssel?',
        answer:
          'Nein. Verwenden Sie Ihren eigenen Schlüssel für die großen Anbieter oder lassen Sie den Chat einen Coding-Agenten nutzen, der schon auf Ihrem Computer ist.'
      },
      {
        question: 'Kann es meine Figma-Dateien öffnen?',
        answer:
          'Pairdraw liest und schreibt native .fig-Dateien, öffnet unterstützte .pen-Dokumente und kopiert und fügt Ebenen zwischen Apps ein.'
      },
      {
        question: 'Was sendet die App nach Hause?',
        answer:
          'Nichts darüber, wie Sie sie nutzen: kein täglicher Ping, keine Analytics, keine Nutzungsstatistiken. Die Datenschutzseite listet jede Verbindung auf.'
      }
    ]
  },
  closing: {
    frame: 'Download',
    title: 'Ihre Dateien. Ihr Agent. Eine Leinwand.',
    you: 'Sie',
    platforms: {
      mac: 'Apple Silicon und Intel',
      windows: 'Windows 10 oder neuer',
      linux: 'WebKitGTK 2.40 oder neuer'
    },
    updates: 'Installierte Versionen aktualisieren sich selbst aus der App.'
  },
  overlay: {
    title: 'Pairdraw herunterladen',
    version: 'Version {version}. Kostenlos und MIT-lizenziert.',
    close: 'Schließen',
    platforms: {
      mac: 'Apple Silicon und Intel, macOS 13 oder neuer',
      windows: 'x64 und ARM64, Windows 10 oder neuer',
      linux: 'x64 und ARM64, WebKitGTK 2.40+'
    },
    note: 'Installierte Versionen aktualisieren sich selbst aus der App. Der Build ist noch nicht signiert, öffnen Sie ihn deshalb beim ersten Mal per Rechtsklick und dann „Öffnen“.',
    allFiles: 'Alle Dateien, mit Prüfsummen',
    unavailable:
      'Die Liste der Downloads konnte nicht geladen werden. Alle Dateien finden Sie auf der Release-Seite auf GitHub.'
  },
  footer: {
    tagline:
      'Ein Open-Source-Design-Editor, in dem Sie und ein KI-Agent auf derselben Leinwand zeichnen.',
    product: 'Produkt',
    roadmap: 'Roadmap',
    changelog: 'Änderungsprotokoll',
    cloud: 'Pairdraw Cloud',
    docs: 'Dokumentation',
    gettingStarted: 'Erste Schritte',
    cli: 'CLI-Referenz',
    mcp: 'MCP-Server',
    sdk: 'Vue SDK',
    community: 'Community',
    issues: 'Issues',
    security: 'Sicherheitsproblem melden',
    legal: 'Rechtliches',
    mit: 'MIT-Lizenz',
    apache: 'Apache 2.0 für Cloud',
    privacy: 'Datenschutz',
    license: 'Pairdraw steht unter der MIT-Lizenz. Pairdraw Cloud steht unter Apache 2.0.',
    language: 'Sprache'
  },
  loading: 'Editor wird geladen',
  clipboard: {
    copy: 'Kopieren',
    copied: 'Kopiert'
  },
  stage: {
    activate: 'Live ausprobieren'
  },
  download: {
    title: 'Pairdraw herunterladen',
    lede: 'Die Desktop-App, kostenlos und quelloffen, ohne Anmeldung. Plattformen ohne fertige Version werden aus dem Quellcode erstellt.',
    version: 'Version {version}, veröffentlicht am {date}',
    forPlatform: 'Für {platform} herunterladen',
    moreFiles: 'Weitere Downloads für {platform}',
    releaseNotes: 'Versionshinweise',
    yourSystem: 'Ihr System',
    arch: {
      appleSilicon: 'Apple Silicon',
      intel: 'Intel',
      x64: 'x64',
      arm: 'ARM'
    },
    formats: {
      dmg: 'Image-Datei',
      zip: 'App im ZIP-Archiv',
      exe: 'Installationsprogramm',
      msi: 'Für verwaltete Installationen',
      appimage: 'Läuft auf den meisten Distributionen',
      deb: 'Debian, Ubuntu',
      rpm: 'Fedora, openSUSE',
      'tar.gz': 'Läuft aus jedem Ordner, ohne Installation'
    },
    requirements: 'Systemanforderungen',
    allTitle: 'Alle Downloads',
    checksums: 'SHA-256-Prüfsummen',
    onGitHub: 'Release auf GitHub',
    unavailable:
      'Die Liste der Downloads konnte nicht geladen werden. Alle Dateien finden Sie auf der Release-Seite auf GitHub.',
    others: {
      title: 'Weitere Wege',
      cli: {
        title: 'Kommandozeile',
        detail:
          '.fig-Dateien untersuchen, exportieren, prüfen und skripten, ohne die App zu öffnen.'
      },
      source: {
        title: 'Aus dem Quellcode',
        detail: 'Bauen Sie die App selbst mit Bun und Rust.',
        action: 'Build-Anleitung'
      }
    },
    beta: {
      badge: 'Beta',
      title: 'Probieren Sie, was kommt',
      lede: 'Betas bringen die Funktionen der nächsten Version früher, bevor sie alle erreichen.',
      caveats: [
        'Eine App mit der stabilen Version aktualisiert sich nicht auf eine Beta; installieren Sie die Beta, um sie zu testen.',
        'Entfernen Sie unter Linux eine mit .deb oder .rpm installierte Beta, bevor Sie die finale Version installieren.',
        'Die Betas von CLI und SDK liegen auf npm unter dem Tag next.'
      ],
      notes: 'Was ist neu'
    }
  }
}
