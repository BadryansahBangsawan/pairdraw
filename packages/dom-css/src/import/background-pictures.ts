import { toUint8Array } from 'js-base64'

import type { Fill, SceneGraph } from '@pairdraw/scene-graph'
import { TRANSPARENT } from '@pairdraw/scene-graph/constants'
import { parseCSSBackgroundImages, splitCSSValue } from '@pairdraw/scene-graph/css'
import { computeImageHash, imageSize } from '@pairdraw/scene-graph/images'
import type { Matrix, Rect, Size, Vector } from '@pairdraw/scene-graph/primitives'

import type { DesignStyleDeclaration } from '../types'
import { colorToFillFromCSS, pickStyle } from './css-values'

const REPEAT_KEYWORDS = new Set(['repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'space', 'round'])
const BOX_KEYWORDS = new Set(['border-box', 'padding-box', 'content-box'])
const ATTACHMENT_KEYWORDS = new Set(['scroll', 'fixed', 'local'])
const GRADIENT_PREFIXES = [
  'linear-gradient(',
  'radial-gradient(',
  'conic-gradient(',
  'repeating-linear-gradient(',
  'repeating-radial-gradient(',
  'repeating-conic-gradient('
]

/** Splits a CSS value list at its top-level commas, keeping functions whole. */
function splitLayers(value: string): string[] {
  const layers: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < value.length; index++) {
    const character = value[index]
    if (character === '(') depth++
    else if (character === ')') depth = Math.max(0, depth - 1)
    else if (character === ',' && depth === 0) {
      layers.push(value.slice(start, index).trim())
      start = index + 1
    }
  }
  const last = value.slice(start).trim()
  if (last) layers.push(last)
  return layers
}

/** The value a property list gives layer `index`, repeating its last entry as CSS does. */
function at(list: readonly string[], index: number): string | undefined {
  return list[Math.min(index, list.length - 1)]
}

/** One CSS background layer as the properties that place its picture. */
export interface BackgroundLayer {
  image: string
  size: string
  position: string
  repeat: string
  origin: string
  clip: string
  /** A gradient parsed from the longhand, which has no image URL. */
  gradient?: Fill
}

/** Splits a value into its `url(...)` and gradient functions and the words around them. */
function splitBackgroundFunctions(value: string): { image: string; rest: string } {
  let image = ''
  let depth = 0
  let start = -1
  let end = -1
  for (let index = 0; index < value.length; index++) {
    const character = value[index]
    if (character === '(') {
      if (depth === 0) start = index
      depth++
    } else if (character === ')') {
      depth--
      if (depth === 0) end = index
    } else if (depth === 0 && character === ' ') {
      continue
    }
    if (depth === 0 && end !== -1) {
      const name = value.slice(0, start).trim().split(/[\s,]/).pop() ?? ''
      const candidate = `${name}${value.slice(start, end + 1)}`
      if (name === 'url' || GRADIENT_PREFIXES.some((prefix) => candidate.startsWith(prefix))) {
        image = candidate
        const before = value.slice(0, start).trim().split(/\s+/)
        const after = value.slice(end + 1).trim()
        return { image, rest: [...before.slice(0, -1), after].join(' ').trim() }
      }
      start = -1
      end = -1
    }
  }
  return { image, rest: value }
}

function parseShorthand(layer: string): BackgroundLayer {
  const { image, rest } = splitBackgroundFunctions(layer)
  const [positionPart = '', sizePart = ''] = rest.split('/')
  const words = splitCSSValue(positionPart.toLowerCase())
  const sizes = splitCSSValue(sizePart.toLowerCase())
  const result: BackgroundLayer = {
    image,
    size: 'auto',
    position: '0% 0%',
    repeat: 'repeat',
    origin: 'padding-box',
    clip: 'border-box'
  }
  const places: string[] = []
  let sawOrigin = false
  let sawClip = false
  for (const word of words) {
    if (REPEAT_KEYWORDS.has(word)) result.repeat = word
    else if (BOX_KEYWORDS.has(word)) {
      // The first of the two box words is the origin, the second the clip.
      if (!sawOrigin) {
        result.origin = word
        sawOrigin = true
      } else {
        result.clip = word
        sawClip = true
      }
    } else if (ATTACHMENT_KEYWORDS.has(word)) continue
    else if (/^[\d.+-]/.test(word) || ['left', 'right', 'center', 'top', 'bottom'].includes(word)) {
      places.push(word)
    }
  }
  const sizing = sizes.filter((word) => !REPEAT_KEYWORDS.has(word) && !BOX_KEYWORDS.has(word))
  if (sizing.length > 0) result.size = sizing.slice(0, 2).join(' ')
  for (const word of sizes) {
    if (REPEAT_KEYWORDS.has(word)) {
      result.repeat = word
    } else if (BOX_KEYWORDS.has(word)) {
      if (!sawOrigin) {
        result.origin = word
        sawOrigin = true
      } else {
        result.clip = word
        sawClip = true
      }
    }
  }
  if (!sawClip && sawOrigin) result.clip = result.origin
  if (places.length === 1) result.position = places[0]
  else if (places.length >= 2) result.position = places.slice(-2).join(' ')
  return result
}

/** The background layers of an element, top layer first, from the shorthand or the longhands. */
export function backgroundLayers(
  style: DesignStyleDeclaration,
  width = 1,
  height = 1
): BackgroundLayer[] {
  const shorthand = splitLayers(pickStyle(style, 'background') ?? '')
  if (shorthand.length > 0) {
    return shorthand.map((layer) => parseShorthand(layer))
  }
  const parsed = parseCSSBackgroundImages(pickStyle(style, 'background-image'), width, height)
  const sizes = splitLayers(pickStyle(style, 'background-size') ?? '')
  const positions = splitLayers(pickStyle(style, 'background-position') ?? '')
  const repeats = splitLayers(pickStyle(style, 'background-repeat') ?? '')
  const origins = splitLayers(pickStyle(style, 'background-origin') ?? '')
  const clips = splitLayers(pickStyle(style, 'background-clip') ?? '')
  return parsed.map((layer, index) => ({
    image: layer.kind === 'image' ? `url(${layer.url})` : '',
    gradient: layer.kind === 'gradient' ? layer.fill : undefined,
    size: at(sizes, index) ?? 'auto',
    position: at(positions, index) ?? '0% 0%',
    repeat: at(repeats, index) ?? 'repeat',
    origin: at(origins, index) ?? 'padding-box',
    clip: at(clips, index) ?? 'border-box'
  }))
}

/** A length or percentage of `total`, as one value of `background-size` or `-position` gives. */
function lengthOf(value: string | undefined, total: number): number | null {
  if (!value) return null
  const trimmed = value.trim()
  const percent = /^(-?[\d.]+)%$/.exec(trimmed)
  if (percent) {
    const share = Number.parseFloat(percent[1])
    return Number.isFinite(share) ? (total * share) / 100 : null
  }
  const pixels = /^(-?[\d.]+)(?:px)?$/.exec(trimmed)
  if (!pixels) return null
  const number = Number.parseFloat(pixels[1])
  return Number.isFinite(number) ? number : null
}

/** The size `background-size` draws a picture of `natural` size at in `box`. */
function pictureSize(size: string, box: Size, natural: Size): Size {
  const sizing = size.trim().toLowerCase()
  if (sizing === 'cover' || sizing === 'contain') {
    const scale = (sizing === 'cover' ? Math.max : Math.min)(
      box.width / natural.width,
      box.height / natural.height
    )
    return { width: natural.width * scale, height: natural.height * scale }
  }
  const [across, down = 'auto'] = splitCSSValue(sizing)
  const width = across === 'auto' ? null : lengthOf(across, box.width)
  const height = down === 'auto' ? null : lengthOf(down, box.height)
  if (width === null && height === null) return natural
  if (width === null && height !== null) {
    return { width: (height * natural.width) / natural.height, height }
  }
  if (width !== null && height === null) {
    return { width, height: (width * natural.height) / natural.width }
  }
  return { width: width ?? natural.width, height: height ?? natural.height }
}

const POSITION_KEYWORDS: Partial<Record<string, string>> = {
  left: '0%',
  top: '0%',
  center: '50%',
  right: '100%',
  bottom: '100%'
}

/** Where `background-position` puts a picture of `size` in `box`: a percentage of the room left. */
function pictureOffset(position: string, box: Size, size: Size): Vector {
  const values = splitCSSValue(position.trim().toLowerCase()).map(
    (value) => POSITION_KEYWORDS[value] ?? value
  )
  const [across = '50%', down = '50%'] = values
  const along = (value: string, room: number, total: number) => {
    if (value.endsWith('%')) {
      const number = Number.parseFloat(value)
      return Number.isFinite(number) ? (room * number) / 100 : room / 2
    }
    return lengthOf(value, total) ?? room / 2
  }
  return {
    x: along(across, box.width - size.width, box.width),
    y: along(down, box.height - size.height, box.height)
  }
}

function cropTransform(area: Rect, picture: Rect): Matrix {
  return {
    m00: area.width / picture.width,
    m01: 0,
    m02: (area.x - picture.x) / picture.width,
    m10: 0,
    m11: area.height / picture.height,
    m12: (area.y - picture.y) / picture.height
  }
}

function cropFill(imageHash: string, imageTransform: Matrix): Fill {
  return {
    type: 'IMAGE',
    imageHash,
    imageScaleMode: 'CROP',
    imageTransform,
    color: TRANSPARENT,
    opacity: 1,
    visible: true
  }
}

function borderWidth(style: DesignStyleDeclaration, side: string): number {
  const raw = pickStyle(style, `border-${side}-width`) ?? pickStyle(style, 'border-width')
  const parsed = lengthOf(raw, 0)
  return parsed === null || parsed < 0 ? 0 : parsed
}

function paddingWidth(style: DesignStyleDeclaration, side: string): number {
  const parsed = lengthOf(pickStyle(style, `padding-${side}`), 0)
  return parsed === null || parsed < 0 ? 0 : parsed
}

interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

function boxInsets(box: string, style: DesignStyleDeclaration): Insets {
  const border = {
    top: borderWidth(style, 'top'),
    right: borderWidth(style, 'right'),
    bottom: borderWidth(style, 'bottom'),
    left: borderWidth(style, 'left')
  }
  if (box === 'padding-box') return border
  if (box !== 'content-box') return { top: 0, right: 0, bottom: 0, left: 0 }
  return {
    top: border.top + paddingWidth(style, 'top'),
    right: border.right + paddingWidth(style, 'right'),
    bottom: border.bottom + paddingWidth(style, 'bottom'),
    left: border.left + paddingWidth(style, 'left')
  }
}

function insetArea(node: Size, insets: Insets): Rect {
  return {
    x: insets.left,
    y: insets.top,
    width: Math.max(0, node.width - insets.left - insets.right),
    height: Math.max(0, node.height - insets.top - insets.bottom)
  }
}

/** One background layer, in the order CSS paints it: the bottom layer first. */
export interface BackgroundLayerPaint {
  fill: Fill
  /** The area a picture covers, when it covers only part of its layer. */
  area?: Rect
  /** Whether the layer is a picture, which a layer of its own behind the children draws. */
  picture: boolean
}

export interface BackgroundPaint {
  /** Fills in CSS paint order bottom-first, the color first, when every layer covers its box. */
  fills: Fill[]
  /**
   * Every background layer in CSS paint order when one picture covers part of its box, so layers
   * that stay fills and layers that need their own still paint in the order CSS gives them.
   */
  layers: BackgroundLayerPaint[]
}

/** Adds a layer's picture to the stack, at the area it shows when it covers part of its box. */
function placePicture(
  graph: SceneGraph,
  node: Size,
  style: DesignStyleDeclaration,
  layer: BackgroundLayer,
  stack: BackgroundLayerPaint[]
): void {
  const images = parseCSSBackgroundImages(layer.image, node.width, node.height)
  for (const image of images) {
    if (image.kind === 'gradient') {
      stack.push({ fill: image.fill, picture: false })
      continue
    }
    const bytes = bytesFromDataURL(image.url)
    if (!bytes) continue
    const natural = imageSize(bytes)
    if (!natural || natural.width <= 0 || natural.height <= 0) continue
    const imageHash = computeImageHash(bytes)
    graph.images.set(imageHash, bytes)
    const origin = insetArea(node, boxInsets(layer.origin, style))
    const size = pictureSize(layer.size, origin, natural)
    if (size.width <= 0 || size.height <= 0) continue
    const clip = insetArea(node, boxInsets(layer.clip, style))
    const tiles =
      layer.repeat !== 'no-repeat' &&
      layer.repeat !== 'space' &&
      layer.repeat !== 'round' &&
      (layer.size.trim() === 'auto' || layer.size.trim() === 'auto auto')
    if (tiles) {
      stack.push({
        fill: {
          type: 'IMAGE',
          imageHash,
          imageScaleMode: 'TILE',
          color: TRANSPARENT,
          opacity: 1,
          visible: true
        },
        picture: true
      })
      continue
    }
    const offset = pictureOffset(layer.position, origin, size)
    const picture = { x: origin.x + offset.x, y: origin.y + offset.y, ...size }
    const left = Math.max(clip.x, picture.x)
    const top = Math.max(clip.y, picture.y)
    const right = Math.min(clip.x + clip.width, picture.x + picture.width)
    const bottom = Math.min(clip.y + clip.height, picture.y + picture.height)
    if (right <= left || bottom <= top) continue
    const area = { x: left, y: top, width: right - left, height: bottom - top }
    const fill = cropFill(imageHash, cropTransform(area, picture))
    if (
      area.x <= 0.5 &&
      area.y <= 0.5 &&
      area.width >= node.width - 1 &&
      area.height >= node.height - 1
    ) {
      stack.push({ fill, picture: true })
    } else {
      stack.push({ area, fill, picture: true })
    }
  }
}

/**
 * Reads an element's background layers: the color, gradients, tiles and pictures placed where
 * `background-size`, `-position`, `-repeat`, `-origin`, and `-clip` put them, bottom layer first.
 * Every layer stays a fill while all of them cover the box; as soon as one covers part of it, the
 * whole stack becomes layers of their own, so CSS paint order survives across the two kinds.
 */
export function backgroundPaint(
  graph: SceneGraph,
  style: DesignStyleDeclaration,
  node: Size
): BackgroundPaint {
  const color = fillFromColor(style)
  const layers = backgroundLayers(style, node.width, node.height).reverse()
  const stack: BackgroundLayerPaint[] = []
  for (const layer of layers) {
    if (layer.gradient) {
      stack.push({ fill: layer.gradient, picture: false })
      continue
    }
    placePicture(graph, node, style, layer, stack)
  }
  if (stack.every((layer) => layer.area === undefined)) {
    const fills = stack.map((layer) => layer.fill)
    return { fills: color ? [color, ...fills] : fills, layers: [] }
  }
  return { fills: color ? [color] : [], layers: stack }
}

function fillFromColor(style: DesignStyleDeclaration): Fill | null {
  const fills = colorToFillFromCSS(pickStyle(style, 'background-color'))
  return fills[0] ?? null
}

function bytesFromDataURL(value: string | undefined): Uint8Array | null {
  const match = value ? /^data:[^,]*;base64,([\s\S]*)$/.exec(value.trim()) : null
  if (!match) return null
  try {
    return toUint8Array(match[1])
  } catch {
    return null
  }
}
