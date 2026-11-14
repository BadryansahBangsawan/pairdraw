import { getCanvasKit } from '@pairdraw/core/canvaskit'
import { preprocessForVectorize } from '@pairdraw/core/vector'

import type { EditorStore } from '@/app/editor/active-store'

import { resolveVectorizeCredential } from './credentials'
import { vectorizeProviderID } from './preferences'
import { getVectorizeProvider } from './providers'
import type { VectorizeProvider } from './types'

/** The vectorize service chosen in Settings. */
export function selectedVectorizeProvider(): VectorizeProvider {
  return getVectorizeProvider(vectorizeProviderID.value)
}

/** The SVG a service made of an image, or that it has no key to be asked with. */
type VectorSVGResult = { status: 'svg'; svg: string } | { status: 'missing-key' }

/**
 * Asks `provider` for the SVG of an image with the key saved for it; `onRequest` runs once the
 * key is found, as the request starts. Rejects when the image cannot be prepared or the service
 * fails, with `VectorizeAuthError` when it refuses the key.
 */
export async function requestVectorSVG(
  store: EditorStore,
  provider: VectorizeProvider,
  imageBytes: Uint8Array,
  onRequest?: () => void
): Promise<VectorSVGResult> {
  const apiKey = await resolveVectorizeCredential(provider.id)
  if (!apiKey) return { status: 'missing-key' }

  onRequest?.()
  // A document whose canvas never mounted, such as one an agent opened, has no renderer of its own.
  const ck = store.renderer?.ck ?? (await getCanvasKit().catch(() => null))
  const preprocessed = preprocessForVectorize(imageBytes, () => ck)
  if (!preprocessed) throw new Error('Could not prepare this image for vectorization')
  return { status: 'svg', svg: await provider.vectorize(preprocessed.pngBytes, apiKey) }
}
