/**
 * AWS Signature Version 4 for one request, with Web Crypto, so the browser and the desktop app
 * sign alike: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv-create-signed-request.html
 */

export type AWSCredentials = {
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
}

export type SigV4Request = {
  method: string
  url: URL
  /** Headers to sign besides `host` and the `x-amz-*` ones the signer adds. */
  headers: Headers
  body: string
}

export type SigV4Scope = {
  region: string
  service: string
  credentials: AWSCredentials
  /** The signing time; tests pin it. */
  now?: Date
}

const ALGORITHM = 'AWS4-HMAC-SHA256'
const encoder = new TextEncoder()

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(text: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(text)))
}

async function hmac(key: BufferSource, text: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(text))
}

/** RFC 3986 encoding, which AWS requires and `encodeURIComponent` falls short of. */
function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

/** Each path segment encoded again, as every service except S3 expects. */
function canonicalPath(url: URL): string {
  const path = url.pathname || '/'
  return path
    .split('/')
    .map((segment) => uriEncode(segment))
    .join('/')
}

function byCodePoint(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

/** Parameters sorted by code point, by name and then by value. */
function canonicalQuery(url: URL): string {
  return Array.from(url.searchParams.entries())
    .map(([key, value]) => [uriEncode(key), uriEncode(value)] as const)
    .sort(
      ([leftKey, leftValue], [rightKey, rightValue]) =>
        byCodePoint(leftKey, rightKey) || byCodePoint(leftValue, rightValue)
    )
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
}

/** `20150830T123600Z`, the basic ISO 8601 form SigV4 uses. */
export function amzDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
}

/**
 * The headers that sign `request`: `x-amz-date`, `x-amz-security-token` for temporary
 * credentials, and `authorization`. `host` is signed but not returned, since fetch sets it.
 */
export async function signRequest(
  request: SigV4Request,
  scope: SigV4Scope
): Promise<Record<string, string>> {
  const timestamp = amzDate(scope.now ?? new Date())
  const day = timestamp.slice(0, 8)
  const added: Record<string, string> = { 'x-amz-date': timestamp }
  if (scope.credentials.sessionToken) {
    added['x-amz-security-token'] = scope.credentials.sessionToken
  }

  const signed = new Map<string, string>([['host', request.url.host]])
  request.headers.forEach((value, name) => signed.set(name.toLowerCase(), value))
  for (const [name, value] of Object.entries(added)) signed.set(name, value)
  const names = Array.from(signed.keys()).sort()
  const canonicalHeaders = names
    .map((name) => `${name}:${(signed.get(name) ?? '').trim().replace(/\s+/g, ' ')}\n`)
    .join('')
  const signedHeaders = names.join(';')

  const canonicalRequest = [
    request.method.toUpperCase(),
    canonicalPath(request.url),
    canonicalQuery(request.url),
    canonicalHeaders,
    signedHeaders,
    await sha256Hex(request.body)
  ].join('\n')
  const credentialScope = `${day}/${scope.region}/${scope.service}/aws4_request`
  const stringToSign = [
    ALGORITHM,
    timestamp,
    credentialScope,
    await sha256Hex(canonicalRequest)
  ].join('\n')

  const dateKey = await hmac(encoder.encode(`AWS4${scope.credentials.secretAccessKey}`), day)
  const regionKey = await hmac(dateKey, scope.region)
  const serviceKey = await hmac(regionKey, scope.service)
  const signingKey = await hmac(serviceKey, 'aws4_request')
  const signature = hex(await hmac(signingKey, stringToSign))

  return {
    ...added,
    authorization: `${ALGORITHM} Credential=${scope.credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  }
}
