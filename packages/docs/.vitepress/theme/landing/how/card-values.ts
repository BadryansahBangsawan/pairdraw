/**
 * The Goals card reads its figures from the catalog, so the amounts a page shows and the ring and
 * bars it draws cannot drift apart. Amounts are written as `$2,400` and `$900 / $1,400` in every
 * locale; a value the pattern does not find counts as nothing.
 */
const MONEY = /\$\s?([\d,]+)/g

function amounts(value: string): number[] {
  return [...value.matchAll(MONEY)].map((match) => Number(match[1].replaceAll(',', '')))
}

function fraction(part: number | undefined, total: number | undefined): number {
  if (part === undefined || total === undefined || total <= 0) return 0
  return Math.min(Math.max(part / total, 0), 1)
}

/** How full each goal's bar is, from the `spent / total` in its detail. */
export function goalFills(goals: readonly { detail: string }[]): number[] {
  return goals.map(({ detail }) => {
    const [spent, total] = amounts(detail)
    return fraction(spent, total)
  })
}

/** How much of the total the saved amount is, from the amount and saved lines. */
export function savedFraction(amount: string, saved: string): number {
  return fraction(amounts(amount)[0], amounts(saved)[0])
}
