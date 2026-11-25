import type { LandingMessages } from './types'

export const es: LandingMessages = {
  nav: {
    label: 'Pairdraw',
    home: 'Pairdraw, volver arriba',
    howItWorks: 'Cómo funciona',
    features: 'Funciones',
    agents: 'Agentes',
    scripting: 'Scripts',
    faq: 'FAQ',
    docs: 'Documentación',
    github: 'GitHub',
    download: 'Descargar'
  },
  hero: {
    frame: 'Hero',
    kicker: 'Editor de diseño de código abierto, con licencia MIT',
    title: 'Diseña junto a tu agente.',
    lede: 'Pairdraw abre tus archivos .fig y .pen y deja que un agente de IA dibuje en el mismo lienzo mientras sigues editando.',
    download: 'Descargar para {platform}',
    downloadAny: 'Descargar Pairdraw',
    github: 'Ver en GitHub',
    finePrint: 'Gratis para macOS, Windows y Linux. Usa tu propio modelo o agente de programación.',
    comment: 'Mantén el titular en dos líneas.',
    reply: 'Lo puse a 890 de ancho para que salte de línea después de «a».',
    now: 'ahora',
    measure: 'W 890 × H 280',
    layers: 'Capas',
    layer: {
      frame: { name: 'Marco Hero', detail: 'Marco, 1200 × 980' },
      heading: {
        name: 'H1',
        detail: '{agent} le está cambiando el tamaño'
      },
      comment: { name: 'Comentario', detail: '{human}, 1 respuesta' },
      lead: { name: 'Entradilla', detail: 'Texto, 24 px' }
    },
    pause: 'Pausar la animación',
    play: 'Reproducir la animación'
  },
  how: {
    title: 'De una frase a capas que puedes editar.',
    lede: 'El agente llega al lienzo a través del servidor MCP de Pairdraw y edita el archivo que tienes abierto. Nada se exporta, se pega ni se reconstruye.',
    steps: [
      {
        title: 'Pide en el chat',
        detail:
          'Describe la pantalla en el chat, en Inicio o en el campo bajo el lienzo. Usa tu propia clave de API o un agente de programación que ya tengas en tu equipo.'
      },
      {
        title: 'Míralo dibujar',
        detail:
          'Las capas aparecen una tras otra mientras brilla el marco en el que trabaja. Cuando el agente termina, un aviso cuenta lo que cambió.'
      },
      {
        title: 'Edita el resultado',
        detail:
          'Lo que dibujó el agente son capas normales en tu archivo. Selecciónalas, cámbialas o pide otra pasada. Cada turno se puede deshacer.'
      }
    ],
    frames: ['1  Pide en el chat', '2  Míralo dibujar', '3  Edita el resultado'],
    request: 'Añade una pantalla de Metas con un anillo de ahorro y tres metas.',
    reading: 'Leyendo Budget app.fig, página 1',
    placeholder: 'Pide cambios en Metas',
    send: 'Enviar',
    card: {
      title: 'Metas',
      amount: '$2,400',
      saved: 'de $3,500 ahorrados',
      goals: [
        { title: 'Portátil nuevo', detail: '$900 / $1,400' },
        { title: 'Viaje a Bali', detail: '$1,100 / $1,500' },
        { title: 'Emergencias', detail: '$400 / $600' }
      ]
    },
    progress: '{count} de {total} capas',
    props: { title: 'Anillo de ahorro', ring: 'Anillo', size: 'Tamaño' },
    toast: '{count} capas añadidas',
    undo: 'Deshacer'
  },
  features: {
    title: 'Un editor completo, con cada herramienta abierta al agente.',
    lede: 'Lo que puedes hacer a mano, el agente lo puede llamar. Los dos trabajáis en las mismas capas, en el mismo archivo.',
    frame: 'Funciones, haz clic en una capa para cambiar',
    list: 'Capas',
    tabs: {
      ai: {
        label: 'La IA crea diseños',
        title: 'La IA crea diseños',
        detail:
          'Describe lo que quieres en el chat, en Inicio o en el campo bajo el lienzo. {count} herramientas crean y cambian las capas.'
      },
      browser: {
        label: 'Navegador integrado',
        title: 'Navegador integrado',
        detail:
          'Abre una página en su propia ventana, importa la página o un elemento como capas y deja que el chat la lea y haga clic en ella con tu aprobación.'
      },
      controls: {
        label: 'Controles que funcionan',
        title: 'Controles que funcionan',
        detail:
          'Dale a un componente un comportamiento de Reka UI, como un interruptor, un deslizador o pestañas, y pruébalo en vivo con entradas reales y teclado.'
      },
      prototypes: {
        label: 'Prototipos',
        title: 'Prototipos',
        detail:
          'Enlaza marcos con interacciones al hacer clic o tras un retardo, y reprodúcelos en el lienzo con transiciones instantáneas o de fundido.'
      },
      layout: {
        label: 'Auto layout y CSS Grid',
        title: 'Auto layout y CSS Grid',
        detail:
          'Diseño flex y de cuadrícula con relleno, espacio, alineación y pistas que se ajustan cuando cambia el contenido.'
      }
    },
    ai: {
      prompt:
        'Diseña una pantalla de ajustes con interruptores de notificaciones y un botón para cerrar sesión.',
      settings: 'Ajustes',
      alerts: 'Alertas de presupuesto',
      summary: 'Resumen semanal',
      signIn: 'Nuevo inicio de sesión',
      signOut: 'Cerrar sesión'
    },
    browser: {
      url: 'https://example.com/pricing',
      import: 'Importar como capas',
      imported: 'Importado como capas'
    },
    controls: {
      period: 'Periodo de facturación',
      monthly: 'Mensual',
      yearly: 'Anual',
      limit: 'Límite de presupuesto',
      roundUp: 'Redondear',
      notify: 'Avisarme'
    },
    prototypes: {
      overview: 'Resumen',
      budgets: 'Presupuestos',
      action: 'Ver presupuestos',
      back: 'Volver'
    },
    layout: {
      alignment: 'Alineación',
      vertical: ['Arriba', 'En medio', 'Abajo'],
      horizontal: ['a la izquierda', 'al centro', 'a la derecha']
    }
  },
  agents: {
    title: 'Trae el agente que ya usas.',
    lede: 'Funciona con tu propia suscripción y llega al lienzo a través del servidor MCP del editor. «Conectar» instala el adaptador e inicia sesión con el agente, paso a paso.',
    frame: 'Informe mensual, 5 agentes en el lienzo',
    report: 'Informe mensual',
    month: 'nov',
    server: 'Servidor MCP de Pairdraw',
    connect: { before: 'En el navegador, ejecuta', after: 'y abre el enlace que muestra.' }
  },
  scripting: {
    title: 'Automatiza cada parte.',
    lede: 'El documento que edita el agente también está abierto a tus scripts. Todos los comandos admiten --json.',
    items: [
      {
        title: 'CLI',
        detail:
          'Inspecciona, consulta, exporta, convierte y revisa archivos .fig y .pen sin abrir el editor.'
      },
      {
        title: 'Servidor MCP',
        detail:
          'Conecta Claude Code, Cursor o cualquier cliente MCP a la app en ejecución o a archivos en disco.'
      },
      {
        title: 'Vue SDK',
        detail: 'Primitivas y composables sin interfaz para construir tu propio editor.'
      }
    ],
    terminal: 'Terminal'
  },
  privacy: {
    frame: 'Privacidad',
    title: 'Pairdraw no envía datos de uso.',
    lede: 'Sin ping diario, analíticas ni estadísticas de uso. La página de privacidad indica a qué se conecta la app y cuándo.',
    link: 'Leer la página de privacidad',
    items: [
      {
        title: 'Local primero',
        detail: 'Los documentos se quedan en tu equipo salvo que los pongas en un servidor.'
      },
      {
        title: 'Tus claves',
        detail:
          'Usa tu propia clave o deja que el chat use un agente de programación que ya ejecutas.'
      },
      {
        title: 'Tu propia nube',
        detail:
          'Para editar juntos, guarda el documento en un servidor de Pairdraw Cloud que gestione tu equipo.'
      }
    ]
  },
  faq: {
    title: 'Preguntas',
    lede: 'Todo lo demás está en la {docs}, o abre una issue en {github}.',
    docs: 'documentación',
    github: 'GitHub',
    items: [
      {
        question: '¿Pairdraw es gratis?',
        answer:
          'Sí. Pairdraw tiene licencia MIT. Pairdraw Cloud, el servidor opcional, tiene licencia Apache 2.0.'
      },
      {
        question: '¿En qué plataformas puedo usarlo?',
        answer:
          'macOS 13 o posterior, Windows 10 o posterior y Linux con WebKitGTK 2.40 o posterior. La app web se ejecuta desde una copia del repositorio.'
      },
      {
        question: '¿Necesito una clave de API?',
        answer:
          'No. Usa tu propia clave para los principales proveedores o deja que el chat use un agente de programación que ya tengas en tu equipo.'
      },
      {
        question: '¿Puede abrir mis archivos de Figma?',
        answer:
          'Pairdraw lee y escribe archivos .fig nativos, abre los documentos .pen compatibles y copia y pega capas entre apps.'
      },
      {
        question: '¿Qué envía la app?',
        answer:
          'Nada sobre cómo la usas: sin ping diario, analíticas ni estadísticas de uso. La página de privacidad enumera cada conexión.'
      }
    ]
  },
  closing: {
    frame: 'Descarga',
    title: 'Tus archivos. Tu agente. Un lienzo.',
    you: 'Tú',
    platforms: {
      mac: 'Apple Silicon e Intel',
      windows: 'Windows 10 o posterior',
      linux: 'WebKitGTK 2.40 o posterior'
    },
    updates: 'Las copias instaladas se actualizan solas desde la app.'
  },
  overlay: {
    title: 'Descargar Pairdraw',
    version: 'Versión {version}. Gratis y con licencia MIT.',
    close: 'Cerrar',
    platforms: {
      mac: 'Apple Silicon e Intel, macOS 13 o posterior',
      windows: 'x64 y ARM64, Windows 10 o posterior',
      linux: 'x64 y ARM64, WebKitGTK 2.40+'
    },
    note: 'Las copias instaladas se actualizan solas desde la app. La compilación aún no está firmada, así que la primera vez ábrela con clic derecho y luego Abrir.',
    allFiles: 'Todos los archivos, con sumas de comprobación',
    unavailable:
      'No se pudo cargar la lista de descargas. Todos los archivos están en la página de versiones en GitHub.'
  },
  footer: {
    tagline:
      'Un editor de diseño de código abierto donde tú y un agente de IA dibujáis en el mismo lienzo.',
    product: 'Producto',
    roadmap: 'Hoja de ruta',
    changelog: 'Registro de cambios',
    cloud: 'Pairdraw Cloud',
    docs: 'Documentación',
    gettingStarted: 'Primeros pasos',
    cli: 'Referencia de la CLI',
    mcp: 'Servidor MCP',
    sdk: 'Vue SDK',
    community: 'Comunidad',
    issues: 'Issues',
    security: 'Informar de un problema de seguridad',
    legal: 'Legal',
    mit: 'Licencia MIT',
    apache: 'Apache 2.0 para Cloud',
    privacy: 'Privacidad',
    license: 'Pairdraw tiene licencia MIT. Pairdraw Cloud tiene licencia Apache 2.0.',
    language: 'Idioma'
  },
  loading: 'Cargando el editor',
  clipboard: {
    copy: 'Copiar',
    copied: 'Copiado'
  },
  stage: {
    activate: 'Pruébalo en vivo'
  },
  download: {
    title: 'Descargar Pairdraw',
    lede: 'La app de escritorio, gratuita y de código abierto, sin registro. Las plataformas sin versión preparada se compilan desde el código fuente.',
    version: 'Versión {version}, publicada el {date}',
    forPlatform: 'Descargar para {platform}',
    moreFiles: 'Más descargas para {platform}',
    releaseNotes: 'Notas de la versión',
    yourSystem: 'Tu sistema',
    arch: {
      appleSilicon: 'Apple Silicon',
      intel: 'Intel',
      x64: 'x64',
      arm: 'ARM'
    },
    formats: {
      dmg: 'Imagen de disco',
      zip: 'App en un archivo zip',
      exe: 'Instalador',
      msi: 'Para instalaciones gestionadas',
      appimage: 'Funciona en la mayoría de distribuciones',
      deb: 'Debian, Ubuntu',
      rpm: 'Fedora, openSUSE',
      'tar.gz': 'Se ejecuta desde cualquier carpeta, sin instalar'
    },
    requirements: 'Requisitos del sistema',
    allTitle: 'Todas las descargas',
    checksums: 'Sumas de comprobación SHA-256',
    onGitHub: 'Versión en GitHub',
    unavailable:
      'No se pudo cargar la lista de descargas. Todos los archivos están en la página de versiones en GitHub.',
    others: {
      title: 'Otras formas de obtenerlo',
      cli: {
        title: 'Línea de comandos',
        detail: 'Inspecciona, exporta, revisa y automatiza archivos .fig sin abrir la app.'
      },
      source: {
        title: 'Desde el código fuente',
        detail: 'Compila la app tú mismo con Bun y Rust.',
        action: 'Instrucciones de compilación'
      }
    },
    beta: {
      badge: 'Beta',
      title: 'Prueba lo que viene',
      lede: 'Las betas traen antes las funciones de la próxima versión, antes de que lleguen a todos.',
      caveats: [
        'Una app con la versión estable no se actualiza a una beta; instala la beta para probarla.',
        'En Linux, quita una beta instalada con .deb o .rpm antes de instalar la versión final.',
        'Las betas de la CLI y el SDK están en npm con la etiqueta next.'
      ],
      notes: 'Novedades'
    }
  }
}
