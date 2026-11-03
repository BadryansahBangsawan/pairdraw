/**
 * A Vertex AI connection's credential: an OAuth access token, such as the one
 * `gcloud auth print-access-token` prints, or an API key. Google's access tokens start with
 * `ya29.`; anything else is sent as an API key.
 */
export type VertexCredential =
  | { kind: 'access-token'; token: string }
  | { kind: 'api-key'; key: string }

const ACCESS_TOKEN_PREFIX = 'ya29.'

export function parseVertexCredential(text: string): VertexCredential {
  const value = text.trim().replace(/^bearer\s+/i, '')
  return value.startsWith(ACCESS_TOKEN_PREFIX)
    ? { kind: 'access-token', token: value }
    : { kind: 'api-key', key: value }
}

/** The request headers that carry the credential. */
export function vertexAuthHeaders(credential: VertexCredential): Record<string, string> {
  return credential.kind === 'access-token'
    ? { authorization: `Bearer ${credential.token}` }
    : { 'x-goog-api-key': credential.key }
}
