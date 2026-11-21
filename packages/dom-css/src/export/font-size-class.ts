/**
 * twirlwind names a literal font size that is a multiple of four `text-<px / 4>` (40px becomes
 * text-10), a class Tailwind never generates. Rewrite that one token to the arbitrary value,
 * the spelling Tailwind compiles, leaving named steps and token-bound sizes alone.
 *
 * `css` is the declaration string the class list was generated from.
 */
export function validFontSizeClass(className: string, css: string): string {
  const fontSize = /(?:^|;)\s*font-size:\s*(\d+(?:\.\d+)?)px/.exec(css)?.[1]
  const numeric = className.match(/(?:^|\s)text-(\d+)(?=\s|$)/)
  if (!fontSize || !numeric || Number(numeric[1]) * 4 !== Number(fontSize)) return className
  return className.replace(numeric[0], numeric[0].replace(/text-\d+/, `text-[${fontSize}px]`))
}
