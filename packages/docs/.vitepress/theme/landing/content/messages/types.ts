import type { FileFormat, Platform } from '#docs/theme/landing/download/releases'

import type { FeatureTab } from '../features'

export interface TitledDetail {
  title: string
  detail: string
}

/** A layer row in the hero's layers strip: its name, and what is happening to it. */
interface LayerRowMessages {
  name: string
  detail: string
}

/**
 * Everything the landing page says. English (`en.ts`) is the source; every other catalog is
 * typed against this interface, so a missing or extra string fails type-checking. `{agent}`
 * and `{human}` are replaced with the names of the people on the canvas, which stay the same
 * in every language.
 */
export interface LandingMessages {
  /** The page's own toolbar, which stands in for the docs navigation on the landing. */
  nav: {
    /** Accessible name of the toolbar's landmark. */
    label: string
    /** Accessible name of the logo, which links to the top of the page. */
    home: string
    howItWorks: string
    features: string
    agents: string
    scripting: string
    faq: string
    docs: string
    github: string
    download: string
  }
  hero: {
    /** The frame's name, shown above it as on the canvas. */
    frame: string
    kicker: string
    title: string
    lede: string
    /** The main button for the visitor's system; `{platform}` is replaced. */
    download: string
    /** The main button when the browser does not say which system it runs on. */
    downloadAny: string
    github: string
    finePrint: string
    comment: string
    reply: string
    /** When the comment was written. */
    now: string
    /** The size label under the headline, in the frame's units. */
    measure: string
    /** Accessible name of the layers strip under the hero. */
    layers: string
    layer: {
      frame: LayerRowMessages
      heading: LayerRowMessages
      comment: LayerRowMessages
      lead: LayerRowMessages
    }
    /** The button that stops and restarts the scene. */
    pause: string
    play: string
  }
  how: {
    title: string
    lede: string
    steps: [TitledDetail, TitledDetail, TitledDetail]
    /** Each step's frame name, above it as on the canvas. */
    frames: [string, string, string]
    request: string
    reading: string
    placeholder: string
    /** Accessible name of the composer's send button. */
    send: string
    card: {
      title: string
      amount: string
      saved: string
      goals: [TitledDetail, TitledDetail, TitledDetail]
    }
    /** `{count}` and `{total}` are replaced. */
    progress: string
    props: { title: string; ring: string; size: string }
    /** `{count}` is replaced. */
    toast: string
    undo: string
  }
  features: {
    title: string
    lede: string
    frame: string
    /** The tab list's heading, as the layers panel names itself. */
    list: string
    /** In the AI tab's detail, `{count}` is replaced with the number of tools the MCP server exposes. */
    tabs: Record<FeatureTab, TitledDetail & { label: string }>
    ai: {
      prompt: string
      settings: string
      alerts: string
      summary: string
      signIn: string
      signOut: string
    }
    browser: { url: string; import: string; imported: string }
    controls: {
      period: string
      monthly: string
      yearly: string
      limit: string
      roundUp: string
      notify: string
    }
    prototypes: { overview: string; budgets: string; action: string; back: string }
    /** The alignment grid's cells are named "{vertical}, {horizontal}", as the app names them. */
    layout: {
      alignment: string
      vertical: [string, string, string]
      horizontal: [string, string, string]
    }
  }
  agents: {
    title: string
    lede: string
    frame: string
    report: string
    month: string
    server: string
    /** Around the command that connects an agent. */
    connect: { before: string; after: string }
  }
  scripting: {
    title: string
    lede: string
    items: [TitledDetail, TitledDetail, TitledDetail]
    /** Accessible name of the terminal. */
    terminal: string
  }
  privacy: {
    frame: string
    title: string
    lede: string
    link: string
    items: [TitledDetail, TitledDetail, TitledDetail]
  }
  faq: {
    title: string
    /** `{docs}` and `{github}` are replaced with links named by `docs` and `github`. */
    lede: string
    docs: string
    github: string
    items: { question: string; answer: string }[]
  }
  closing: {
    frame: string
    title: string
    you: string
    platforms: Record<Platform, string>
    updates: string
  }
  /** The download dialog the page's download buttons open. */
  overlay: {
    title: string
    /** `{version}` is replaced. */
    version: string
    close: string
    platforms: Record<Platform, string>
    note: string
    /** Links to the download page, which explains every file. */
    allFiles: string
    /** Shown when the site was built without the release list. */
    unavailable: string
  }
  footer: {
    tagline: string
    product: string
    roadmap: string
    changelog: string
    cloud: string
    docs: string
    gettingStarted: string
    cli: string
    mcp: string
    sdk: string
    community: string
    issues: string
    security: string
    legal: string
    mit: string
    apache: string
    privacy: string
    license: string
    language: string
  }
  /** Accessible label of the placeholder shown before the editor code arrives. */
  loading: string
  /** A copy button's label, and what it says once it copied. */
  clipboard: {
    copy: string
    copied: string
  }
  /** Strings shown on the download page's live stage. */
  stage: {
    /** Starts a stage from its still on a touch screen, where stages wait to be asked. */
    activate: string
  }
  /** The download page, which shares the landing's catalog. */
  download: {
    title: string
    lede: string
    /** `{version}` and `{date}` are replaced. */
    version: string
    /** The main button for the visitor's system; `{platform}` is replaced. */
    forPlatform: string
    /** Opens the menu of every installer for the platform; `{platform}` is replaced. */
    moreFiles: string
    releaseNotes: string
    /** Marks the visitor's platform in the list of downloads. */
    yourSystem: string
    arch: Record<'appleSilicon' | 'intel' | 'x64' | 'arm', string>
    /** What each kind of file is for. */
    formats: Record<FileFormat, string>
    requirements: string
    allTitle: string
    checksums: string
    onGitHub: string
    /** Shown when the site was built without the release list. */
    unavailable: string
    others: {
      title: string
      cli: TitledDetail
      source: TitledDetail & { action: string }
    }
    beta: {
      badge: string
      title: string
      lede: string
      /** What to know before installing a beta. */
      caveats: string[]
      notes: string
    }
  }
}
