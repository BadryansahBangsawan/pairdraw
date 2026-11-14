/* Outlines one element while a chat chip points at it. The box is removed when the pointer
 * leaves the chip, or when the selector matches nothing. It is not the capturer and it does not
 * read cookies, storage, or request headers. */
const request = __pairdrawMarkRequest

function clearMark() {
  const existing = document.querySelector('[data-pairdraw-mark]')
  if (existing) existing.remove()
}

function showMark(selector) {
  clearMark()
  let element = null
  try {
    element = selector ? document.querySelector(selector) : null
  } catch {
    element = null
  }
  if (!element) return { shown: false }
  const rect = element.getBoundingClientRect()
  const box = document.createElement('div')
  box.setAttribute('data-pairdraw-mark', '')
  box.style.position = 'fixed'
  box.style.pointerEvents = 'none'
  box.style.zIndex = '2147483646'
  box.style.outline = '2px solid #ff5b2e'
  box.style.background = 'rgba(255,91,46,0.15)'
  box.style.left = rect.left + 'px'
  box.style.top = rect.top + 'px'
  box.style.width = rect.width + 'px'
  box.style.height = rect.height + 'px'
  document.documentElement.appendChild(box)
  return { shown: true }
}

if (!request || request.action === 'clear') {
  clearMark()
  return JSON.stringify({ shown: false })
}
return JSON.stringify(showMark(request.selector))
