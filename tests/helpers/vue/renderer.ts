import { createRenderer } from 'vue'

export type HostNode = {
  children: HostNode[]
  parent: HostNode | null
  text: string
}

export function hostNode(text = ''): HostNode {
  return { children: [], parent: null, text }
}

function remove(child: HostNode): void {
  const parent = child.parent
  if (!parent) return
  const index = parent.children.indexOf(child)
  if (index !== -1) parent.children.splice(index, 1)
  child.parent = null
}

function insert(child: HostNode, parent: HostNode, anchor?: HostNode | null): void {
  remove(child)
  child.parent = parent
  const index = anchor ? parent.children.indexOf(anchor) : -1
  if (index < 0) parent.children.push(child)
  else parent.children.splice(index, 0, child)
}

export function createTestRenderer() {
  return createRenderer<HostNode, HostNode>({
    patchProp: () => undefined,
    insert,
    remove,
    createElement: () => hostNode(),
    createText: hostNode,
    createComment: hostNode,
    setText(node, text) {
      node.text = text
    },
    setElementText(node, text) {
      node.text = text
    },
    parentNode: (node) => node.parent,
    nextSibling(node) {
      const parent = node.parent
      return parent?.children[parent.children.indexOf(node) + 1] ?? null
    },
    querySelector: () => null,
    setScopeId: () => undefined,
    insertStaticContent(content, parent, anchor) {
      const node = hostNode(content)
      insert(node, parent, anchor)
      return [node, node]
    }
  })
}

/**
 * A renderer over a real DOM, for tests that need an element CodeMirror can attach to. Vue's
 * runtime-dom captures `document` when its module loads, so `createApp` from `vue` mounts nothing
 * in a test process where another file loaded Vue before this test installed happy-dom. This
 * renderer takes the document explicitly and never reads runtime-dom's captured one.
 */
export function createDOMTestRenderer(document: Document) {
  return createRenderer<Node, Element>({
    patchProp(el, key, _previous, next) {
      if (key === 'class') {
        el.className = next == null ? '' : String(next)
        return
      }
      if (key === 'style') {
        if (next == null) el.removeAttribute('style')
        else if (typeof next === 'string') el.setAttribute('style', next)
        return
      }
      if (next == null) el.removeAttribute(key)
      else el.setAttribute(key, String(next))
    },
    insert(child, parent, anchor) {
      if (anchor) (anchor as ChildNode).before(child)
      else parent.append(child)
    },
    remove(child) {
      child.parentNode?.removeChild(child)
    },
    createElement: (tag) => document.createElement(tag),
    createText: (text) => document.createTextNode(text),
    createComment: (text) => document.createComment(text),
    setText(node, text) {
      node.nodeValue = text
    },
    setElementText(el, text) {
      el.textContent = text
    },
    parentNode: (node) => node.parentElement,
    nextSibling: (node) => node.nextSibling,
    querySelector: (selector) => document.querySelector(selector),
    setScopeId: (el, id) => el.setAttribute(id, ''),
    insertStaticContent(content, parent, anchor) {
      const template = document.createElement('template')
      template.innerHTML = content
      const start = template.content.firstChild
      if (!start) throw new Error('Vue inserted static content that produced no node')
      const end = template.content.lastChild ?? start
      if (anchor) (anchor as ChildNode).before(template.content)
      else parent.append(template.content)
      return [start, end]
    }
  })
}
