import { isValid, toUint8Array } from 'js-base64'
import { parseFragment, serialize, type DefaultTreeAdapterTypes } from 'parse5'

import { normalizeFontFamily } from '@pairdraw/scene-graph/font-style'

import { tokenStylesheet, type TokenStylesheetFormat } from '../tokens/stylesheet'
import type { DesignDocument, DesignElement, DesignNode, DesignStyleDeclaration } from '../types'
import { mergeClassNames, serializeHTML, splitWhitespace } from './html'

/** A font face the exported text uses. */
export interface WebFontFaceRequest {
  family: string
  weight: number
  style?: 'normal' | 'italic'
}

/** A font file to ship next to the page, described as an `@font-face` rule. */
export interface WebFontFaceAsset {
  family: string
  weight: string | number | [number, number]
  style: string
  display?: string
  stretch?: string
  unicodeRange?: string[]
  format: 'woff2' | 'woff' | 'opentype' | 'truetype'
  path: string
  content: Uint8Array
}

/** Finds font files for the requested faces; paths start with `assetBasePath`. */
export type WebFontFaceResolver = (
  fonts: WebFontFaceRequest[],
  assetBasePath: string
) => Promise<WebFontFaceAsset[]>

export interface ExportHTMLBundleOptions {
  html?: 'fragment' | 'standalone'
  style?: 'inline' | 'tailwind'
  assets?: 'inline' | 'external'
  /** Resolves font files to include with external assets; `none` includes no fonts. */
  fonts?: 'none' | WebFontFaceResolver
  assetBasePath?: string
  /**
   * Reads one of Tailwind's stylesheets, `tailwindcss/theme.css` or `tailwindcss/utilities.css`,
   * for a standalone Tailwind page. Browsers pass one; Node and Bun read the installed package.
   */
  loadTailwindStylesheet?: TailwindStylesheetLoader
}

export type TailwindStylesheetLoader = (id: TailwindStylesheetId) => Promise<string>
export type TailwindStylesheetId = 'tailwindcss/theme.css' | 'tailwindcss/utilities.css'

export interface ExportHTMLFile {
  path: string
  content: string | Uint8Array
}

export interface ExportHTMLBundle {
  entrypoint: string
  files: ExportHTMLFile[]
}

interface StandaloneBounds {
  minX: number
  minY: number
  width: number
  height: number
}

type ParseNode = DefaultTreeAdapterTypes.Node
type ParseParent = DefaultTreeAdapterTypes.ParentNode
type ParseElement = DefaultTreeAdapterTypes.Element

const RESET_CSS =
  '*,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#fff}'

function styleToCSS(style: DesignStyleDeclaration): string {
  return Object.entries(style)
    .filter(([, value]) => value !== '')
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ')
}

function cloneNode(node: DesignNode): DesignNode {
  if (node.type === 'text') return { ...node }
  return {
    ...node,
    attrs: { ...node.attrs },
    inlineStyle: node.inlineStyle ? { ...node.inlineStyle } : undefined,
    children: node.children.map(cloneNode)
  }
}

function standaloneStyleForNode(
  node: DesignElement,
  parent: DesignElement | undefined,
  origin: StandaloneBounds
): DesignStyleDeclaration {
  const style = { ...node.inlineStyle }
  const source = node.sourceSceneNode
  if (!source) return style

  style.position = 'absolute'
  style.left = `${source.x - (parent ? 0 : origin.minX)}px`
  style.top = `${source.y - (parent ? 0 : origin.minY)}px`
  return style
}

function standaloneNode(
  node: DesignNode,
  origin: StandaloneBounds,
  parent?: DesignElement
): DesignNode {
  if (node.type === 'text') return cloneNode(node)
  const standalone: DesignElement = {
    ...node,
    attrs: { ...node.attrs },
    inlineStyle: standaloneStyleForNode(node, parent, origin),
    children: []
  }
  standalone.children = node.children.map((child) => standaloneNode(child, origin, node))
  return standalone
}

function nodeBounds(node: DesignNode): StandaloneBounds | undefined {
  if (node.type === 'text' || !node.sourceSceneNode) return undefined
  return {
    minX: node.sourceSceneNode.x,
    minY: node.sourceSceneNode.y,
    width: node.sourceSceneNode.width,
    height: node.sourceSceneNode.height
  }
}

function standaloneSize(document: DesignDocument): StandaloneBounds {
  const bounds = document.children
    .map(nodeBounds)
    .filter((value): value is NonNullable<typeof value> => value !== undefined)
  const minX = bounds.length > 0 ? Math.min(...bounds.map((bound) => bound.minX)) : 0
  const minY = bounds.length > 0 ? Math.min(...bounds.map((bound) => bound.minY)) : 0
  const maxX = bounds.length > 0 ? Math.max(...bounds.map((bound) => bound.minX + bound.width)) : 1
  const maxY = bounds.length > 0 ? Math.max(...bounds.map((bound) => bound.minY + bound.height)) : 1
  return { minX, minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) }
}

function standaloneDocument(document: DesignDocument, size: StandaloneBounds): DesignDocument {
  return {
    ...document,
    children: document.children.map((node) => standaloneNode(node, size))
  }
}

function cssClassName(index: number): string {
  return `op-${index.toString(36)}`
}

function extractInlineStyles(
  node: DesignNode,
  rules: string[],
  nextIndex: { value: number }
): DesignNode {
  if (node.type === 'text') return node
  const children = node.children.map((child) => extractInlineStyles(child, rules, nextIndex))
  if (!node.inlineStyle || Object.keys(node.inlineStyle).length === 0) return { ...node, children }

  const className = cssClassName(nextIndex.value)
  nextIndex.value += 1
  rules.push(`.${className}{${styleToCSS(node.inlineStyle)}}`)
  return {
    ...node,
    attrs: { ...node.attrs, class: mergeClassNames(node.attrs.class, className) ?? className },
    inlineStyle: undefined,
    children
  }
}

function isElement(node: ParseNode): node is ParseElement {
  return 'attrs' in node && 'tagName' in node
}

function walkParseTree(node: ParseNode | ParseParent, visit: (node: ParseElement) => void): void {
  if (isElement(node)) visit(node)
  if ('childNodes' in node) {
    for (const child of node.childNodes) walkParseTree(child, visit)
  }
}

function classNamesFromHTML(html: string): string[] {
  const fragment = parseFragment(html)
  const classes = new Set<string>()
  walkParseTree(fragment, (element) => {
    const classAttr = element.attrs.find((attr) => attr.name === 'class')
    if (!classAttr) return
    for (const className of splitWhitespace(classAttr.value)) classes.add(className)
  })
  return [...classes]
}

/**
 * The stylesheet for the tokens the document references, in the format the page needs: plain
 * custom properties for inline styles, `@theme` for Tailwind, so token utilities compile.
 */
async function tokenCSS(document: DesignDocument, format: TokenStylesheetFormat): Promise<string> {
  const { tokens, sourceGraph } = document
  if (!tokens || !sourceGraph || tokens.used.size === 0) return ''
  const variables = tokens.stylesheetVariables()
  const { css } = await tokenStylesheet(sourceGraph, {
    format,
    include: (variable) => variables.has(variable.id)
  })
  return css
}

async function readInstalledTailwindStylesheet(id: TailwindStylesheetId): Promise<string> {
  const { readFile } = await import(/* @vite-ignore */ 'node:fs/promises')
  return readFile(new URL(import.meta.resolve(id)), 'utf8')
}

async function compileTailwindClasses(
  classNames: string[],
  tokens: string,
  load: TailwindStylesheetLoader = readInstalledTailwindStylesheet
): Promise<string> {
  if (classNames.length === 0) return ''
  const [{ compile }, themeCSS, utilitiesCSS] = await Promise.all([
    import('tailwindcss'),
    load('tailwindcss/theme.css'),
    load('tailwindcss/utilities.css')
  ])
  const compiler = await compile(`${themeCSS}\n${tokens}\n${utilitiesCSS}`)
  return compiler.build(classNames)
}

function collectFontRequests(node: DesignNode, fonts: Map<string, WebFontFaceRequest>): void {
  if (node.type === 'text') return
  const source = node.sourceSceneNode
  if (source?.type === 'TEXT') {
    const family = normalizeFontFamily(source.fontFamily)
    const style = source.italic ? 'italic' : 'normal'
    const key = `${family}|${source.fontWeight}|${style}`
    fonts.set(key, { family, weight: source.fontWeight, style })
  }
  for (const child of node.children) collectFontRequests(child, fonts)
}

function serializeFontWeight(weight: string | number | [number, number]): string {
  return Array.isArray(weight) ? weight.join(' ') : String(weight)
}

/**
 * A relative file path as a URL that points at it: each folder and file name percent-encoded,
 * so a page named `Card #1` finds `Card #1.assets/` rather than reading `#1` as a fragment.
 */
function assetURL(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

function fontSourceValue(asset: WebFontFaceAsset, from: string): string {
  // Relative to the stylesheet's folder, which the asset's path may start with.
  const path =
    from && asset.path.startsWith(`${from}/`) ? asset.path.slice(from.length + 1) : asset.path
  return [
    'url(',
    JSON.stringify(assetURL(path)),
    ') format(',
    JSON.stringify(asset.format),
    ')'
  ].join('')
}

interface FontFaceCSSOptions {
  /** The folder the stylesheet is in, which font paths are written relative to. */
  from: string
  /** `font-display` for every face, rather than each face's own. */
  display?: string
}

function fontFaceCSS(asset: WebFontFaceAsset, options: FontFaceCSSOptions): string {
  const declarations: [property: string, value: string][] = [
    ['font-family', JSON.stringify(asset.family)],
    ['src', fontSourceValue(asset, options.from)],
    ['font-weight', serializeFontWeight(asset.weight)],
    ['font-style', asset.style],
    ['font-display', options.display ?? asset.display ?? 'swap']
  ]
  if (asset.stretch) declarations.push(['font-stretch', asset.stretch])
  if (asset.unicodeRange && asset.unicodeRange.length > 0) {
    declarations.push(['unicode-range', asset.unicodeRange.join(',')])
  }
  // Written out rather than serialized by a CSS object model, which a browser bundle cannot load.
  const body = declarations.map(([property, value]) => `  ${property}: ${value};`).join('\n')
  return `@font-face {\n${body}\n}\n`
}

/** Every font face a document's text uses, once each. */
export function designFontRequests(document: DesignDocument): WebFontFaceRequest[] {
  const requests = new Map<string, WebFontFaceRequest>()
  for (const child of document.children) collectFontRequests(child, requests)
  return [...requests.values()]
}

/** `@font-face` rules for font files, as a stylesheet in the folder `options.from`. */
export function fontFaceStylesheet(
  assets: readonly WebFontFaceAsset[],
  options: FontFaceCSSOptions
): string {
  if (assets.length === 0) return ''
  return assets.map((asset) => fontFaceCSS(asset, options)).join('')
}

async function fontFaceAssets(
  document: DesignDocument,
  options: ResolvedBundleOptions
): Promise<{ css: string; files: ExportHTMLFile[] }> {
  if (options.fonts === 'none' || options.assets !== 'external') return { css: '', files: [] }
  const assets = await options.fonts(designFontRequests(document), `${options.assetBasePath}/fonts`)
  // The page's stylesheet sits in the asset folder, beside the fonts' own folder.
  return {
    css: fontFaceStylesheet(assets, { from: options.assetBasePath }),
    files: assets
  }
}

function dataImageParts(value: string): { mime: string; base64: string } | undefined {
  if (!value.startsWith('data:image/')) return undefined
  const marker = ';base64,'
  const markerIndex = value.indexOf(marker)
  if (markerIndex === -1) return undefined
  const base64 = value.slice(markerIndex + marker.length)
  // Documents can come from parsed HTML; an invalid payload stays inline rather than decoding to other bytes.
  if (!isValid(base64)) return undefined
  return { mime: value.slice('data:'.length, markerIndex), base64 }
}

function extensionForMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  if (mime === 'image/svg+xml') return 'svg'
  return 'png'
}

/** Inline images moved into files under `assetBasePath`, the HTML pointing at them. */
export function extractImageAssets(
  html: string,
  assetBasePath: string
): { html: string; files: ExportHTMLFile[] } {
  const fragment = parseFragment(html)
  const files: ExportHTMLFile[] = []
  const sources = new Map<string, string>()
  walkParseTree(fragment, (element) => {
    const src = element.attrs.find((attr) => attr.name === 'src')
    if (!src) return
    const parts = dataImageParts(src.value)
    if (!parts) return
    const cachedPath = sources.get(src.value)
    if (cachedPath) {
      src.value = assetURL(cachedPath)
      return
    }
    const path = `${assetBasePath}/images/image-${sources.size + 1}.${extensionForMime(parts.mime)}`
    sources.set(src.value, path)
    files.push({ path, content: toUint8Array(parts.base64) })
    src.value = assetURL(path)
  })
  return { html: serialize(fragment), files }
}

function stylesheetLink(path: string): string {
  return `<link rel="stylesheet" href="${assetURL(path)}">`
}

/**
 * A `<style>` element holding `css`. The HTML parser ends the element at the first `</style`
 * in any letter case, whatever the CSS around it means, and style values can come from an
 * imported document, so each one is written `<\/style`, which CSS strings and URLs read back
 * as `</style`.
 */
function styleTag(css: string): string {
  return css ? `<style>${css.replace(/<\/(?=style)/gi, '<\\/')}</style>` : ''
}

type ResolvedBundleOptions = Required<Omit<ExportHTMLBundleOptions, 'loadTailwindStylesheet'>> &
  Pick<ExportHTMLBundleOptions, 'loadTailwindStylesheet'>

async function exportStandaloneHTML(
  document: DesignDocument,
  options: ResolvedBundleOptions
): Promise<ExportHTMLBundle> {
  const size = standaloneSize(document)
  const doc = standaloneDocument(document, size)
  const stageCSS = `.pairdraw-stage{position:relative;width:${size.width}px;height:${size.height}px;overflow:hidden;background:transparent}`
  let body: string
  let css = `${RESET_CSS}${stageCSS}`

  if (options.style === 'tailwind') {
    body = serializeHTML(doc, { style: 'tailwind' })
    css += await compileTailwindClasses(
      classNamesFromHTML(body),
      await tokenCSS(document, 'tailwind'),
      options.loadTailwindStylesheet
    )
  } else {
    css += await tokenCSS(document, 'css')
    const rules: string[] = []
    const index = { value: 0 }
    const styledDocument: DesignDocument = {
      ...doc,
      children: doc.children.map((node) => extractInlineStyles(node, rules, index))
    }
    body = serializeHTML(styledDocument)
    css += rules.join('')
  }

  if (options.assets === 'external') {
    const [extracted, fonts] = await Promise.all([
      Promise.resolve(extractImageAssets(body, options.assetBasePath)),
      fontFaceAssets(document, options)
    ])
    body = extracted.html
    const cssPath = `${options.assetBasePath}/pairdraw.css`
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${stylesheetLink(cssPath)}</head><body><main data-pairdraw-html="standalone" class="pairdraw-stage">${body}</main></body></html>`
    return {
      entrypoint: 'index.html',
      files: [
        { path: 'index.html', content: html },
        { path: cssPath, content: `${fonts.css}${css}` },
        ...fonts.files,
        ...extracted.files
      ]
    }
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${styleTag(css)}</head><body><main data-pairdraw-html="standalone" class="pairdraw-stage">${body}</main></body></html>`
  return { entrypoint: 'index.html', files: [{ path: 'index.html', content: html }] }
}

export async function exportHTMLBundle(
  document: DesignDocument,
  options: ExportHTMLBundleOptions = {}
): Promise<ExportHTMLBundle> {
  const resolvedOptions: ResolvedBundleOptions = {
    html: options.html ?? 'fragment',
    style: options.style ?? 'inline',
    assets: options.assets ?? 'inline',
    fonts: options.fonts ?? 'none',
    assetBasePath: options.assetBasePath ?? 'assets',
    loadTailwindStylesheet: options.loadTailwindStylesheet
  }

  if (resolvedOptions.html === 'standalone') return exportStandaloneHTML(document, resolvedOptions)

  const fragment = serializeHTML(document, { style: resolvedOptions.style })
  if (resolvedOptions.assets !== 'external') {
    return { entrypoint: 'index.html', files: [{ path: 'index.html', content: fragment }] }
  }
  // A fragment has no stylesheet to declare fonts in, so only its images become files.
  const extracted = extractImageAssets(fragment, resolvedOptions.assetBasePath)
  return {
    entrypoint: 'index.html',
    files: [{ path: 'index.html', content: extracted.html }, ...extracted.files]
  }
}
