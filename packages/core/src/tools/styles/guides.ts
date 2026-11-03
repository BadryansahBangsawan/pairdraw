import analyticsConsole from './guides/analytics-console.md?raw'
import architecturalMono from './guides/architectural-mono.md?raw'
import bentoShowcase from './guides/bento-showcase.md?raw'
import editorialSerif from './guides/editorial-serif.md?raw'
import enterpriseTrust from './guides/enterprise-trust.md?raw'
import fintechNight from './guides/fintech-night.md?raw'
import frostedAurora from './guides/frosted-aurora.md?raw'
import luxuryNoir from './guides/luxury-noir.md?raw'
import neoBrutalist from './guides/neo-brutalist.md?raw'
import neonNight from './guides/neon-night.md?raw'
import nordicLight from './guides/nordic-light.md?raw'
import playfulPop from './guides/playful-pop.md?raw'
import posterBold from './guides/poster-bold.md?raw'
import risographPrint from './guides/risograph-print.md?raw'
import scholarly from './guides/scholarly.md?raw'
import sketchbook from './guides/sketchbook.md?raw'
import softMinimal from './guides/soft-minimal.md?raw'
import swissGrid from './guides/swiss-grid.md?raw'
import terminal from './guides/terminal.md?raw'
import warmOrganic from './guides/warm-organic.md?raw'
import wellnessCalm from './guides/wellness-calm.md?raw'
import type { StyleArchetypeId } from './types'

/** Each direction's written guidance: layout, type, color, shape, imagery, components, and what to avoid. */
export const STYLE_GUIDES: Readonly<Record<StyleArchetypeId, string>> = {
  'swiss-grid': swissGrid,
  'editorial-serif': editorialSerif,
  scholarly: scholarly,
  'poster-bold': posterBold,
  'luxury-noir': luxuryNoir,
  'architectural-mono': architecturalMono,
  'soft-minimal': softMinimal,
  'enterprise-trust': enterpriseTrust,
  'analytics-console': analyticsConsole,
  'bento-showcase': bentoShowcase,
  'nordic-light': nordicLight,
  'wellness-calm': wellnessCalm,
  'fintech-night': fintechNight,
  'neo-brutalist': neoBrutalist,
  'playful-pop': playfulPop,
  'frosted-aurora': frostedAurora,
  'neon-night': neonNight,
  'risograph-print': risographPrint,
  sketchbook: sketchbook,
  terminal: terminal,
  'warm-organic': warmOrganic
}
