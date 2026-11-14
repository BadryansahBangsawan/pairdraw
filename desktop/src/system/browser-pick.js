/* The page picks one element. The overlay is removed before this resolves, so the capture that
 * follows does not include it. Escape, or a click that hits nothing, cancels. */
;(() => {
  const cancelled = 'The pick was cancelled'
  const escape =
    window.CSS && CSS.escape
      ? (value) => CSS.escape(value)
      : (value) => value.replace(/[^a-zA-Z0-9_-]/g, '\\$&')

  function selectorOf(element) {
    const parts = []
    let node = element
    while (node && node.nodeType === 1 && node !== document.documentElement) {
      if (node.id) {
        const id = '#' + escape(node.id)
        if (document.querySelectorAll(id).length === 1) {
          parts.unshift(id)
          break
        }
      }
      let part = node.tagName.toLowerCase()
      const parent = node.parentElement
      if (parent) {
        const same = Array.from(parent.children).filter((child) => child.tagName === node.tagName)
        if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(node) + 1) + ')'
      }
      parts.unshift(part)
      node = node.parentElement
    }
    return parts.join(' > ')
  }

  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.setAttribute('data-pairdraw-pick', '')
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;cursor:crosshair;background:transparent'
    const box = document.createElement('div')
    box.style.cssText =
      'position:fixed;pointer-events:none;display:none;outline:2px solid #ff5b2e;background:rgba(255,91,46,0.15)'
    overlay.appendChild(box)
    document.documentElement.appendChild(overlay)

    const finish = (value) => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('mousemove', onMove, true)
      window.removeEventListener('click', onClick, true)
      overlay.remove()
      resolve(value)
    }
    const hitAt = (event) => {
      overlay.style.pointerEvents = 'none'
      const hit = document.elementFromPoint(event.clientX, event.clientY)
      overlay.style.pointerEvents = 'auto'
      if (!hit || hit === overlay || overlay.contains(hit) || hit === document.documentElement) {
        return null
      }
      return hit
    }
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      finish(cancelled)
    }
    const onMove = (event) => {
      const hit = hitAt(event)
      if (!hit) {
        box.style.display = 'none'
        return
      }
      const rect = hit.getBoundingClientRect()
      box.style.display = 'block'
      box.style.left = rect.left + 'px'
      box.style.top = rect.top + 'px'
      box.style.width = rect.width + 'px'
      box.style.height = rect.height + 'px'
    }
    const onClick = (event) => {
      event.preventDefault()
      event.stopPropagation()
      const hit = hitAt(event)
      finish(hit ? selectorOf(hit) : cancelled)
    }
    // Capture phase on window runs before a listener the page put on document.
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('mousemove', onMove, true)
    window.addEventListener('click', onClick, true)
  })
})()
