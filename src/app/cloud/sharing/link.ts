import { useLocalStorage } from '@vueuse/core'
import { ref } from 'vue'

import { CloudAPIError, createCloudAPIClient } from '@open-pencil/cloud/client'
import { randomHex } from '@open-pencil/scene-graph/random'

import { useCollabIdentity } from '@/app/collab/identity'
import { downloadCloudDocument } from '@/app/integrations/storage/cloud/download'
import { storageFetch } from '@/app/integrations/storage/s3/fetch'
import { getTabForStore } from '@/app/tabs'
import { IS_BROWSER } from '@/constants'

import { sharedCloudRoomImages } from '../rooms/images'
import {
  cloudRelayTransport,
  leaveRefusedRoom,
  openCloudDocumentRoom,
  stopWithTab
} from '../rooms/live'
import { normalizeCloudServerURL } from '../servers/address'
import { cloudServers } from '../servers/store'
import { cloudFetch, cloudServerFetch, discoverCloudServer } from '../sessions/connection'
import { openSharedFileTab } from './viewers'

/** Who this browser is to rooms it joins from links, kept so a guest stays the same person. */
const guestId = IS_BROWSER
  ? useLocalStorage('open-pencil:cloud-guest-id', randomHex(16))
  : ref(randomHex(16))

export type CloudShareLink = { shareId: string; server: string; secret: string }

/**
 * Opens a document someone shared by link: its latest revision in a tab of its own, then its
 * room with the link's permission. The tab is a copy that never saves to the server; edits and
 * comments reach the document through the room. A snapshot link opens the revision it pins,
 * read-only and without a room. Either tab offers the document as a `.fig` download. Requests
 * carry this app's session with the server when it has one, since a server may let only people
 * signed in to it follow links. Returns `sign-in` when the server asks for that.
 */
export async function openCloudShareLink(link: CloudShareLink): Promise<'opened' | 'sign-in'> {
  const url = normalizeCloudServerURL(link.server)
  if (!url) throw new TypeError('The link names no server')
  const discovery = await discoverCloudServer(url)
  const server = cloudServers.value.find((candidate) => candidate.url === url)
  const client = createCloudAPIClient(discovery.apiURL, {
    fetch: server ? cloudServerFetch(server.id) : cloudFetch
  })
  const input = {
    secret: link.secret,
    guestName: useCollabIdentity().name.value,
    guestId: guestId.value
  }
  let shared: Awaited<ReturnType<typeof client.getSharedDocument>>
  try {
    shared = await client.getSharedDocument(link.shareId, input)
  } catch (error) {
    if (error instanceof CloudAPIError && error.status === 401) return 'sign-in'
    throw error
  }
  const { document, resolution } = shared
  const fetchFile = (download: typeof document) =>
    downloadCloudDocument(download, (input, init) => storageFetch(input, init))
  const bytes = await fetchFile(document)
  const name = document.document.name
  const snapshot = resolution.revisionId !== null
  const store = await openSharedFileTab(bytes, {
    kind: snapshot ? 'snapshot' : 'live',
    permission: resolution.permission,
    name,
    // A snapshot is the file as it was shared; a live link's is the latest the server holds.
    file: snapshot
      ? async () => bytes
      : async () => fetchFile((await client.getSharedDocument(link.shareId, input)).document)
  })
  if (snapshot || !discovery.capabilities.collaboration) return 'opened'
  const first = await client.getSharedCollaborationTicket(link.shareId, input)
  // The tab may have closed while the ticket was on its way.
  if (first.provider !== 'relay' || !first.serverURL || !getTabForStore(store)) return 'opened'
  const room = openCloudDocumentRoom(store, {
    roomId: first.roomId,
    transport: cloudRelayTransport(
      first.serverURL,
      first,
      () => client.getSharedCollaborationTicket(link.shareId, input),
      // A guest has no account to save with, so leaving is all a refusal changes.
      { onRefused: () => leaveRefusedRoom(store, { permission: first.permission, canSave: false }) }
    ),
    permission: first.permission,
    guest: true,
    images: sharedCloudRoomImages(client, link.shareId, input)
  })
  stopWithTab(store, room)
  return 'opened'
}
