/**
 * Vertex AI endpoints. A connection keeps the base URL of its project and location,
 * `https://<host>/v1/projects/<project>/locations/<location>`, or Vertex AI express mode's
 * `https://aiplatform.googleapis.com/v1` when it has no project, which only API keys and Gemini
 * models use.
 */

export type VertexTarget = { project: string; location: string }

/** Locations offered in settings; global and the multi-regions route Claude's newest models. */
export const VERTEX_LOCATIONS = [
  'global',
  'us',
  'eu',
  'us-central1',
  'us-east1',
  'us-east4',
  'us-east5',
  'us-south1',
  'us-west1',
  'us-west4',
  'northamerica-northeast1',
  'southamerica-east1',
  'europe-west1',
  'europe-west2',
  'europe-west3',
  'europe-west4',
  'europe-west9',
  'europe-north1',
  'europe-southwest1',
  'me-central2',
  'asia-east1',
  'asia-northeast1',
  'asia-northeast3',
  'asia-south1',
  'asia-southeast1',
  'australia-southeast1'
] as const

export const DEFAULT_VERTEX_LOCATION = 'global'

const EXPRESS_BASE_URL = 'https://aiplatform.googleapis.com/v1'
const LOCATION_PATTERN = /^[a-z]+(?:-[a-z]+\d+)?$/
// Project IDs, including legacy domain-scoped ones such as `example.com:project`; every
// character it allows is safe in a URL path as it is.
const PROJECT_PATTERN = /^[a-z0-9][a-z0-9.:-]{0,62}$/
const PATH_PATTERN = /^\/v1\/projects\/([^/]+)\/locations\/([^/]+)\/?$/

export function isVertexLocation(location: string): boolean {
  return LOCATION_PATTERN.test(location)
}

export function isVertexProject(project: string): boolean {
  return PROJECT_PATTERN.test(project)
}

function vertexHost(location: string): string {
  if (location === 'global') return 'aiplatform.googleapis.com'
  if (location === 'us' || location === 'eu') return `aiplatform.${location}.rep.googleapis.com`
  return `${location}-aiplatform.googleapis.com`
}

/** The base URL a connection stores; without a valid project it is express mode's. */
export function vertexBaseURL(target: VertexTarget): string {
  const project = target.project.trim()
  if (!isVertexProject(project)) return EXPRESS_BASE_URL
  const location = isVertexLocation(target.location) ? target.location : DEFAULT_VERTEX_LOCATION
  return `https://${vertexHost(location)}/v1/projects/${project}/locations/${location}`
}

/** The project and location of a stored base URL; express mode and foreign URLs have no project. */
export function parseVertexBaseURL(baseURL: string): VertexTarget {
  const fallback = { project: '', location: DEFAULT_VERTEX_LOCATION }
  if (!baseURL.trim()) return fallback
  try {
    const url = new URL(baseURL.trim())
    const match = PATH_PATTERN.exec(url.pathname)
    if (!match) return fallback
    const [, project, location] = match
    if (!isVertexProject(project) || !isVertexLocation(location)) return fallback
    if (url.host !== vertexHost(location)) return fallback
    return { project, location }
  } catch {
    return fallback
  }
}
