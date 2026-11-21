interface FontData {
  family: string
  fullName: string
  postscriptName: string
  style: string
  blob(): Promise<Blob>
}

interface Window {
  queryLocalFonts?(): Promise<FontData[]>
}

declare module '*?raw' {
  const content: string
  export default content
}

/** opencc-js types its converters only; a dictionary module is `key value…` entries joined by `|`. */
declare module 'opencc-js/dict/TSCharacters' {
  const entries: string
  export default entries
}

/** svg2pdf.js declares types for its package root only; its ES build is the same module. */
declare module 'svg2pdf.js/dist/svg2pdf.es.min.js' {
  export * from 'svg2pdf.js'
}

/** gifenc ships no types; these are the parts the prototype recorder uses. */
declare module 'gifenc' {
  type Palette = number[][]
  interface GIFFrameOptions {
    palette?: Palette
    /** Milliseconds; GIF stores hundredths of a second. */
    delay?: number
    /** 0 repeats forever, -1 plays once. */
    repeat?: number
  }
  interface GIFEncoderInstance {
    writeFrame(index: Uint8Array, width: number, height: number, options?: GIFFrameOptions): void
    finish(): void
    bytes(): Uint8Array
    bytesView(): Uint8Array
  }
  export function GIFEncoder(): GIFEncoderInstance
  export function quantize(rgba: Uint8Array, maxColors: number): Palette
  export function applyPalette(rgba: Uint8Array, palette: Palette): Uint8Array
}

/** gifenc's ES build is the same module as its root, which Node loads as CJS. */
declare module 'gifenc/dist/gifenc.esm.js' {
  export * from 'gifenc'
}
