import * as v from 'valibot'

import type { AWSCredentials } from './sigv4'

/**
 * A Bedrock connection's credential slot holds either a Bedrock API key, sent as `x-api-key`, or
 * AWS access keys as JSON, which sign each request with SigV4.
 */
const awsCredentialsSchema = v.object({
  accessKeyId: v.pipe(v.string(), v.trim(), v.minLength(1)),
  secretAccessKey: v.pipe(v.string(), v.trim(), v.minLength(1)),
  sessionToken: v.optional(v.pipe(v.string(), v.trim()))
})

export type BedrockCredential =
  | { kind: 'api-key'; apiKey: string }
  | { kind: 'aws'; credentials: AWSCredentials }

export type BedrockAuthKind = BedrockCredential['kind']

export function parseBedrockCredential(text: string): BedrockCredential {
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), awsCredentialsSchema), text)
  if (!parsed.success) return { kind: 'api-key', apiKey: text.trim() }
  const { accessKeyId, secretAccessKey, sessionToken } = parsed.output
  return {
    kind: 'aws',
    credentials: sessionToken
      ? { accessKeyId, secretAccessKey, sessionToken }
      : { accessKeyId, secretAccessKey }
  }
}

/** The credential text for AWS access keys, or empty while a required part is missing. */
export function serializeAWSCredentials(credentials: AWSCredentials): string {
  const accessKeyId = credentials.accessKeyId.trim()
  const secretAccessKey = credentials.secretAccessKey.trim()
  if (!accessKeyId || !secretAccessKey) return ''
  const sessionToken = credentials.sessionToken?.trim()
  return JSON.stringify(
    sessionToken ? { accessKeyId, secretAccessKey, sessionToken } : { accessKeyId, secretAccessKey }
  )
}
