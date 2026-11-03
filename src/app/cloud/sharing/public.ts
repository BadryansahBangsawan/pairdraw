import { CloudAPIError, createCloudAPIClient } from '@open-pencil/cloud/client'
import { parseCloudLinkPath, type DocumentDownload } from '@open-pencil/cloud/contract'
import { cloudMessages } from '@open-pencil/vue/i18n'

import { downloadCloudDocument } from '@/app/integrations/storage/cloud/download'
import { storageFetch } from '@/app/integrations/storage/s3/fetch'
import { toast } from '@/app/shell/ui'

import { normalizeCloudServerURL } from '../servers/address'
import { cloudFetch, discoverCloudServer } from '../sessions/connection'
import { openSharedFileTab } from './viewers'

/** A document a public profile lists, `/view/:id`, on the server whose address it is. */
export type CloudPublicLink = { documentId: string; server: string }

/** The public document a web address names, if it is one; its server is the address's own. */
export function readCloudPublicLink(url: URL): CloudPublicLink | null {
  const path = parseCloudLinkPath(url.pathname)
  return path?.kind === 'view' ? { documentId: path.id, server: url.origin } : null
}

/**
 * Opens a public document read-only in a tab of its own, which never saves and offers the
 * document as a `.fig` download. Anyone may open it, signed in or not; a document that is no
 * longer public says so, and one that cannot be reached asks to try again.
 */
export async function openCloudPublicLink(link: CloudPublicLink): Promise<void> {
  try {
    const url = normalizeCloudServerURL(link.server)
    if (!url) throw new TypeError('The link names no server')
    const discovery = await discoverCloudServer(url)
    const client = createCloudAPIClient(discovery.apiURL, { fetch: cloudFetch })
    const bytesOf = (download: DocumentDownload) =>
      downloadCloudDocument(download, (input, init) => storageFetch(input, init))
    const download = await client.getPublicDocument(link.documentId)
    await openSharedFileTab(await bytesOf(download), {
      kind: 'public',
      permission: 'view',
      name: download.document.name,
      // The download is the document as its server holds it then.
      file: async () => bytesOf(await client.getPublicDocument(link.documentId))
    })
  } catch (error) {
    // Only the server saying there is no such public file means it went private; anything else,
    // such as being offline, is a connection to try again.
    const gone = error instanceof CloudAPIError && error.status === 404
    const messages = cloudMessages.get()
    toast.error(gone ? messages.publicDocumentFailed : messages.publicDocumentUnreachable)
  }
}
