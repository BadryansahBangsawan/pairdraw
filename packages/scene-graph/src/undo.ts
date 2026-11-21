export interface UndoEntry {
  label: string
  forward: () => void
  inverse: () => void
  coalesceKey?: string
}

/**
 * Committed history, kept aside while another graph is open so a document opened in the same
 * editor never inherits the last one's steps.
 */
export interface UndoHistory {
  readonly undo: readonly UndoEntry[]
  readonly redo: readonly UndoEntry[]
}

export interface UndoManagerOptions {
  limit?: number
  /** Called after recording, undoing, redoing, or clearing committed history. */
  onChange?: () => void
  /**
   * The edited-field marks an edit adds. A step takes its marks back when undone and puts them
   * back when redone, so a layer ends a step exactly as it began one, marks included.
   */
  marks?: UndoSourceMarks
}

/** Marks an edit left on layers, kept by the graph for one undo step. */
export interface UndoSourceMarks {
  /** The marks added since the last step, which that step owns. */
  take: () => Array<[nodeId: string, field: string]>
  add: (nodeId: string, fields: readonly string[]) => void
  remove: (nodeId: string, fields: readonly string[]) => void
  /** Runs a replay that writes values only, so it marks no field of its own. */
  preserve: (run: () => void) => void
}

interface UndoBatch {
  label: string
  entries: UndoEntry[]
  coalesceKey?: string
}

/** How many edits undo keeps by default. */
export const DEFAULT_HISTORY_LIMIT = 200

export class UndoManager {
  private undoStack: UndoEntry[] = []
  private redoStack: UndoEntry[] = []
  private batches: UndoBatch[] = []
  private replaying = 0
  private openEdits = 0
  private readonly settlers = new Set<() => void>()
  private readonly limit: number
  private readonly onChange: (() => void) | undefined
  private readonly marks: UndoSourceMarks | undefined

  constructor(options: UndoManagerOptions = {}) {
    this.limit = options.limit ?? DEFAULT_HISTORY_LIMIT
    this.onChange = options.onChange
    this.marks = options.marks
  }

  apply(entry: UndoEntry): void {
    this.execute(entry)
  }

  execute(entry: UndoEntry): void {
    entry.forward()
    this.record(entry)
  }

  push(entry: UndoEntry): void {
    this.record(entry)
  }

  record(entry: UndoEntry): void {
    const marked = this.withSourceMarks(entry)
    const batch = this.currentBatch
    if (batch) {
      batch.entries.push(marked)
      return
    }
    this.pushUndoEntry(marked)
  }

  /**
   * The step's replay writes values without marking them, then the marks the edit added come
   * back on redo and go with it on undo.
   */
  private withSourceMarks(entry: UndoEntry): UndoEntry {
    const marks = this.marks
    if (!marks) return entry
    const taken = marks.take()
    const byNode = new Map<string, string[]>()
    for (const [id, field] of taken) {
      const fields = byNode.get(id)
      if (fields) fields.push(field)
      else byNode.set(id, [field])
    }
    return {
      ...entry,
      forward: () => {
        // Redo repeats the edit, marks its layout adds included, then keeps the marks the step
        // owned even if the replay wrote fewer fields than the edit did.
        entry.forward()
        for (const [id, fields] of byNode) marks.add(id, fields)
      },
      inverse: () => {
        // Undo puts a state back rather than editing, so it marks nothing of its own.
        marks.preserve(() => entry.inverse())
        for (const [id, fields] of byNode) marks.remove(id, fields)
      }
    }
  }

  /**
   * Records an entry as a step of its own, outside the batches being built, such as an agent's
   * edit made while a colour picker is open. Batches settle first, so the step follows the
   * changes they hold so far.
   */
  pushStep(entry: UndoEntry): void {
    this.settle()
    this.pushUndoEntry(entry)
  }

  /**
   * Registers a hook that commits an edit still being coalesced, such as a run of picker changes.
   * Undo and redo run every hook first, so they act on the newest change.
   */
  onBeforeHistory(settle: () => void): () => void {
    this.settlers.add(settle)
    return () => this.settlers.delete(settle)
  }

  private settle() {
    for (const settle of this.settlers) settle()
  }

  undo(): string | null {
    this.settle()
    const entry = this.undoStack.pop()
    if (!entry) return null
    this.replay(() => entry.inverse())
    this.redoStack.push(entry)
    this.onChange?.()
    return entry.label
  }

  redo(): string | null {
    this.settle()
    const entry = this.redoStack.pop()
    if (!entry) return null
    this.replay(() => entry.forward())
    this.undoStack.push(entry)
    this.onChange?.()
    return entry.label
  }

  beginBatch(label: string, coalesceKey?: string): void {
    this.batches.push({ label, entries: [], coalesceKey })
  }

  commitBatch(): void {
    const batch = this.batches.pop()
    if (!batch || batch.entries.length === 0) return

    const entry = this.createBatchEntry(batch)
    const parentBatch = this.currentBatch
    if (parentBatch) parentBatch.entries.push(entry)
    else this.pushUndoEntry(entry)
  }

  runBatch<T>(label: string, fn: () => T, coalesceKey?: string): T {
    this.beginBatch(label, coalesceKey)
    try {
      const result = fn()
      this.commitBatch()
      return result
    } catch (error) {
      this.rollbackBatch()
      throw error
    }
  }

  rollbackBatch(): void {
    const batch = this.batches.pop()
    if (!batch) return
    for (const entry of batch.entries.toReversed()) entry.inverse()
  }

  /** Abandon provisional history without replaying it or changing committed undo/redo entries. */
  discardBatches(): void {
    this.batches = []
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.discardBatches()
    this.marks?.take()
    this.onChange?.()
  }

  /**
   * Takes the committed history out, for the graph it was recorded on, and leaves this one empty;
   * `adoptHistory` puts it back when that graph opens again.
   */
  takeHistory(): UndoHistory {
    const history = { undo: this.undoStack, redo: this.redoStack }
    this.undoStack = []
    this.redoStack = []
    this.discardBatches()
    return history
  }

  /**
   * Adds a step to a history kept aside while another graph is open, and returns it. The step's
   * marks stay in its own graph, which is not the open one, and nothing is announced: the open
   * document's history does not change.
   */
  pushIntoParked(history: UndoHistory, entry: UndoEntry): UndoHistory {
    const undo = [...history.undo, entry]
    const overflow = Number.isFinite(this.limit) && this.limit > 0 ? undo.length - this.limit : 0
    return { undo: overflow > 0 ? undo.slice(overflow) : undo, redo: [] }
  }

  /** Makes `history`, recorded on the graph now open, the committed one. */
  adoptHistory(history: UndoHistory | undefined): void {
    this.undoStack = history ? [...history.undo] : []
    this.redoStack = history ? [...history.redo] : []
    this.discardBatches()
  }

  /** Whether undo or redo is replaying a step, whose changes are history rather than new edits. */
  get isReplaying(): boolean {
    return this.replaying > 0
  }

  /**
   * Adds a change that the newest step caused, as one an editor makes in response to it, so undo
   * and redo apply them together. Inside a batch it joins the batch. False with no step to join,
   * including after an undo, when the newest step is on the redo stack and not applied.
   */
  extendLastStep(entry: UndoEntry): boolean {
    if (this.currentBatch) {
      this.currentBatch.entries.push(entry)
      return true
    }
    const last = this.undoStack.at(-1)
    if (!last || this.redoStack.length > 0) return false
    // The step keeps its identity, so callers that hold it still find it in the history.
    const { forward, inverse } = last
    last.forward = () => {
      forward()
      entry.forward()
    }
    last.inverse = () => {
      entry.inverse()
      inverse()
    }
    return true
  }

  private replay(step: () => void) {
    this.replaying++
    try {
      step()
    } finally {
      this.replaying--
    }
  }

  get isBatching(): boolean {
    return this.batches.length > 0
  }

  /**
   * Marks an edit whose step is recorded when it ends, such as an agent's call that awaits fonts
   * or a layout before it finishes. Returns the function that ends it; ending it twice is a no-op.
   */
  openEdit(): () => void {
    this.openEdits++
    let open = true
    return () => {
      if (!open) return
      open = false
      this.openEdits--
    }
  }

  /**
   * Whether a batch or an edit opened with `openEdit` will record a step for the changes made now,
   * so they are not edits outside the history.
   */
  get isRecording(): boolean {
    return this.isBatching || this.openEdits > 0
  }

  /** Committed history, or changes in an open batch that a settling hook commits first. */
  get canUndo(): boolean {
    if (this.undoStack.length > 0) return true
    return this.settlers.size > 0 && this.batches.some((batch) => batch.entries.length > 0)
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * The entry `depth` steps below the top of the undo stack, so a caller that pushed entries
   * can tell whether they are still the most recent ones.
   */
  peekUndo(depth = 0): UndoEntry | undefined {
    return this.undoStack.at(-1 - depth)
  }

  /** The entry `depth` steps below the top of the redo stack, the next one Redo applies at 0. */
  peekRedo(depth = 0): UndoEntry | undefined {
    return this.redoStack.at(-1 - depth)
  }

  /**
   * Whether `entry` is applied (on the undo stack) or undone (on the redo stack); null once it
   * left the history, trimmed or dropped when an edit cleared Redo.
   */
  stateOf(entry: UndoEntry): 'applied' | 'undone' | null {
    if (this.undoStack.includes(entry)) return 'applied'
    if (this.redoStack.includes(entry)) return 'undone'
    return null
  }

  get undoLabel(): string | null {
    return this.undoStack.at(-1)?.label ?? null
  }

  get redoLabel(): string | null {
    return this.redoStack.at(-1)?.label ?? null
  }

  private get currentBatch(): UndoBatch | null {
    return this.batches.at(-1) ?? null
  }

  private createBatchEntry(batch: UndoBatch): UndoEntry {
    return {
      label: batch.label,
      forward: () => batch.entries.forEach((entry) => entry.forward()),
      inverse: () => batch.entries.toReversed().forEach((entry) => entry.inverse()),
      coalesceKey: batch.coalesceKey
    }
  }

  private pushUndoEntry(entry: UndoEntry): void {
    const previous = this.undoStack.at(-1)
    if (entry.coalesceKey && previous?.coalesceKey === entry.coalesceKey) {
      this.undoStack[this.undoStack.length - 1] = {
        ...entry,
        inverse: previous.inverse
      }
    } else {
      this.undoStack.push(entry)
    }
    this.redoStack = []
    this.trimUndoStack()
    this.onChange?.()
  }

  private trimUndoStack(): void {
    if (!Number.isFinite(this.limit) || this.limit <= 0) return
    const overflow = this.undoStack.length - this.limit
    if (overflow > 0) this.undoStack.splice(0, overflow)
  }
}
