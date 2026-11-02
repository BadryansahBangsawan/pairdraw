/**
 * A coding agent that would not open a session because nobody is signed in to it, which ACP
 * reports as `auth_required`. The chat names the agent's sign-in instead of a failed request.
 */
export class AgentSignInRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AgentSignInRequiredError'
  }
}
