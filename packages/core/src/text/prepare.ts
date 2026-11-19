import { uniq } from 'es-toolkit'

import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import { faceLoadKey, parseFontStyle } from '@pairdraw/scene-graph/font-style'

import { DEFAULT_FONT_FAMILY } from '#core/constants'
import {
  canDrawPlatformEmoji,
  mayHoldEmoji,
  NOTO_COLOR_EMOJI_FAMILY,
  savedEmojiCharacters
} from '#core/text/emoji'
import { fontGlyphCoverageSync } from '#core/text/font/glyphs'
import { fontManager } from '#core/text/font/manager'
import { collectGraphFontRequirements, collectNodeFontFaces } from '#core/text/requirements/collect'
import { missingGraphFontScripts } from '#core/text/requirements/resolved'
import { fontFaceDemand, fontResolver } from '#core/text/resolver'

import { documentFontStatus, type DocumentFontStatus } from './font/status'

/**
 * The characters of a text its layout falls back to the emoji metrics font for: ones that may be
 * emoji and that none of the faces it draws in, nor the fallbacks after them, has. A face not
 * loaded cannot tell, and leaves the character to it.
 */
function laidOutEmojiCharacters(node: SceneNode): string {
  if (node.type !== 'TEXT' || !mayHoldEmoji(node.text)) return ''
  const faces = [
    ...collectNodeFontFaces(node),
    { family: DEFAULT_FONT_FAMILY, style: 'Regular' },
    ...[...fontManager.getLetterFallbackFamilies(), ...fontManager.getCJKFallbackFamilies()].map(
      (family) => ({ family, style: 'Regular' })
    )
  ]
  let characters = ''
  for (const character of node.text) {
    if (!mayHoldEmoji(character)) continue
    const drawnByText = faces.some(
      ({ family, style }) => fontGlyphCoverageSync(family, style, character) !== 'missing'
    )
    if (!drawnByText) characters += character
  }
  return characters
}

/**
 * A one-shot output cannot wait for a face no source has. Loading the substitute face and settling
 * those demands is what lets the text draw in it instead of leaving the layer empty.
 */
async function settleUnavailableFonts(
  faces: readonly { family: string; style: string }[],
  characters: string
): Promise<void> {
  const unavailable = faces.filter(({ family, style }) => !fontManager.isStyleLoaded(family, style))
  if (unavailable.length === 0) return
  await fontManager.loadFont(DEFAULT_FONT_FAMILY, 'Regular', characters)
  for (const { family, style } of unavailable) {
    fontResolver.exhaust(fontFaceDemand(family, style, characters))
  }
}

export async function prepareGraphFonts(
  graph: SceneGraph,
  nodeIds: readonly string[],
  /** Characters a writer draws besides the text's own, which the fonts must map too. */
  extraCharacters = '',
  /** An output that draws once and cannot wait for a face to arrive; see `settleUnavailableFonts`. */
  { settleUnavailable = false }: { settleUnavailable?: boolean } = {}
): Promise<DocumentFontStatus> {
  const collected = collectGraphFontRequirements(graph, nodeIds)
  const requirements = extraCharacters
    ? {
        ...collected,
        characters: uniq(Array.from(collected.characters + extraCharacters)).join('')
      }
    : collected
  const faces = requirements.nodes.flatMap(collectNodeFontFaces)
  await Promise.all(
    faces.map(({ family, style }) => fontManager.loadFont(family, style, requirements.characters))
  )
  // A family found nowhere draws in the default family, and CanvasKit slants the default family's
  // upright face for an italic it lacks. Its face of the same weight and slant is loaded instead,
  // so the canvas draws a real italic and the saved outlines read that face.
  const defaultStyles = uniq(
    faces.flatMap(({ family, style }) => {
      const { weight, italic } = parseFontStyle(style)
      return family === DEFAULT_FONT_FAMILY || fontManager.isLoaded(family)
        ? []
        : [faceLoadKey(weight, italic)]
    })
  )
  await Promise.all(
    defaultStyles.map((style) =>
      fontManager.loadFont(DEFAULT_FONT_FAMILY, style, requirements.characters)
    )
  )
  await fontManager.ensureFallbackPack(
    missingGraphFontScripts(requirements),
    requirements.characters
  )
  if (settleUnavailable) await settleUnavailableFonts(faces, requirements.characters)
  // A face the document asks for and no source has cannot draw; the text is drawn in the default
  // face and the script fallbacks after it, so that face has to be loaded to keep the text
  // visible instead of leaving the layer blank.
  const unavailable = faces.filter(({ family, style }) => !fontManager.isStyleLoaded(family, style))
  if (unavailable.length > 0) {
    await fontManager.loadFont(DEFAULT_FONT_FAMILY, 'Regular', requirements.characters)
    // Nothing else will load these faces in this export, so the render must not wait for them:
    // settling them here is what turns the text into the substituted face it is drawn in.
    for (const { family, style } of unavailable) {
      fontResolver.exhaust(fontFaceDemand(family, style, requirements.characters))
    }
  }
  // Without a platform that draws emoji, emoji are drawn with Noto, loaded for just these: the
  // saved ones, and the ones the layout leaves to the emoji metrics font.
  const emoji =
    requirements.nodes.map(savedEmojiCharacters).join('') +
    requirements.nodes.map(laidOutEmojiCharacters).join('')
  if (emoji && !canDrawPlatformEmoji())
    await fontManager.loadRemoteFont(NOTO_COLOR_EMOJI_FAMILY, 'Regular', emoji)
  return documentFontStatus(graph, nodeIds)
}
