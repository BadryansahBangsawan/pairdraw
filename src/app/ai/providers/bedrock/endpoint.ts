/**
 * Claude in Amazon Bedrock serves the Messages API at
 * `https://bedrock-mantle.<region>.api.aws/anthropic/v1/messages`. A connection keeps that base
 * URL, which is how its region is stored.
 */

/** Regions where Claude in Amazon Bedrock is offered. */
export const BEDROCK_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'ca-west-1',
  'sa-east-1',
  'eu-central-1',
  'eu-central-2',
  'eu-north-1',
  'eu-south-1',
  'eu-south-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'il-central-1',
  'me-central-1',
  'af-south-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-south-1',
  'ap-south-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-southeast-3',
  'ap-southeast-4'
] as const

export const DEFAULT_BEDROCK_REGION = 'us-east-1'

/** The SigV4 service name of the Messages endpoint. */
export const BEDROCK_SIGNING_SERVICE = 'bedrock-mantle'

const REGION_PATTERN = /^[a-z]{2}(?:-[a-z]+)+-\d{1,2}$/
const HOST_PATTERN = /^bedrock-mantle\.([a-z0-9-]+)\.api\.aws$/

function isBedrockRegion(region: string): boolean {
  return REGION_PATTERN.test(region)
}

/** The base URL a connection stores for `region`; an invalid region falls back to the default. */
export function bedrockBaseURL(region: string): string {
  const valid = isBedrockRegion(region) ? region : DEFAULT_BEDROCK_REGION
  return `https://bedrock-mantle.${valid}.api.aws/anthropic`
}

/**
 * The base URL a connection keeps for `region`. The default region is kept as `''`, which is
 * what a new connection starts with, so each region has exactly one stored form and two models
 * in one region share their connection and its credential.
 */
export function bedrockConnectionBaseURL(region: string): string {
  return isBedrockRegion(region) && region !== DEFAULT_BEDROCK_REGION ? bedrockBaseURL(region) : ''
}

/** The region of a stored base URL, or the default for an empty or foreign one. */
export function bedrockRegion(baseURL: string): string {
  if (!baseURL.trim()) return DEFAULT_BEDROCK_REGION
  try {
    const region = HOST_PATTERN.exec(new URL(baseURL.trim()).host)?.[1]
    return region && isBedrockRegion(region) ? region : DEFAULT_BEDROCK_REGION
  } catch {
    return DEFAULT_BEDROCK_REGION
  }
}
