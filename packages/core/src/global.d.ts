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
