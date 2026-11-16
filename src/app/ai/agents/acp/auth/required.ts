/**
 * A coding agent that would not open a session for want of a sign-in, which ACP reports as
 * `auth_required`. The chat names the agent's sign-in instead of a failed request.
 */
export class AgentSignInRequiredError extends Error {
  /**
   * `unconfigured` is an agent that brings its own credentials and found nothing to use, such as
   * omp without a provider: it has no sign-in for Pairdraw to point at.
   */
  readonly unconfigured: boolean

  constructor(message: string, unconfigured = false) {
    super(message)
    this.name = 'AgentSignInRequiredError'
    this.unconfigured = unconfigured
  }
}
