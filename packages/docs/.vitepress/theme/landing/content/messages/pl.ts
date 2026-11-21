import type { LandingMessages } from './types'

export const pl: LandingMessages = {
  nav: {
    label: 'Pairdraw',
    home: 'Pairdraw, powrót na górę',
    howItWorks: 'Jak to działa',
    features: 'Funkcje',
    agents: 'Agenci',
    scripting: 'Skrypty',
    faq: 'FAQ',
    docs: 'Dokumentacja',
    github: 'GitHub',
    download: 'Pobierz'
  },
  hero: {
    frame: 'Hero',
    kicker: 'Edytor graficzny open source na licencji MIT',
    title: 'Projektuj obok swojego agenta.',
    lede: 'Pairdraw otwiera Twoje pliki .fig i .pen i pozwala agentowi AI rysować na tym samym płótnie, a Ty w tym czasie dalej edytujesz.',
    download: 'Pobierz na {platform}',
    downloadAny: 'Pobierz Pairdraw',
    github: 'Zobacz na GitHubie',
    finePrint: 'Za darmo na macOS, Windows i Linux. Użyj własnego modelu lub agenta kodującego.',
    prompt: 'Napisz nagłówek hero: „Projektuj obok swojego agenta.” Zmieść go w dwóch liniach.',
    status: {
      reading: '{agent} czyta stronę',
      adding: '{agent} dodaje H1',
      writing: '{agent} pisze H1'
    },
    comment: 'Zostaw nagłówek w dwóch liniach.',
    reply: 'Szerokość ustawiona na 890, więc tekst łamie się po „obok”.',
    now: 'teraz',
    measure: 'W 890 × H 280',
    layers: 'Warstwy',
    layer: {
      frame: { name: 'Ramka Hero', detail: 'Ramka, 1200 × 980' },
      heading: {
        name: 'H1',
        adding: '{agent} dodaje warstwę',
        writing: '{agent} pisze tekst',
        detail: '{agent} zmienia rozmiar'
      },
      comment: { name: 'Komentarz', detail: '{human}, 1 odpowiedź' },
      lead: { name: 'Wstęp', detail: 'Tekst, 24 px' }
    },
    pause: 'Wstrzymaj animację',
    play: 'Odtwórz animację'
  },
  how: {
    title: 'Od jednego zdania do warstw, które możesz edytować.',
    lede: 'Agent sięga do płótna przez serwer MCP Pairdraw i edytuje plik, który masz otwarty. Nic nie jest eksportowane, wklejane ani odtwarzane od nowa.',
    steps: [
      {
        title: 'Zapytaj na czacie',
        detail:
          'Opisz ekran na czacie, na stronie głównej albo w polu pod płótnem. Użyj własnego klucza API lub agenta kodującego, który już masz na komputerze.'
      },
      {
        title: 'Patrz, jak rysuje',
        detail:
          'Warstwy pojawiają się jedna po drugiej, a ramka, nad którą trwa praca, migocze. Gdy agent skończy, powiadomienie policzy, co się zmieniło.'
      },
      {
        title: 'Edytuj wynik',
        detail:
          'To, co narysował agent, to zwykłe warstwy w Twoim pliku. Zaznacz je, zmień albo poproś o kolejne podejście. Każdą turę można cofnąć.'
      }
    ],
    frames: ['1  Zapytaj na czacie', '2  Patrz, jak rysuje', '3  Edytuj wynik'],
    request: 'Dodaj ekran Cele z pierścieniem oszczędności i trzema celami.',
    reading: 'Odczyt Budget app.fig, strona 1',
    placeholder: 'Poproś o zmiany w ekranie Cele',
    send: 'Wyślij',
    card: {
      title: 'Cele',
      amount: '$2,400',
      saved: 'zaoszczędzone z $3,500',
      goals: [
        { title: 'Nowy laptop', detail: '$900 / $1,400' },
        { title: 'Wyjazd na Bali', detail: '$1,100 / $1,500' },
        { title: 'Fundusz awaryjny', detail: '$400 / $600' }
      ]
    },
    progress: '{count} z {total} warstw',
    props: { title: 'Pierścień oszczędności', ring: 'Pierścień', size: 'Rozmiar' },
    toast: 'Dodano warstw: {count}',
    undo: 'Cofnij'
  },
  features: {
    title: 'Kompletny edytor, w którym każde narzędzie jest dostępne dla agenta.',
    lede: 'Co możesz zrobić ręcznie, agent może wywołać. Pracujecie na tych samych warstwach, w tym samym pliku.',
    frame: 'Funkcje, kliknij warstwę, aby przełączyć',
    list: 'Warstwy',
    tabs: {
      ai: {
        label: 'AI tworzy projekty',
        title: 'AI tworzy projekty',
        detail:
          'Opisz, czego chcesz, na czacie, na stronie głównej albo w polu pod płótnem. Warstwy tworzy i zmienia zestaw {count} narzędzi.'
      },
      browser: {
        label: 'Wbudowana przeglądarka',
        title: 'Wbudowana przeglądarka',
        detail:
          'Otwórz stronę w osobnym oknie, zaimportuj ją lub jeden element jako warstwy i pozwól czatowi czytać ją i klikać za Twoją zgodą.'
      },
      controls: {
        label: 'Działające kontrolki',
        title: 'Działające kontrolki',
        detail:
          'Nadaj komponentowi zachowanie Reka UI, na przykład przełącznik, suwak lub karty, i wypróbuj je na żywo z prawdziwym wprowadzaniem i klawiaturą.'
      },
      prototypes: {
        label: 'Prototypy',
        title: 'Prototypy',
        detail:
          'Połącz ramki interakcjami po kliknięciu lub z opóźnieniem, a potem odtwórz je na płótnie z przejściem natychmiastowym lub przenikaniem.'
      },
      layout: {
        label: 'Auto layout i CSS Grid',
        title: 'Auto layout i CSS Grid',
        detail:
          'Układ flex i siatka z wypełnieniem, odstępami, wyrównaniem i ścieżkami, które dopasowują się do zmian treści.'
      }
    },
    ai: {
      prompt: 'Zaprojektuj ekran ustawień z przełącznikami powiadomień i przyciskiem wylogowania.',
      settings: 'Ustawienia',
      alerts: 'Alerty budżetu',
      summary: 'Podsumowanie tygodnia',
      signIn: 'Nowe logowanie',
      signOut: 'Wyloguj się'
    },
    browser: {
      url: 'https://example.com/pricing',
      import: 'Importuj jako warstwy',
      imported: 'Zaimportowano jako warstwy'
    },
    controls: {
      period: 'Okres rozliczeniowy',
      monthly: 'Miesięcznie',
      yearly: 'Rocznie',
      limit: 'Limit budżetu',
      roundUp: 'Zaokrąglaj w górę',
      notify: 'Powiadamiaj mnie'
    },
    prototypes: {
      overview: 'Przegląd',
      budgets: 'Budżety',
      action: 'Zobacz budżety',
      back: 'Wstecz'
    },
    layout: {
      alignment: 'Wyrównanie',
      vertical: ['Na górze', 'Pośrodku', 'Na dole'],
      horizontal: ['po lewej', 'na środku', 'po prawej']
    }
  },
  agents: {
    title: 'Używaj agenta, którego już masz.',
    lede: 'Działa w ramach Twojej subskrypcji i sięga do płótna przez serwer MCP edytora. „Połącz” instaluje adapter i loguje agenta krok po kroku.',
    frame: 'Raport miesięczny, 5 agentów na płótnie',
    report: 'Raport miesięczny',
    month: 'lis',
    server: 'Serwer MCP Pairdraw',
    connect: { before: 'W przeglądarce uruchom', after: 'i otwórz link, który wypisze.' }
  },
  scripting: {
    title: 'Wszystko da się oskryptować.',
    lede: 'Dokument, który edytuje agent, jest otwarty także dla Twoich skryptów. Każde polecenie obsługuje --json.',
    items: [
      {
        title: 'CLI',
        detail:
          'Przeglądaj, odpytuj, eksportuj, konwertuj i sprawdzaj pliki .fig i .pen bez otwierania edytora.'
      },
      {
        title: 'Serwer MCP',
        detail:
          'Podłącz Claude Code, Cursor lub dowolnego klienta MCP do działającej aplikacji albo do plików na dysku.'
      },
      {
        title: 'Vue SDK',
        detail: 'Prymitywy i composables bez interfejsu do budowy własnego edytora.'
      }
    ],
    terminal: 'Terminal'
  },
  privacy: {
    frame: 'Prywatność',
    title: 'Pairdraw nie wysyła danych o użyciu.',
    lede: 'Bez codziennego pingu, analityki i statystyk użycia. Strona o prywatności opisuje, z czym i kiedy łączy się aplikacja.',
    link: 'Przeczytaj stronę o prywatności',
    items: [
      {
        title: 'Najpierw lokalnie',
        detail: 'Dokumenty zostają na Twoim komputerze, chyba że umieścisz je na serwerze.'
      },
      {
        title: 'Twoje klucze',
        detail:
          'Użyj własnego klucza albo pozwól czatowi korzystać z agenta kodującego, którego już uruchamiasz.'
      },
      {
        title: 'Własna chmura',
        detail:
          'Aby edytować wspólnie, trzymaj dokument na serwerze Pairdraw Cloud prowadzonym przez Twój zespół.'
      }
    ]
  },
  faq: {
    title: 'Pytania',
    lede: 'Wszystko inne znajdziesz w {docs}, możesz też zgłosić issue na {github}.',
    docs: 'dokumentacji',
    github: 'GitHubie',
    items: [
      {
        question: 'Czy Pairdraw jest darmowy?',
        answer:
          'Tak. Pairdraw jest na licencji MIT. Pairdraw Cloud, opcjonalny serwer, jest na licencji Apache 2.0.'
      },
      {
        question: 'Na jakich platformach działa?',
        answer:
          'macOS 13 lub nowszy, Windows 10 lub nowszy oraz Linux z WebKitGTK 2.40 lub nowszym. Aplikacja webowa działa z lokalnej kopii repozytorium.'
      },
      {
        question: 'Czy potrzebuję klucza API?',
        answer:
          'Nie. Użyj własnego klucza do głównych dostawców albo pozwól czatowi korzystać z agenta kodującego, który już masz na komputerze.'
      },
      {
        question: 'Czy otworzy moje pliki z Figmy?',
        answer:
          'Pairdraw czyta i zapisuje natywne pliki .fig, otwiera obsługiwane dokumenty .pen oraz kopiuje i wkleja warstwy między aplikacjami.'
      },
      {
        question: 'Co aplikacja wysyła na zewnątrz?',
        answer:
          'Nic o tym, jak jej używasz: bez codziennego pingu, analityki i statystyk użycia. Strona o prywatności wymienia każde połączenie.'
      }
    ]
  },
  closing: {
    frame: 'Pobieranie',
    title: 'Twoje pliki. Twój agent. Jedno płótno.',
    you: 'Ty',
    platforms: {
      mac: 'Apple Silicon i Intel',
      windows: 'Windows 10 lub nowszy',
      linux: 'WebKitGTK 2.40 lub nowszy'
    },
    updates: 'Zainstalowane kopie aktualizują się same z poziomu aplikacji.'
  },
  overlay: {
    title: 'Pobierz Pairdraw',
    version: 'Wersja {version}. Darmowa, na licencji MIT.',
    close: 'Zamknij',
    platforms: {
      mac: 'Apple Silicon i Intel, macOS 13 lub nowszy',
      windows: 'x64 i ARM64, Windows 10 lub nowszy',
      linux: 'x64 i ARM64, WebKitGTK 2.40+'
    },
    note: 'Zainstalowane kopie aktualizują się same z poziomu aplikacji. Build nie jest jeszcze podpisany, więc za pierwszym razem otwórz go prawym przyciskiem myszy i wybierz Otwórz.',
    allFiles: 'Wszystkie pliki z sumami kontrolnymi',
    unavailable:
      'Nie udało się wczytać listy plików. Wszystkie pliki są na stronie wydań na GitHubie.'
  },
  footer: {
    tagline: 'Edytor graficzny open source, w którym Ty i agent AI rysujecie na tym samym płótnie.',
    product: 'Produkt',
    roadmap: 'Plan rozwoju',
    changelog: 'Lista zmian',
    cloud: 'Pairdraw Cloud',
    docs: 'Dokumentacja',
    gettingStarted: 'Pierwsze kroki',
    cli: 'Dokumentacja CLI',
    mcp: 'Serwer MCP',
    sdk: 'Vue SDK',
    community: 'Społeczność',
    issues: 'Zgłoszenia',
    security: 'Zgłoś problem z bezpieczeństwem',
    legal: 'Informacje prawne',
    mit: 'Licencja MIT',
    apache: 'Apache 2.0 dla Cloud',
    privacy: 'Prywatność',
    license: 'Pairdraw jest na licencji MIT. Pairdraw Cloud jest na licencji Apache 2.0.',
    language: 'Język'
  },
  loading: 'Ładowanie edytora',
  clipboard: {
    copy: 'Kopiuj',
    copied: 'Skopiowano'
  },
  stage: {
    activate: 'Wypróbuj na żywo'
  },
  download: {
    title: 'Pobierz Pairdraw',
    lede: 'Aplikacja desktopowa, darmowa i otwartoźródłowa, bez rejestracji. Platformy bez gotowej wersji buduje się ze źródeł.',
    version: 'Wersja {version}, wydana {date}',
    forPlatform: 'Pobierz na {platform}',
    moreFiles: 'Więcej plików dla {platform}',
    releaseNotes: 'Informacje o wydaniu',
    yourSystem: 'Twój system',
    arch: {
      appleSilicon: 'Apple Silicon',
      intel: 'Intel',
      x64: 'x64',
      arm: 'ARM'
    },
    formats: {
      dmg: 'Obraz dysku',
      zip: 'Aplikacja w archiwum zip',
      exe: 'Instalator',
      msi: 'Do instalacji zarządzanych',
      appimage: 'Działa na większości dystrybucji',
      deb: 'Debian, Ubuntu',
      rpm: 'Fedora, openSUSE',
      'tar.gz': 'Działa z dowolnego folderu, bez instalacji'
    },
    requirements: 'Wymagania systemowe',
    allTitle: 'Wszystkie pliki',
    checksums: 'Sumy kontrolne SHA-256',
    onGitHub: 'Wydanie na GitHubie',
    unavailable:
      'Nie udało się wczytać listy plików. Wszystkie pliki są na stronie wydań na GitHubie.',
    others: {
      title: 'Inne sposoby',
      cli: {
        title: 'Wiersz poleceń',
        detail: 'Przeglądaj, eksportuj, sprawdzaj i skryptuj pliki .fig bez otwierania aplikacji.'
      },
      source: {
        title: 'Ze źródeł',
        detail: 'Zbuduj aplikację samodzielnie z Bun i Rust.',
        action: 'Instrukcja budowania'
      }
    },
    beta: {
      badge: 'Beta',
      title: 'Wypróbuj to, co nadchodzi',
      lede: 'Bety dają wcześniej funkcje następnej wersji, zanim trafią do wszystkich.',
      caveats: [
        'Aplikacja w wersji stabilnej nie aktualizuje się do bety; zainstaluj betę, aby ją wypróbować.',
        'Na Linuksie usuń betę zainstalowaną z .deb lub .rpm przed instalacją wersji finalnej.',
        'Bety CLI i SDK są w npm pod tagiem next.'
      ],
      notes: 'Co nowego'
    }
  }
}
