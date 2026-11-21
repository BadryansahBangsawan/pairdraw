import type { LandingMessages } from './types'

export const en: LandingMessages = {
  nav: {
    label: 'Pairdraw',
    home: 'Pairdraw, back to the top',
    howItWorks: 'How it works',
    features: 'Features',
    agents: 'Agents',
    scripting: 'Scripting',
    faq: 'FAQ',
    docs: 'Docs',
    github: 'GitHub',
    download: 'Download'
  },
  hero: {
    frame: 'Hero',
    kicker: 'Open-source design editor, MIT licensed',
    title: 'Design next to your agent.',
    lede: 'Pairdraw opens your .fig and .pen files and lets an AI agent draw on the same canvas, while you keep editing.',
    download: 'Download for {platform}',
    downloadAny: 'Download Pairdraw',
    github: 'View on GitHub',
    finePrint: 'Free for macOS, Windows, and Linux. Bring your own model or coding agent.',
    prompt: 'Write the hero headline: “Design next to your agent.” Keep it on two lines.',
    status: {
      reading: '{agent} is reading the page',
      adding: '{agent} is adding H1',
      writing: '{agent} is writing H1'
    },
    comment: 'Keep the headline on two lines.',
    reply: 'Set it to 890 wide, so it breaks after “to”.',
    now: 'now',
    measure: 'W 890 × H 280',
    layers: 'Layers',
    layer: {
      frame: { name: 'Hero frame', detail: 'Frame, 1200 × 980' },
      heading: {
        name: 'H1',
        adding: '{agent} is adding it',
        writing: '{agent} is writing it',
        detail: '{agent} is resizing it'
      },
      comment: { name: 'Comment', detail: '{human}, 1 reply' },
      lead: { name: 'Lead', detail: 'Text, 24 px' }
    },
    pause: 'Pause the animation',
    play: 'Play the animation'
  },
  how: {
    title: 'From one sentence to layers you can edit.',
    lede: 'The agent reaches the canvas through Pairdraw’s MCP server and edits the file you have open. Nothing is exported, pasted, or rebuilt.',
    steps: [
      {
        title: 'Ask in chat',
        detail:
          'Describe the screen in the chat, on Home, or in the prompt under the canvas. Use your own API key or a coding agent already on your computer.'
      },
      {
        title: 'Watch it draw',
        detail:
          'Layers trace in one after another while the frame being worked on shimmers. A notice counts what changed once the agent stops.'
      },
      {
        title: 'Edit the result',
        detail:
          'What the agent drew is ordinary layers in your file. Select them, change them, or ask for another pass. Each turn can be undone.'
      }
    ],
    frames: ['1  Ask in chat', '2  Watch it draw', '3  Edit the result'],
    request: 'Add a Goals screen with a savings ring and three goals.',
    reading: 'Reading Budget app.fig, page 1',
    placeholder: 'Ask for changes to Goals',
    send: 'Send',
    card: {
      title: 'Goals',
      amount: '$2,400',
      saved: 'of $3,500 saved',
      goals: [
        { title: 'New laptop', detail: '$900 / $1,400' },
        { title: 'Bali trip', detail: '$1,100 / $1,500' },
        { title: 'Emergency', detail: '$400 / $600' }
      ]
    },
    progress: '{count} of {total} layers',
    props: { title: 'Savings ring', ring: 'Ring', size: 'Size' },
    toast: '{count} layers added',
    undo: 'Undo'
  },
  features: {
    title: 'A complete editor, with every tool open to the agent.',
    lede: 'What you can do by hand, the agent can call. You both work on the same layers, in the same file.',
    frame: 'Features, click a layer to switch',
    list: 'Layers',
    tabs: {
      ai: {
        label: 'AI builds designs',
        title: 'AI builds designs',
        detail:
          'Describe what you want in the chat, on Home, or in the prompt under the canvas. {count} tools create and change the layers.'
      },
      browser: {
        label: 'Built-in browser',
        title: 'Built-in browser',
        detail:
          'Open a page in its own window, import the page or one element as layers, and let the chat read and click it with your approval.'
      },
      controls: {
        label: 'Working controls',
        title: 'Working controls',
        detail:
          'Give a component a Reka UI behaviour such as a switch, slider, or tabs, and try it live with real inputs and keyboard.'
      },
      prototypes: {
        label: 'Prototypes',
        title: 'Prototypes',
        detail:
          'Link frames with click or after-delay interactions, then play them on the canvas with instant or dissolve transitions.'
      },
      layout: {
        label: 'Auto layout and CSS Grid',
        title: 'Auto layout and CSS Grid',
        detail:
          'Flex and grid layout with padding, gap, alignment, and tracks that resize as the content changes.'
      }
    },
    ai: {
      prompt: 'Design a settings screen with notification toggles and a sign-out button.',
      settings: 'Settings',
      alerts: 'Budget alerts',
      summary: 'Weekly summary',
      signIn: 'New sign-in',
      signOut: 'Sign out'
    },
    browser: {
      url: 'https://example.com/pricing',
      import: 'Import as layers',
      imported: 'Imported as layers'
    },
    controls: {
      period: 'Billing period',
      monthly: 'Monthly',
      yearly: 'Yearly',
      limit: 'Budget limit',
      roundUp: 'Round up',
      notify: 'Notify me'
    },
    prototypes: {
      overview: 'Overview',
      budgets: 'Budgets',
      action: 'See budgets',
      back: 'Back'
    },
    layout: {
      alignment: 'Alignment',
      vertical: ['Top', 'Middle', 'Bottom'],
      horizontal: ['left', 'center', 'right']
    }
  },
  agents: {
    title: 'Bring the agent you already use.',
    lede: 'It runs on your own subscription and reaches the canvas through the editor’s MCP server. Connect installs the adapter and signs the agent in, step by step.',
    frame: 'Monthly report, 5 agents on the canvas',
    report: 'Monthly report',
    month: 'Nov',
    server: 'Pairdraw MCP server',
    connect: { before: 'In the browser, run', after: 'and open the link it prints.' }
  },
  scripting: {
    title: 'Script every part of it.',
    lede: 'The document the agent edits is open to your scripts too. Every command supports --json.',
    items: [
      {
        title: 'CLI',
        detail:
          'Inspect, query, export, convert, and lint .fig and .pen files without opening the editor.'
      },
      {
        title: 'MCP server',
        detail:
          'Connect Claude Code, Cursor, or any MCP client to the running app or to files on disk.'
      },
      {
        title: 'Vue SDK',
        detail: 'Headless primitives and composables for building an editor of your own.'
      }
    ],
    terminal: 'Terminal'
  },
  privacy: {
    frame: 'Privacy',
    title: 'Pairdraw sends no usage data.',
    lede: 'No daily ping, analytics, or usage statistics. The privacy page lists what the app connects to and when.',
    link: 'Read the privacy page',
    items: [
      {
        title: 'Local first',
        detail: 'Documents stay on your computer unless you put them on a server.'
      },
      {
        title: 'Your keys',
        detail: 'Bring your own key, or let the chat use a coding agent you already run.'
      },
      {
        title: 'Cloud you run',
        detail: 'To edit together, keep the document on a Pairdraw Cloud server your team runs.'
      }
    ]
  },
  faq: {
    title: 'Questions',
    lede: 'Anything else is in the {docs}, or open an issue on {github}.',
    docs: 'docs',
    github: 'GitHub',
    items: [
      {
        question: 'Is Pairdraw free?',
        answer:
          'Yes. Pairdraw is MIT licensed. Pairdraw Cloud, the optional server, is licensed under Apache 2.0.'
      },
      {
        question: 'Which platforms can I use?',
        answer:
          'macOS 13 or later, Windows 10 or later, and Linux with WebKitGTK 2.40 or later. The web app runs from a checkout of the repository.'
      },
      {
        question: 'Do I need an API key?',
        answer:
          'No. Use your own key for the major providers, or let the chat use a coding agent already on your computer.'
      },
      {
        question: 'Can it open my Figma files?',
        answer:
          'Pairdraw reads and writes native .fig files, opens supported .pen documents, and copies and pastes layers between apps.'
      },
      {
        question: 'What does the app send home?',
        answer:
          'Nothing about how you use it: no daily ping, analytics, or usage statistics. The privacy page lists every connection.'
      }
    ]
  },
  closing: {
    frame: 'Download',
    title: 'Your files. Your agent. One canvas.',
    you: 'You',
    platforms: {
      mac: 'Apple Silicon and Intel',
      windows: 'Windows 10 or later',
      linux: 'WebKitGTK 2.40 or later'
    },
    updates: 'Installed copies update themselves from the app.'
  },
  overlay: {
    title: 'Download Pairdraw',
    version: 'Version {version}. Free and MIT licensed.',
    close: 'Close',
    platforms: {
      mac: 'Apple Silicon and Intel, macOS 13 or later',
      windows: 'x64 and ARM64, Windows 10 or later',
      linux: 'x64 and ARM64, WebKitGTK 2.40+'
    },
    note: 'Installed copies update themselves from the app. The build is not signed yet, so open it the first time with right-click, then Open.',
    allFiles: 'Every file, with checksums',
    unavailable:
      'The list of downloads could not be loaded. Every file is on the releases page on GitHub.'
  },
  footer: {
    tagline: 'An open-source design editor where you and an AI agent draw on the same canvas.',
    product: 'Product',
    roadmap: 'Roadmap',
    changelog: 'Changelog',
    cloud: 'Pairdraw Cloud',
    docs: 'Docs',
    gettingStarted: 'Getting started',
    cli: 'CLI reference',
    mcp: 'MCP server',
    sdk: 'Vue SDK',
    community: 'Community',
    issues: 'Issues',
    security: 'Report a security problem',
    legal: 'Legal',
    mit: 'MIT license',
    apache: 'Apache 2.0 for Cloud',
    privacy: 'Privacy',
    license: 'Pairdraw is MIT licensed. Pairdraw Cloud is licensed under Apache 2.0.',
    language: 'Language'
  },
  loading: 'Loading editor',
  clipboard: {
    copy: 'Copy',
    copied: 'Copied'
  },
  stage: {
    activate: 'Try it live'
  },
  download: {
    title: 'Download Pairdraw',
    lede: 'The desktop app, free and open source, with nothing to sign up for. Platforms without a release build yet build from source.',
    version: 'Version {version}, released {date}',
    forPlatform: 'Download for {platform}',
    moreFiles: 'More downloads for {platform}',
    releaseNotes: 'Release notes',
    yourSystem: 'Your system',
    arch: {
      appleSilicon: 'Apple Silicon',
      intel: 'Intel',
      x64: 'x64',
      arm: 'ARM'
    },
    formats: {
      dmg: 'Disk image',
      zip: 'App in a zip archive',
      exe: 'Installer',
      msi: 'For managed installs',
      appimage: 'Runs on most distributions',
      deb: 'Debian, Ubuntu',
      rpm: 'Fedora, openSUSE',
      'tar.gz': 'Runs from any folder, no install'
    },
    requirements: 'System requirements',
    allTitle: 'All downloads',
    checksums: 'SHA-256 checksums',
    onGitHub: 'Release on GitHub',
    unavailable:
      'The list of downloads could not be loaded. Every file is on the releases page on GitHub.',
    others: {
      title: 'Other ways to get it',
      cli: {
        title: 'Command line',
        detail: 'Inspect, export, lint, and script .fig files without opening the app.'
      },
      source: {
        title: 'From source',
        detail: 'Build the app yourself with Bun and Rust.',
        action: 'Build instructions'
      }
    },
    beta: {
      badge: 'Beta',
      title: 'Try what’s next',
      lede: 'Betas bring the next version’s features early, before they reach everyone.',
      caveats: [
        'An app on the stable release does not update to a beta; install the beta to try it.',
        'On Linux, remove a beta installed with .deb or .rpm before installing the final release.',
        'The CLI and SDK betas are on npm under the next tag.'
      ],
      notes: 'What’s new'
    }
  }
}
