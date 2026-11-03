export class InvitationDeliveryError extends Error {
  override readonly name = 'InvitationDeliveryError'
}

export class DocumentShareInvalidError extends Error {
  override readonly name = 'DocumentShareInvalidError'
}

/** A valid link this server opens only for people signed in to it. */
export class DocumentShareSignInRequiredError extends Error {
  override readonly name = 'DocumentShareSignInRequiredError'
}

/**
 * A change a link's kind does not allow: a snapshot link stays view-only, and a live link has no
 * revision to pin. Also a snapshot of a revision the document does not have, or of no revision.
 */
export class DocumentShareKindError extends Error {
  override readonly name = 'DocumentShareKindError'
}
