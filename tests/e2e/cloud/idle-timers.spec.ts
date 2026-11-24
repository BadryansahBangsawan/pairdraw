import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

test.setTimeout(60_000)

/**
 * Records, as text in the document element, every `setInterval` arm with the stack that armed it.
 * The dataset keeps the injected function self-contained and needs no shared storage module.
 */
function recordIntervalArms() {
  const append = (line: string) => {
    const root = document.documentElement
    root.dataset.timerArms = root.dataset.timerArms ? `${root.dataset.timerArms}\n${line}` : line
  }
  const setInterval = window.setInterval.bind(window)
  window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    const stack = (new Error('record a timer arm').stack ?? '').split('\n').slice(1, 12).join(' | ')
    append(`${String(timeout)} ${stack}`)
    return setInterval(handler, timeout, ...args)
  }) as typeof window.setInterval
}

test('the always-mounted cloud hosts arm no clock while idle', async ({ page }) => {
  await page.addInitScript(recordIntervalArms)
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  // The hosts mount with the shell; a gated clock reads the time once, without arming a timer.
  await page.waitForTimeout(1000)

  const arms = await page.evaluate(() => document.documentElement.dataset.timerArms ?? '')
  const cloud = arms.split('\n').filter((line) => /Cloud(Connect|Invitation)Host\.vue/.test(line))
  expect(cloud).toEqual([])
  canvas.assertNoErrors()
})
