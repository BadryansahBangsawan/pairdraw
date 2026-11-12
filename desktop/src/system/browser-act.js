/* One change to the open page: click, type, press a key, or scroll. A wait is a separate
 * probe that only reads. Nothing here assigns the address; a click may navigate, and the
 * window's own rule still decides whether that navigation stands. This does not read cookies,
 * storage, or request headers. */
const request = __openpencilActRequest

function find(selector) {
  try {
    return selector ? document.querySelector(selector) : null
  } catch {
    return null
  }
}

function click(selector) {
  const element = find(selector)
  if (!element) return { code: 'missing' }
  element.click()
  return { code: 'ok' }
}

function typeText(selector, text) {
  const element = find(selector)
  if (!element) return { code: 'missing' }
  const editable = element.isContentEditable === true || element.matches('input, textarea')
  if (!editable) return { code: 'not_editable' }
  element.focus()
  if (element.isContentEditable === true) element.textContent = text
  else element.value = text
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
  return { code: 'ok' }
}

function press(selector, key) {
  const element = find(selector)
  if (!element) return { code: 'missing' }
  element.focus()
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  element.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }))
  return { code: 'ok' }
}

function scroll(selector, dx, dy) {
  const element = find(selector)
  if (!element) return { code: 'missing' }
  if (typeof element.scrollBy === 'function') element.scrollBy(dx, dy)
  else {
    element.scrollLeft += dx
    element.scrollTop += dy
  }
  return { code: 'ok' }
}

if (!request || typeof request.kind !== 'string') return JSON.stringify({ code: 'missing' })
if (request.kind === 'probe-href') return JSON.stringify(String(location.href))
if (request.kind === 'probe-selector') return JSON.stringify(find(request.selector) ? 'yes' : 'no')
if (request.kind === 'click') return JSON.stringify(click(request.selector))
if (request.kind === 'type') {
  return JSON.stringify(typeText(request.selector, typeof request.text === 'string' ? request.text : ''))
}
if (request.kind === 'key') {
  return JSON.stringify(press(request.selector, typeof request.key === 'string' ? request.key : ''))
}
if (request.kind === 'scroll') {
  return JSON.stringify(scroll(request.selector, Number(request.dx) || 0, Number(request.dy) || 0))
}
return JSON.stringify({ code: 'missing' })
