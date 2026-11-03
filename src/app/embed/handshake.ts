import * as v from 'valibot'

import { EMBED_PROTOCOL, EMBED_PROTOCOL_VERSION } from './protocol'
import { embedConnectMessageSchema, type EmbedConnectMessage } from './schema'

/** What the handshake reads of a `message` event. */
export interface EmbedHandshakeEvent {
  data: unknown
  origin: string
  source: unknown
  ports: readonly MessagePort[]
}

export interface EmbedParentWindow {
  postMessage(message: unknown, targetOrigin: string): void
}

/** The embedding window as the handshake needs it, injected so tests need no frames. */
export interface EmbedHandshakeWindow extends EmbedParentWindow {
  /** The page this window is framed in; the window itself when it is not framed. */
  readonly parent: EmbedParentWindow
  addEventListener(type: 'message', listener: (event: EmbedHandshakeEvent) => void): void
  removeEventListener(type: 'message', listener: (event: EmbedHandshakeEvent) => void): void
}

export interface EmbedConnection {
  port: MessagePort
  request: EmbedConnectMessage
}

export interface EmbedHandshake {
  /** Settles with the first accepted connection; never settles if none comes. */
  connection: Promise<EmbedConnection>
  /** Stops listening without accepting anything. */
  cancel: () => void
}

/**
 * Whether a message is the host's `connect`: it comes from the parent frame, from exactly the
 * origin the URL names, is well formed, and carries one port. Anything else is ignored, and a
 * frame that is not the parent cannot connect even from the right origin.
 */
export function acceptsEmbedConnect(
  event: EmbedHandshakeEvent,
  parent: unknown,
  expectedOrigin: string
): EmbedConnection | null {
  if (event.source !== parent || event.origin !== expectedOrigin) return null
  if (event.ports.length !== 1) return null
  const parsed = v.safeParse(embedConnectMessageSchema, event.data)
  if (!parsed.success) return null
  return { port: event.ports[0], request: parsed.output }
}

/**
 * Announces the embed to its parent, addressed only to the expected origin so a page at any other
 * origin never even sees it, then waits for that page's `connect`. One connection is accepted; the
 * listener goes with it, so a later `connect` cannot take the session over.
 */
export function startEmbedHandshake(
  target: EmbedHandshakeWindow,
  expectedOrigin: string
): EmbedHandshake {
  let settle: (connection: EmbedConnection) => void = () => undefined
  const connection = new Promise<EmbedConnection>((resolve) => {
    settle = resolve
  })
  const framed = !Object.is(target.parent, target)
  const parent = target.parent

  function onMessage(event: EmbedHandshakeEvent): void {
    const accepted = acceptsEmbedConnect(event, parent, expectedOrigin)
    if (!accepted) return
    target.removeEventListener('message', onMessage)
    settle(accepted)
  }

  if (framed) {
    target.addEventListener('message', onMessage)
    parent.postMessage(
      { protocol: EMBED_PROTOCOL, type: 'ready', version: EMBED_PROTOCOL_VERSION },
      expectedOrigin
    )
  }

  return {
    connection,
    cancel: () => target.removeEventListener('message', onMessage)
  }
}
