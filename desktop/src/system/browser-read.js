const TEXT = 240
const ITEM_TEXT = 80
const ITEMS = 24
const SELECTOR = 300

function cut(value, limit) {
  const text = String(value == null ? '' : value)
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > limit ? text.slice(0, limit) : text
}

function textOf(el, limit) {
  let value = ''
  if (typeof el.innerText === 'string' && el.innerText) value = el.innerText
  else if (typeof el.textContent === 'string') value = el.textContent
  return cut(value, limit)
}

function roleOf(el) {
  const explicit = el.getAttribute('role')
  if (explicit) return cut(explicit, 40)
  const tag = el.tagName.toLowerCase()
  if (/^h[1-6]$/.test(tag)) return 'heading'
  if (tag === 'a' && el.hasAttribute('href')) return 'link'
  if (tag === 'button') return 'button'
  if (tag === 'textarea') return 'textbox'
  if (tag === 'select') return 'combobox'
  if (tag === 'img') return 'img'
  if (tag === 'input') {
    const type = (el.getAttribute('type') || 'text').toLowerCase()
    if (type === 'checkbox') return 'checkbox'
    if (type === 'radio') return 'radio'
    if (type === 'button' || type === 'submit' || type === 'reset') return 'button'
    return 'textbox'
  }
  return ''
}

function boxOf(el) {
  const rect = el.getBoundingClientRect()
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
}

function selectorOf(el) {
  if (el.id && /^[A-Za-z][\w-]*$/.test(el.id)) {
    const id = '#' + el.id
    try {
      if (document.querySelectorAll(id).length === 1) return id
    } catch {
      // An id the page used is not always a selector. The path below still names the element.
    }
  }
  const parts = []
  let node = el
  while (node && node.nodeType === 1 && node !== document.documentElement && parts.length < 8) {
    const tag = node.tagName.toLowerCase()
    let nth = 1
    let sibling = node.previousElementSibling
    while (sibling) {
      if (sibling.tagName === node.tagName) nth += 1
      sibling = sibling.previousElementSibling
    }
    parts.unshift(tag + ':nth-of-type(' + nth + ')')
    node = node.parentElement
  }
  return cut(parts.join(' > '), SELECTOR)
}

function readOne(selector) {
  let el = null
  try {
    el = selector ? document.querySelector(selector) : null
  } catch {
    el = null
  }
  if (!el) return { missing: true }
  return {
    tag: cut(el.tagName.toLowerCase(), 40),
    role: roleOf(el),
    text: textOf(el, TEXT),
    box: boxOf(el)
  }
}

function labelOf(el) {
  const aria = el.getAttribute('aria-label')
  if (aria) return cut(aria, ITEM_TEXT)
  const labels = el.labels
  if (labels && labels.length > 0) {
    const first = textOf(labels[0], ITEM_TEXT)
    if (first) return first
  }
  const named = el.getAttribute('aria-labelledby')
  if (named) {
    const node = document.getElementById(named.split(/\s+/)[0])
    if (node) return textOf(node, ITEM_TEXT)
  }
  const placeholder = el.getAttribute('placeholder')
  if (placeholder) return cut(placeholder, ITEM_TEXT)
  return ''
}

function take(list, map) {
  const out = []
  const count = Math.min(list.length, ITEMS)
  for (let index = 0; index < count; index += 1) out.push(map(list[index]))
  return out
}

function outline() {
  return {
    headings: take(document.querySelectorAll('h1,h2,h3,h4,h5,h6'), (el) => ({
      level: Number(el.tagName.charAt(1)),
      text: textOf(el, ITEM_TEXT),
      selector: selectorOf(el)
    })),
    links: take(document.querySelectorAll('a[href]'), (el) => ({
      text: textOf(el, ITEM_TEXT),
      href: cut(el.getAttribute('href') || '', ITEM_TEXT),
      selector: selectorOf(el)
    })),
    buttons: take(
      document.querySelectorAll('button, input[type="button"], input[type="submit"]'),
      (el) => ({
        text: textOf(el, ITEM_TEXT) || cut(typeof el.value === 'string' ? el.value : '', ITEM_TEXT),
        selector: selectorOf(el)
      })
    ),
    inputs: take(document.querySelectorAll('input, textarea, select'), (el) => ({
      label: labelOf(el),
      type: cut((el.getAttribute('type') || el.tagName).toLowerCase(), 40),
      selector: selectorOf(el)
    }))
  }
}

const request = __pairdrawReadRequest
if (!request || request.kind === 'element') {
  return JSON.stringify(readOne(request && request.selector ? String(request.selector) : ''))
}
return JSON.stringify(outline())
