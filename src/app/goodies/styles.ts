import type { StyleKit } from '@/app/ai/chat/pins/types'

/**
 * A look Goodies offers for the AI chat: a style kit with a name of its own. The notes are written
 * for the agent, in the language its other instructions use, like Home's creation guides.
 */
export interface GoodieStyle {
  id: string
  kit: StyleKit
}

export const GOODIE_STYLES: readonly GoodieStyle[] = [
  {
    id: 'ink-ember',
    kit: {
      name: 'Ink & Ember',
      colors: [
        { name: 'Ink', hex: '#17171CFF' },
        { name: 'Ember', hex: '#FF5B2EFF' },
        { name: 'Paper', hex: '#F7F5F2FF' },
        { name: 'Ash', hex: '#8A8A93FF' }
      ],
      fonts: ['Inter'],
      notes:
        'Confident and quiet. Large areas of Ink or Paper with Ember as the single accent, used once per screen for the main action. Tight headings in a heavy weight, generous spacing, 12px corners, hairline borders instead of shadows.'
    }
  },
  {
    id: 'harbor',
    kit: {
      name: 'Harbor',
      colors: [
        { name: 'Navy', hex: '#0B1F3AFF' },
        { name: 'Sea', hex: '#2F6FEDFF' },
        { name: 'Mist', hex: '#EEF3FBFF' },
        { name: 'Slate', hex: '#5B6B82FF' },
        { name: 'White', hex: '#FFFFFFFF' }
      ],
      fonts: ['DM Sans'],
      notes:
        'Calm product software. White cards on a Mist background, Navy text, Sea for links and primary buttons, Slate for secondary text. 8px corners, soft low shadows on cards, clear tables and forms, nothing decorative.'
    }
  },
  {
    id: 'editorial',
    kit: {
      name: 'Editorial',
      colors: [
        { name: 'Black', hex: '#111111FF' },
        { name: 'Cream', hex: '#FAF6EEFF' },
        { name: 'Signal red', hex: '#C8102EFF' },
        { name: 'Grey', hex: '#6B6B6BFF' }
      ],
      fonts: ['Fraunces', 'Inter'],
      notes:
        'A printed magazine on screen. Very large Fraunces headlines on Cream, Inter for body text in narrow columns, thin black rules between sections, Signal red only for a kicker or one highlighted word. Square corners, no shadows, strong asymmetric grids.'
    }
  },
  {
    id: 'terminal',
    kit: {
      name: 'Terminal',
      colors: [
        { name: 'Background', hex: '#0D1117FF' },
        { name: 'Surface', hex: '#161B22FF' },
        { name: 'Green', hex: '#3FB950FF' },
        { name: 'Text', hex: '#E6EDF3FF' },
        { name: 'Muted', hex: '#8B949EFF' }
      ],
      fonts: ['JetBrains Mono', 'Inter'],
      notes:
        'A developer tool in the dark. Background and Surface for panels, 1px borders a little lighter than the surface, JetBrains Mono for labels, figures and code, Inter for prose. Green marks success and the primary action. 6px corners, dense layouts, no gradients.'
    }
  },
  {
    id: 'orchard',
    kit: {
      name: 'Orchard',
      colors: [
        { name: 'Leaf', hex: '#2E7D4FFF' },
        { name: 'Peach', hex: '#FFB38AFF' },
        { name: 'Cream', hex: '#FFF8EEFF' },
        { name: 'Bark', hex: '#4A3728FF' }
      ],
      fonts: ['Nunito'],
      notes:
        'Warm and friendly, for a consumer app. Cream backgrounds, Bark text, Leaf for primary buttons and Peach for highlights and illustrations. Rounded 20px corners, pill buttons, large touch targets, soft shapes behind key content.'
    }
  },
  {
    id: 'mono',
    kit: {
      name: 'Mono',
      colors: [
        { name: 'Black', hex: '#000000FF' },
        { name: 'White', hex: '#FFFFFFFF' },
        { name: 'Light grey', hex: '#E5E5E5FF' },
        { name: 'Mid grey', hex: '#737373FF' }
      ],
      fonts: ['Space Grotesk'],
      notes:
        'Strict black and white. No colour at all: hierarchy comes from size, weight and 2px black borders. Square corners, hard offset shadows in solid black where depth is needed, uppercase labels, oversized numerals.'
    }
  }
]
