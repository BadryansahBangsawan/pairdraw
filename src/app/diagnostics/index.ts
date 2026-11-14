export {
  recordACPTransportFailure,
  recordChatCompleted,
  recordDocumentFailure,
  recordMCPConnectionFailure,
  recordModelStepCompleted,
  recordPreparationOutcome,
  recordRuntimeError,
  recordStorageFailure,
  storageOperationForJob
} from './events'
export { describeDiagnosticError, diagnosticErrorDetails } from './error'
export { summarizeDiagnosticEvent } from './summary'
export type { DiagnosticEventSummary } from './summary'
export { diagnostics } from './recorder'

export type { DiagnosticCategory, DiagnosticEvent } from './types'
