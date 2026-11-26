import { afterAll, afterEach, expect, jest, test } from 'bun:test'

import type { CompletionContext } from '@codemirror/autocomplete'
import type { EditorView as EditorViewInstance } from '@codemirror/view'
import { Window } from 'happy-dom'
import type { App } from 'vue'

import type {
  ExpressionDialect,
  ReferenceCompletion
} from '@/components/variables/formula-field/dialects/types'

import { asDouble } from '#tests/helpers/doubles'

// CodeMirror's own view needs a document before the field can mount. happy-dom supplies it and
// stands in for the browser's DOM, as it does for the keyboard overlay test. The globals are
// installed when the tests run, not when this file loads: a `window` present while other test files
// load makes `fake-indexeddb/auto` attach `indexedDB` to that window instead of `globalThis`, which
// breaks every later test that opens a database.
const GLOBAL_KEYS = [
  'window',
  'document',
  'navigator',
  'Node',
  'Element',
  'HTMLElement',
  'SVGElement',
  'Text',
  'Comment',
  'DocumentFragment',
  'KeyboardEvent',
  'MutationObserver',
  'Storage',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'Range'
] as const

function installDOM(): { window: Window; restore: () => void } {
  const previous = GLOBAL_KEYS.map(
    (name) => [name, Reflect.get(globalThis, name) as unknown] as const
  )
  const window = new Window({ url: 'http://localhost/' })
  Object.assign(globalThis, {
    window,
    document: window.document,
    navigator: window.navigator,
    Node: window.Node,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    SVGElement: window.SVGElement,
    Text: window.Text,
    Comment: window.Comment,
    DocumentFragment: window.DocumentFragment,
    KeyboardEvent: window.KeyboardEvent,
    MutationObserver: window.MutationObserver,
    Storage: window.Storage,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    Range: window.Range
  })
  return {
    window,
    restore() {
      for (const [name, value] of previous) {
        if (value === undefined) Reflect.deleteProperty(globalThis, name)
        else Reflect.set(globalThis, name, value)
      }
    }
  }
}

let dom: { window: Window; restore: () => void } | undefined

const references: ReferenceCompletion[] = [
  { label: 'base', section: '', detail: '4px', insert: 'base' }
]
const dialect: ExpressionDialect = {
  language: [],
  complete: (all) => (context: CompletionContext) => ({
    from: context.matchBefore(/\w*/)?.from ?? context.pos,
    options: all().map(({ label, detail, insert }) => ({ label, detail, apply: insert })),
    validFor: /^\w*$/
  }),
  references: () => []
}

let app: App | undefined
let container: HTMLDivElement | undefined

afterEach(() => {
  app?.unmount()
  container?.remove()
  app = undefined
  container = undefined
})

afterAll(() => {
  dom?.restore()
  dom = undefined
})

/** Mounts the value field and returns its CodeMirror view, opened with an empty value. */
async function mountField(onEnter: () => void): Promise<EditorViewInstance> {
  dom ??= installDOM()
  const { defineComponent, h, nextTick, ref } = await import('vue')
  const { EditorView } = await import('@codemirror/view')
  const { createDOMTestRenderer } = await import('#tests/helpers/vue/renderer')
  const { useFormulaField } = await import('@/components/variables/formula-field/useFormulaField')
  // `createApp` from `vue` would use the `document` runtime-dom captured when another test file
  // loaded Vue; this renderer takes the happy-dom document explicitly, so the mount does not depend
  // on which file imported Vue first.
  const renderer = createDOMTestRenderer(asDouble<Document>(dom.window.document))
  const host = ref<HTMLDivElement | null>(null)
  const model = ref('')
  const Host = defineComponent({
    setup() {
      useFormulaField(host, model, {
        dialect,
        completions: () => references,
        label: () => 'Value',
        placeholder: () => '',
        attributes: () => ({ 'aria-label': 'Value' }),
        resolve: () => undefined,
        result: () => undefined,
        buttons: () => false,
        onChange: () => undefined,
        onEnter,
        onCancel: () => undefined,
        onSelection: () => undefined
      })
      return () => h('div', { ref: host })
    }
  })
  container = document.createElement('div')
  document.body.append(container)
  app = renderer.createApp(Host)
  app.mount(container)
  await nextTick()
  const element = container.querySelector<HTMLElement>('.cm-editor')
  const view = element === null ? null : EditorView.findFromDOM(element)
  if (view === null) throw new Error('the field mounted no CodeMirror view')
  return view
}

test('Enter accepts the completion the list has selected right after it opens', async () => {
  const entered: string[] = []
  const view = await mountField(() => entered.push('enter'))
  const { completionStatus, startCompletion } = await import('@codemirror/autocomplete')

  // The list stamps the moment it opened and refuses acceptance inside `interactionDelay`, so the
  // clock is the test's: open the list, let the plugin's own 50 ms start timer fire, and press Enter
  // 50 ms later, still inside the 75 ms window.
  jest.useFakeTimers()
  jest.setSystemTime(1_000_000)
  try {
    view.dispatch({ changes: { from: 0, insert: 'ba' }, selection: { anchor: 2 } })
    startCompletion(view)
    jest.advanceTimersByTime(50)
    for (let tick = 0; tick < 10 && completionStatus(view.state) !== 'active'; tick++) {
      await Promise.resolve()
    }
    expect(completionStatus(view.state)).toBe('active')

    // The global is happy-dom's at runtime (installed above) and the DOM lib's at the type level.
    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      cancelable: true
    })
    view.contentDOM.dispatchEvent(enter)
  } finally {
    jest.useRealTimers()
  }

  // Enter committed the reference instead of doing nothing, and did not fall through to the field's
  // own Enter, which saves the value.
  expect(view.state.doc.toString()).toBe('base')
  expect(entered).toEqual([])
})
