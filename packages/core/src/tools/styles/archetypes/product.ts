import type { StyleArchetype } from '#core/tools/styles/types'

/** Directions for software and services: interfaces people work in and trust. */
export const PRODUCT_ARCHETYPES: readonly StyleArchetype[] = [
  {
    id: 'soft-minimal',
    name: 'Soft Minimal',
    summary:
      'Quiet SaaS polish: neutral greys, one indigo accent, soft shadows, and rounded cards.',
    tags: ['minimal', 'clean', 'saas', 'modern', 'soft', 'rounded', 'neutral', 'startup'],
    bestFor: ['SaaS products', 'landing pages', 'onboarding', 'settings screens', 'mobile apps'],
    appearance: 'light',
    fonts: {
      heading: { family: 'Plus Jakarta Sans', style: 'SemiBold' },
      body: { family: 'Inter', style: 'Regular' }
    },
    typeScale: [12, 14, 16, 18, 24, 36, 56],
    palette: {
      background: '#FFFFFF',
      surface: '#F7F7F8',
      text: '#18181B',
      mutedText: '#6B6B76',
      border: '#E8E8EC',
      accent: '#4F46E5',
      onAccent: '#FFFFFF',
      highlight: '#EEF2FF'
    },
    radius: { small: 8, medium: 12, large: 20 },
    spacing: { unit: 8, section: 96 },
    strokeWeight: 1,
    elevation: {
      type: 'DROP_SHADOW',
      color: '#18181B14',
      offset_x: 0,
      offset_y: 4,
      radius: 16,
      spread: 0
    }
  },
  {
    id: 'enterprise-trust',
    name: 'Enterprise Trust',
    summary:
      'Dependable and dense: a steady blue, crisp grey structure, and a plain humanist sans.',
    tags: ['corporate', 'enterprise', 'trust', 'blue', 'professional', 'b2b', 'serious'],
    bestFor: ['B2B products', 'banking', 'insurance', 'healthcare portals', 'admin consoles'],
    appearance: 'light',
    fonts: {
      heading: { family: 'IBM Plex Sans', style: 'SemiBold' },
      body: { family: 'IBM Plex Sans', style: 'Regular' },
      mono: { family: 'IBM Plex Mono', style: 'Regular' }
    },
    typeScale: [12, 14, 16, 18, 22, 30, 44],
    palette: {
      background: '#FFFFFF',
      surface: '#F4F6F9',
      text: '#0F1B2D',
      mutedText: '#4B5A6E',
      border: '#D5DCE5',
      accent: '#0B5FFF',
      onAccent: '#FFFFFF',
      highlight: '#E6F0FF'
    },
    radius: { small: 4, medium: 6, large: 10 },
    spacing: { unit: 8, section: 80 },
    strokeWeight: 1,
    elevation: {
      type: 'DROP_SHADOW',
      color: '#0F1B2D1F',
      offset_x: 0,
      offset_y: 1,
      radius: 3,
      spread: 0
    }
  },
  {
    id: 'analytics-console',
    name: 'Analytics Console',
    summary:
      'A dark, data-dense workspace: compact type, tabular numbers, hairline panels, blue signals.',
    tags: ['dashboard', 'dark', 'data', 'analytics', 'developer', 'dense', 'technical', 'charts'],
    bestFor: ['dashboards', 'monitoring', 'developer tools', 'admin panels', 'trading views'],
    appearance: 'dark',
    fonts: {
      heading: { family: 'Inter', style: 'SemiBold' },
      body: { family: 'Inter', style: 'Regular' },
      mono: { family: 'JetBrains Mono', style: 'Regular' }
    },
    typeScale: [11, 12, 13, 14, 16, 20, 28],
    palette: {
      background: '#0E1117',
      surface: '#161B22',
      text: '#E6EDF3',
      mutedText: '#9AA5B1',
      border: '#2A313C',
      accent: '#58A6FF',
      onAccent: '#0E1117',
      highlight: '#F2CC60'
    },
    radius: { small: 4, medium: 6, large: 10 },
    spacing: { unit: 4, section: 48 },
    strokeWeight: 1,
    elevation: null
  },
  {
    id: 'bento-showcase',
    name: 'Bento Showcase',
    summary:
      'Features in a grid of big rounded tiles of mixed sizes, each with one idea and one visual.',
    tags: ['bento', 'grid', 'tiles', 'product', 'launch', 'modern', 'rounded', 'feature grid'],
    bestFor: ['product launches', 'feature overviews', 'app marketing', 'portfolios', 'keynotes'],
    appearance: 'light',
    fonts: {
      heading: { family: 'Space Grotesk', style: 'SemiBold' },
      body: { family: 'Inter', style: 'Regular' }
    },
    typeScale: [12, 14, 16, 20, 28, 44, 72],
    palette: {
      background: '#F4F4F1',
      surface: '#FFFFFF',
      text: '#111110',
      mutedText: '#5F5F5A',
      border: '#E4E4DE',
      accent: '#FF6A3D',
      onAccent: '#111110',
      highlight: '#D9F99D'
    },
    radius: { small: 12, medium: 24, large: 32 },
    spacing: { unit: 8, section: 120 },
    strokeWeight: 1,
    elevation: {
      type: 'DROP_SHADOW',
      color: '#1111100F',
      offset_x: 0,
      offset_y: 2,
      radius: 8,
      spread: 0
    }
  },
  {
    id: 'nordic-light',
    name: 'Nordic Light',
    summary: 'Pale, airy, and practical: muted pine green, birch whites, and plenty of calm space.',
    tags: ['scandinavian', 'nordic', 'calm', 'light', 'natural', 'muted', 'airy', 'green'],
    bestFor: ['interior and furniture', 'sustainability', 'travel', 'productivity apps', 'hotels'],
    appearance: 'light',
    fonts: {
      heading: { family: 'DM Sans', style: 'SemiBold' },
      body: { family: 'DM Sans', style: 'Regular' }
    },
    typeScale: [12, 14, 16, 19, 26, 38, 60],
    palette: {
      background: '#F7F7F5',
      surface: '#FFFFFF',
      text: '#22272B',
      mutedText: '#5E676E',
      border: '#E2E4E1',
      accent: '#2F5D62',
      onAccent: '#FFFFFF',
      highlight: '#DCE8E0'
    },
    radius: { small: 6, medium: 10, large: 16 },
    spacing: { unit: 8, section: 104 },
    strokeWeight: 1,
    elevation: {
      type: 'DROP_SHADOW',
      color: '#22272B12',
      offset_x: 0,
      offset_y: 8,
      radius: 24,
      spread: 0
    }
  },
  {
    id: 'wellness-calm',
    name: 'Wellness Calm',
    summary:
      'Gentle and reassuring: sage and sand tones, a soft serif, round shapes, and slow rhythm.',
    tags: ['wellness', 'calm', 'health', 'organic', 'soft', 'sage', 'mindful', 'gentle'],
    bestFor: ['health and therapy', 'meditation apps', 'spas', 'skincare', 'care services'],
    appearance: 'light',
    fonts: {
      heading: { family: 'Fraunces', style: 'SemiBold' },
      body: { family: 'Nunito Sans', style: 'Regular' }
    },
    typeScale: [13, 15, 17, 20, 28, 40, 60],
    palette: {
      background: '#F3F1EC',
      surface: '#FBFAF7',
      text: '#263330',
      mutedText: '#56645F',
      border: '#DDE3DE',
      accent: '#4A735F',
      onAccent: '#FFFFFF',
      highlight: '#E9D8C4'
    },
    radius: { small: 12, medium: 20, large: 28 },
    spacing: { unit: 8, section: 112 },
    strokeWeight: 1,
    elevation: null
  },
  {
    id: 'fintech-night',
    name: 'Fintech Night',
    summary:
      'Confident money app at night: deep navy, a single acid-lime signal, and big clear numbers.',
    tags: ['fintech', 'dark', 'finance', 'crypto', 'navy', 'lime', 'bold numbers', 'mobile'],
    bestFor: ['banking apps', 'payments', 'crypto', 'budgeting', 'investment dashboards'],
    appearance: 'dark',
    fonts: {
      heading: { family: 'Sora', style: 'SemiBold' },
      body: { family: 'Inter', style: 'Regular' },
      mono: { family: 'JetBrains Mono', style: 'Regular' }
    },
    typeScale: [12, 14, 16, 18, 24, 36, 56],
    palette: {
      background: '#0B1220',
      surface: '#121A2B',
      text: '#EEF2F8',
      mutedText: '#9AA6BA',
      border: '#233047',
      accent: '#C6F432',
      onAccent: '#0B1220',
      highlight: '#7DD3FC'
    },
    radius: { small: 10, medium: 16, large: 24 },
    spacing: { unit: 8, section: 96 },
    strokeWeight: 1,
    elevation: {
      type: 'DROP_SHADOW',
      color: '#00000066',
      offset_x: 0,
      offset_y: 12,
      radius: 32,
      spread: 0
    }
  }
]
