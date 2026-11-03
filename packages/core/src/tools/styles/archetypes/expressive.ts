import type { StyleArchetype } from '#core/tools/styles/types'

/** Directions with a strong character: loud, playful, nocturnal, crafted, or retro. */
export const EXPRESSIVE_ARCHETYPES: readonly StyleArchetype[] = [
  {
    id: 'neo-brutalist',
    name: 'Neo-Brutalist',
    summary:
      'Thick black outlines, hard offset shadows, flat primaries, and deliberately raw layout.',
    tags: ['brutalist', 'neo-brutalism', 'bold', 'raw', 'outline', 'retro web', 'quirky', 'loud'],
    bestFor: ['indie products', 'creative tools', 'newsletters', 'hackathons', 'Gen Z brands'],
    appearance: 'light',
    fonts: {
      heading: { family: 'Space Grotesk', style: 'Bold' },
      body: { family: 'Space Grotesk', style: 'Regular' },
      mono: { family: 'Space Mono', style: 'Regular' }
    },
    typeScale: [13, 15, 18, 22, 32, 52, 84],
    palette: {
      background: '#FFF4E0',
      surface: '#FFFFFF',
      text: '#000000',
      mutedText: '#3D3D3D',
      border: '#000000',
      accent: '#FFD23F',
      onAccent: '#000000',
      highlight: '#FF6B6B'
    },
    radius: { small: 0, medium: 6, large: 10 },
    spacing: { unit: 8, section: 96 },
    strokeWeight: 3,
    elevation: {
      type: 'DROP_SHADOW',
      color: '#000000FF',
      offset_x: 4,
      offset_y: 4,
      radius: 0,
      spread: 0
    }
  },
  {
    id: 'playful-pop',
    name: 'Playful Pop',
    summary:
      'Bubbly and friendly: rounded type, candy colors, chunky outlines, and bouncy stickers.',
    tags: ['playful', 'fun', 'friendly', 'colorful', 'rounded', 'kids', 'cartoon', 'bubbly'],
    bestFor: ['consumer apps', 'education', 'games', 'kids products', 'food delivery'],
    appearance: 'light',
    fonts: {
      heading: { family: 'Fredoka', style: 'SemiBold' },
      body: { family: 'Nunito', style: 'Regular' }
    },
    typeScale: [13, 15, 17, 22, 30, 44, 64],
    palette: {
      background: '#FFF9F0',
      surface: '#FFFFFF',
      text: '#1F1147',
      mutedText: '#5B4F7D',
      border: '#1F1147',
      accent: '#FF4D8D',
      onAccent: '#1F1147',
      highlight: '#FFC93C'
    },
    radius: { small: 12, medium: 20, large: 32 },
    spacing: { unit: 8, section: 96 },
    strokeWeight: 2,
    elevation: {
      type: 'DROP_SHADOW',
      color: '#1F1147FF',
      offset_x: 0,
      offset_y: 4,
      radius: 0,
      spread: 0
    }
  },
  {
    id: 'frosted-aurora',
    name: 'Frosted Aurora',
    summary:
      'Frosted glass panels floating over soft violet and cyan light on a deep night background.',
    tags: ['glass', 'glassmorphism', 'frosted', 'gradient', 'aurora', 'dark', 'futuristic', 'ai'],
    bestFor: ['AI products', 'web3', 'music apps', 'launch pages', 'immersive dashboards'],
    appearance: 'dark',
    fonts: {
      heading: { family: 'Outfit', style: 'SemiBold' },
      body: { family: 'Inter', style: 'Regular' }
    },
    typeScale: [12, 14, 16, 20, 28, 44, 68],
    palette: {
      background: '#0B1020',
      surface: '#161C33',
      text: '#F5F7FF',
      mutedText: '#A3ACC9',
      border: '#2A3256',
      accent: '#6A4CF5',
      onAccent: '#FFFFFF',
      highlight: '#22D3EE'
    },
    radius: { small: 12, medium: 20, large: 28 },
    spacing: { unit: 8, section: 112 },
    strokeWeight: 1,
    elevation: {
      type: 'BACKGROUND_BLUR',
      offset_x: 0,
      offset_y: 0,
      radius: 24,
      spread: 0
    }
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    summary: 'Arcade after dark: near-black purple, glowing magenta and cyan, wide display type.',
    tags: ['neon', 'cyberpunk', 'synthwave', 'dark', 'glow', 'gaming', 'nightlife', 'retro future'],
    bestFor: ['games', 'esports', 'nightlife and events', 'music', 'streaming'],
    appearance: 'dark',
    fonts: {
      heading: { family: 'Unbounded', style: 'SemiBold' },
      body: { family: 'Inter', style: 'Regular' },
      mono: { family: 'JetBrains Mono', style: 'Regular' }
    },
    typeScale: [12, 14, 16, 20, 30, 48, 76],
    palette: {
      background: '#07040F',
      surface: '#120A24',
      text: '#F2EEFF',
      mutedText: '#A99DD1',
      border: '#2D1B57',
      accent: '#FF2BD6',
      onAccent: '#07040F',
      highlight: '#00F0FF'
    },
    radius: { small: 4, medium: 8, large: 12 },
    spacing: { unit: 8, section: 112 },
    strokeWeight: 1,
    elevation: {
      type: 'DROP_SHADOW',
      color: '#FF2BD666',
      offset_x: 0,
      offset_y: 0,
      radius: 24,
      spread: 0
    }
  },
  {
    id: 'risograph-print',
    name: 'Risograph Print',
    summary:
      'Two-ink zine printing: fluorescent pink over deep blue, grain, overlaps, and offset misregistration.',
    tags: ['risograph', 'print', 'zine', 'grain', 'duotone', 'indie', 'art', 'fluorescent'],
    bestFor: ['art events', 'bookshops', 'record labels', 'studios', 'cultural programs'],
    appearance: 'light',
    fonts: {
      heading: { family: 'Bricolage Grotesque', style: 'Bold' },
      body: { family: 'Work Sans', style: 'Regular' }
    },
    typeScale: [13, 15, 18, 24, 36, 56, 88],
    palette: {
      background: '#F7F3EA',
      surface: '#EFE9DC',
      text: '#1D2A6B',
      mutedText: '#4A5490',
      border: '#1D2A6B',
      accent: '#FF48B0',
      onAccent: '#121A55',
      highlight: '#FFE800'
    },
    radius: { small: 0, medium: 4, large: 8 },
    spacing: { unit: 8, section: 96 },
    strokeWeight: 2,
    elevation: null
  },
  {
    id: 'sketchbook',
    name: 'Sketchbook',
    summary:
      'Hand-made and informal: marker headlines, doodled arrows, sticky notes, and wobbly frames.',
    tags: ['hand-drawn', 'sketch', 'doodle', 'informal', 'notebook', 'whiteboard', 'friendly'],
    bestFor: ['workshops', 'education', 'wireframes', 'personal sites', 'community projects'],
    appearance: 'light',
    fonts: {
      heading: { family: 'Caveat', style: 'Bold' },
      body: { family: 'Nunito', style: 'Regular' }
    },
    typeScale: [14, 16, 18, 24, 34, 48, 72],
    palette: {
      background: '#FFFDF7',
      surface: '#FFF6DA',
      text: '#2A2A2A',
      mutedText: '#5D5D5D',
      border: '#2A2A2A',
      accent: '#2F6FEB',
      onAccent: '#FFFFFF',
      highlight: '#FFE45C'
    },
    radius: { small: 4, medium: 10, large: 16 },
    spacing: { unit: 8, section: 88 },
    strokeWeight: 2,
    elevation: {
      type: 'DROP_SHADOW',
      color: '#2A2A2A26',
      offset_x: 2,
      offset_y: 3,
      radius: 0,
      spread: 0
    }
  },
  {
    id: 'terminal',
    name: 'Terminal',
    summary:
      'A command line made into a page: all-monospace type, phosphor green on black, ASCII rules.',
    tags: ['terminal', 'monospace', 'hacker', 'retro computing', 'cli', 'developer', 'green'],
    bestFor: ['developer tools', 'CLIs', 'open source projects', 'security', 'technical blogs'],
    appearance: 'dark',
    fonts: {
      heading: { family: 'JetBrains Mono', style: 'Bold' },
      body: { family: 'JetBrains Mono', style: 'Regular' },
      mono: { family: 'JetBrains Mono', style: 'Regular' }
    },
    typeScale: [12, 13, 14, 16, 20, 28, 40],
    palette: {
      background: '#0A0E0A',
      surface: '#111811',
      text: '#D7F5D3',
      mutedText: '#8BA888',
      border: '#243024',
      accent: '#39FF6A',
      onAccent: '#031B08',
      highlight: '#FFB000'
    },
    radius: { small: 0, medium: 2, large: 4 },
    spacing: { unit: 8, section: 64 },
    strokeWeight: 1,
    elevation: null
  },
  {
    id: 'warm-organic',
    name: 'Warm Organic',
    summary:
      'Earthy and crafted: terracotta and olive on cream, a soft display serif, and natural textures.',
    tags: ['organic', 'earthy', 'warm', 'natural', 'craft', 'terracotta', 'artisan', 'cozy'],
    bestFor: ['restaurants and cafés', 'food brands', 'craft shops', 'farms', 'boutique hotels'],
    appearance: 'light',
    fonts: {
      heading: { family: 'DM Serif Display', style: 'Regular' },
      body: { family: 'Karla', style: 'Regular' }
    },
    typeScale: [13, 15, 17, 21, 30, 44, 68],
    palette: {
      background: '#F6F0E6',
      surface: '#FFFBF5',
      text: '#2B2118',
      mutedText: '#6B5A48',
      border: '#E3D5C1',
      accent: '#A84A24',
      onAccent: '#FFFFFF',
      highlight: '#7A8B5C'
    },
    radius: { small: 8, medium: 16, large: 24 },
    spacing: { unit: 8, section: 104 },
    strokeWeight: 1,
    elevation: {
      type: 'DROP_SHADOW',
      color: '#2B21181A',
      offset_x: 0,
      offset_y: 6,
      radius: 20,
      spread: 0
    }
  }
]
