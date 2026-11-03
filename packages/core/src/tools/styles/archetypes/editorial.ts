import type { StyleArchetype } from '#core/tools/styles/types'

/** Directions led by type and the grid: print, publishing, and gallery traditions. */
export const EDITORIAL_ARCHETYPES: readonly StyleArchetype[] = [
  {
    id: 'swiss-grid',
    name: 'Swiss Grid',
    summary:
      'Strict modular grid, flush-left grotesque type, white space, and a single signal red.',
    tags: ['swiss', 'international', 'grid', 'modernist', 'typographic', 'minimal', 'red'],
    bestFor: ['portfolios', 'agencies', 'conferences', 'architecture', 'museums'],
    appearance: 'light',
    fonts: {
      heading: { family: 'Archivo', style: 'SemiBold' },
      body: { family: 'Inter', style: 'Regular' }
    },
    typeScale: [12, 14, 16, 20, 32, 56, 96],
    palette: {
      background: '#FFFFFF',
      surface: '#F2F2F2',
      text: '#111111',
      mutedText: '#5C5C5C',
      border: '#D9D9D9',
      accent: '#D7000F',
      onAccent: '#FFFFFF',
      highlight: '#111111'
    },
    radius: { small: 0, medium: 0, large: 0 },
    spacing: { unit: 8, section: 96 },
    strokeWeight: 1,
    elevation: null
  },
  {
    id: 'editorial-serif',
    name: 'Editorial Serif',
    summary:
      'A magazine feature: high-contrast serif headlines, generous margins, and warm paper tones.',
    tags: ['editorial', 'magazine', 'serif', 'journalism', 'elegant', 'long-form', 'warm'],
    bestFor: ['blogs', 'publications', 'newsletters', 'case studies', 'book and culture sites'],
    appearance: 'light',
    fonts: {
      heading: { family: 'Playfair Display', style: 'Bold' },
      body: { family: 'Source Serif 4', style: 'Regular' }
    },
    typeScale: [13, 15, 18, 22, 30, 44, 68],
    palette: {
      background: '#FBF8F3',
      surface: '#F2ECE2',
      text: '#1C1917',
      mutedText: '#57534E',
      border: '#E2D9CB',
      accent: '#9F1239',
      onAccent: '#FFFFFF',
      highlight: '#F5D0A9'
    },
    radius: { small: 2, medium: 4, large: 6 },
    spacing: { unit: 8, section: 112 },
    strokeWeight: 1,
    elevation: null
  },
  {
    id: 'scholarly',
    name: 'Scholarly',
    summary:
      'Calm, readable reference pages: a serif text face, narrow measure, footnote-like detail.',
    tags: ['academic', 'documentation', 'research', 'serif', 'reading', 'quiet', 'reference'],
    bestFor: ['documentation', 'research papers', 'knowledge bases', 'reports', 'universities'],
    appearance: 'light',
    fonts: {
      heading: { family: 'Source Serif 4', style: 'SemiBold' },
      body: { family: 'Source Serif 4', style: 'Regular' },
      mono: { family: 'Source Code Pro', style: 'Regular' }
    },
    typeScale: [13, 15, 17, 20, 24, 32, 44],
    palette: {
      background: '#FFFFFF',
      surface: '#F6F5F1',
      text: '#1A1A1A',
      mutedText: '#555555',
      border: '#DDDAD2',
      accent: '#1F4E8C',
      onAccent: '#FFFFFF',
      highlight: '#FFF3C4'
    },
    radius: { small: 2, medium: 4, large: 6 },
    spacing: { unit: 8, section: 72 },
    strokeWeight: 1,
    elevation: null
  },
  {
    id: 'poster-bold',
    name: 'Bold Poster',
    summary:
      'Gig-poster energy: towering condensed headlines, hard color blocks, and edge-to-edge type.',
    tags: ['poster', 'bold', 'condensed', 'loud', 'campaign', 'sports', 'event', 'high contrast'],
    bestFor: ['events', 'campaigns', 'launch pages', 'sports', 'music', 'festivals'],
    appearance: 'light',
    fonts: {
      heading: { family: 'Anton', style: 'Regular' },
      body: { family: 'Inter', style: 'Medium' }
    },
    typeScale: [14, 16, 20, 32, 64, 120, 200],
    palette: {
      background: '#FFFFFF',
      surface: '#F0F0F0',
      text: '#0A0A0A',
      mutedText: '#4D4D4D',
      border: '#0A0A0A',
      accent: '#FF3B1F',
      onAccent: '#0A0A0A',
      highlight: '#1F3BFF'
    },
    radius: { small: 0, medium: 0, large: 0 },
    spacing: { unit: 8, section: 80 },
    strokeWeight: 2,
    elevation: null
  },
  {
    id: 'luxury-noir',
    name: 'Luxury Noir',
    summary:
      'Near-black and ivory with brushed gold, a refined display serif, and slow, spacious pacing.',
    tags: ['luxury', 'premium', 'fashion', 'dark', 'gold', 'serif', 'elegant', 'minimal'],
    bestFor: ['fashion', 'jewelry', 'hotels', 'fine dining', 'perfume', 'high-end retail'],
    appearance: 'dark',
    fonts: {
      heading: { family: 'Cormorant Garamond', style: 'SemiBold' },
      body: { family: 'Jost', style: 'Regular' }
    },
    typeScale: [12, 14, 16, 22, 34, 56, 88],
    palette: {
      background: '#0C0B09',
      surface: '#17150F',
      text: '#F4EFE6',
      mutedText: '#B0A797',
      border: '#2E2A22',
      accent: '#C9A45C',
      onAccent: '#0C0B09',
      highlight: '#F4EFE6'
    },
    radius: { small: 0, medium: 0, large: 2 },
    spacing: { unit: 8, section: 144 },
    strokeWeight: 1,
    elevation: null
  },
  {
    id: 'architectural-mono',
    name: 'Architectural Mono',
    summary:
      'Black on off-white, hairline rules, technical labels, and wide margins like a drawing set.',
    tags: ['architecture', 'monochrome', 'technical', 'hairline', 'minimal', 'gallery', 'mono'],
    bestFor: ['architecture studios', 'galleries', 'furniture', 'product design', 'photography'],
    appearance: 'light',
    fonts: {
      heading: { family: 'Instrument Sans', style: 'SemiBold' },
      body: { family: 'Instrument Sans', style: 'Regular' },
      mono: { family: 'DM Mono', style: 'Regular' }
    },
    typeScale: [11, 13, 15, 18, 28, 44, 72],
    palette: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      text: '#141414',
      mutedText: '#666666',
      border: '#CFCFCF',
      accent: '#141414',
      onAccent: '#FAFAFA',
      highlight: '#E6E1D6'
    },
    radius: { small: 0, medium: 0, large: 0 },
    spacing: { unit: 8, section: 160 },
    strokeWeight: 1,
    elevation: null
  }
]
