import { expect, test } from '@playwright/test'

import {
  collaborationErrors,
  connect,
  share,
  createPeer,
  startRelay,
  type Peer
} from '#tests/helpers/collab/room'

function viewport(peer: Peer) {
  return peer.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const { panX, panY, zoom } = store.state
    return { panX, panY, zoom }
  })
}

/**
 * Puts the view at a zoom of its own and lets a pointer move carry it to the room. A document
 * that is still loading replaces the store with its own, so this keeps setting the zoom.
 */
async function viewAt(peer: Peer, zoom: number) {
  let step = 0
  await expect
    .poll(async () => {
      step += 1
      await peer.page.evaluate((level: number) => {
        const store = window.pairdraw?.getStore?.()
        if (!store) throw new Error('Pairdraw store not initialized')
        store.centerOn(300, 200, level)
      }, zoom)
      await peer.page.mouse.move(600 + step, 380 + step)
      return (await viewport(peer)).zoom
    })
    .toBe(zoom)
}

async function followGuest(host: Peer) {
  await host.page.getByTestId('collab-peer-avatar').hover()
  const card = host.page.getByTestId('collab-peer-card')
  await card.getByRole('button', { name: 'Follow Guest' }).click()
}

/**
 * Follows the guest and waits for the view to reach their zoom. Awareness arrives with the next
 * pointer move, and a document that finishes loading replaces the guest's store with its own, so
 * each attempt holds their zoom and moves the pointer again until the follow lands.
 */
async function followAndReach(host: Peer, guest: Peer, zoom: number) {
  await followGuest(host)
  let step = 0
  await expect
    .poll(
      async () => {
        step += 1
        await guest.page.evaluate((level: number) => {
          const store = window.pairdraw?.getStore?.()
          if (!store) throw new Error('Pairdraw store not initialized')
          store.centerOn(300, 200, level)
        }, zoom)
        await guest.page.mouse.move(660 + step, 420 + step)
        return (await viewport(host)).zoom
      },
      { timeout: 20_000 }
    )
    .toBe(zoom)
}

test('stopping following gives the canvas back at the view it had', async ({ browser }) => {
  test.setTimeout(120_000)
  const relay = await startRelay()
  let hostToClose: Peer | null = null
  let guestToClose: Peer | null = null
  try {
    const host = await createPeer(browser, 'Host', relay.url)
    hostToClose = host
    const guest = await createPeer(browser, 'Guest', relay.url)
    guestToClose = guest
    await share(host)
    await connect(guest)
    await expect
      .poll(() => host.page.evaluate(() => window.pairdraw?.test?.collab?.peerCount()))
      .toBe(1)

    await viewAt(guest, 2.5)
    const before = await viewport(host)
    expect(before.zoom).not.toBe(2.5)

    const frame = host.page.getByTestId('follow-frame')
    await followAndReach(host, guest, 2.5)
    await expect(frame).toContainText('Following Guest')

    await frame.getByTestId('follow-stop').click()
    await expect(frame).toHaveCount(0)
    await expect.poll(() => viewport(host)).toEqual(before)

    // Following again and clicking the canvas keeps the view where the click landed.
    await followAndReach(host, guest, 2.5)
    await host.canvas.click(400, 300)
    await expect(frame).toHaveCount(0)
    expect(await viewport(host)).toMatchObject({ zoom: 2.5 })

    // A person who leaves mid-follow gives the canvas back at the view you had.
    await host.page.evaluate(() => {
      const store = window.pairdraw?.getStore?.()
      if (!store) throw new Error('Pairdraw store not initialized')
      store.centerOn(500, 400, 1.25)
    })
    const held = await viewport(host)
    await followAndReach(host, guest, 2.5)
    await guest.context.close()
    await expect(frame).toHaveCount(0)
    await expect.poll(() => viewport(host)).toEqual(held)
    expect(collaborationErrors(host)).toEqual([])
  } finally {
    await hostToClose?.context.close()
    await guestToClose?.context.close()
    await relay.close()
  }
})
