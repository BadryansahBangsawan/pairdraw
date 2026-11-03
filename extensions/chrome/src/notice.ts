const NOTICE_STYLE = `
  :host { all: initial; }
  .notice { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%);
    z-index: 2147483647; max-width: min(420px, calc(100vw - 32px)); padding: 8px 12px;
    border-radius: 10px; background: #17171c; color: #ffffff;
    font: 500 12px/16px Inter, system-ui, -apple-system, sans-serif;
    box-shadow: 0 8px 24px #00000040; }
`

/** How long a notice stays, long enough to read a sentence. */
const NOTICE_DURATION = 4000

/**
 * Shows a short notice at the bottom of the page, for picking, where the popup has closed.
 * Returns a function that changes its text, which also restarts its timer.
 */
export function showNotice(document: Document, text: string): (next: string) => void {
  const host = document.createElement('div')
  const shadow = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = NOTICE_STYLE
  const notice = document.createElement('div')
  notice.className = 'notice'
  notice.setAttribute('role', 'status')
  notice.textContent = text
  shadow.append(style, notice)
  document.documentElement.append(host)
  let timer = setTimeout(() => host.remove(), NOTICE_DURATION)
  return (next) => {
    notice.textContent = next
    clearTimeout(timer)
    timer = setTimeout(() => host.remove(), NOTICE_DURATION)
  }
}
