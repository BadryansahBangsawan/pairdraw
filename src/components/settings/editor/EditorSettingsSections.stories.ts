import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import { onUnmounted, toRaw } from 'vue'

import {
  appPreferences,
  updateNavigationPreferences,
  updateNudgePreferences,
  updateRenderingPreferences,
  updateSnappingPreferences,
  updateViewPreferences
} from '@/app/settings/preferences/store'

import NavigationSettingsSection from './NavigationSettingsSection.vue'
import NudgeSettingsSection from './NudgeSettingsSection.vue'
import RenderingSettingsSection from './RenderingSettingsSection.vue'
import SnappingSettingsSection from './SnappingSettingsSection.vue'

type Args = { customized: boolean }

/** Changes the stored preferences for one story and puts them back when it closes. */
function usePreferencesFor(customized: boolean) {
  const saved = structuredClone(toRaw(appPreferences.value))
  onUnmounted(() => {
    appPreferences.value = saved
  })
  if (!customized) return
  updateSnappingPreferences({ halfPixel: true })
  updateViewPreferences({ pixelGrid: false })
  updateNudgePreferences({ small: 0.5, large: 8 })
  updateNavigationPreferences({ wheelZoom: true, invertZoom: true })
  updateRenderingPreferences({ ultralight: true })
}

const meta = {
  title: 'App/Settings/Editor Sections',
  args: { customized: false },
  render: (args) => ({
    components: {
      NavigationSettingsSection,
      NudgeSettingsSection,
      RenderingSettingsSection,
      SnappingSettingsSection
    },
    setup: () => usePreferencesFor(args.customized),
    template: `
      <div class="flex max-w-2xl flex-col gap-6 bg-panel p-4">
        <SnappingSettingsSection />
        <NudgeSettingsSection />
        <NavigationSettingsSection />
        <RenderingSettingsSection />
      </div>
    `
  })
} satisfies Meta<Args>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Half pixels, custom nudges, wheel zoom inverted, and Ultralight waiting for a reload. */
export const Customized: Story = { args: { customized: true } }

/** A nudge between whole pixels and off the presets, as CLI or MCP may store, stays valid. */
export const FractionalNudge: Story = {
  render: () => ({
    components: { NudgeSettingsSection },
    setup: () => {
      usePreferencesFor(false)
      updateNudgePreferences({ small: 0.25, large: 1.5 })
    },
    template: `
      <div class="flex max-w-2xl flex-col gap-6 bg-panel p-4">
        <NudgeSettingsSection />
      </div>
    `
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const small = canvas.getByRole('spinbutton', { name: 'Small nudge: Custom…' })
    await expect(small).toHaveValue(0.25)
    await userEvent.click(small)
    await userEvent.tab()
    await expect(canvas.queryByRole('alert')).toBeNull()
    await userEvent.clear(small)
    await userEvent.type(small, '0.75')
    await userEvent.tab()
    await expect(canvas.queryByRole('alert')).toBeNull()
    await expect(appPreferences.value.editing.nudge.small).toBe(0.75)
  }
}

export const TurningOnWheelZoom: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const wheelZoom = canvas.getByRole('switch', { name: 'Zoom with scroll wheel' })
    await expect(wheelZoom).not.toBeChecked()
    await userEvent.click(wheelZoom)
    await expect(wheelZoom).toBeChecked()
    const row = wheelZoom.closest('[data-slot="settings-row"]')
    if (!(row instanceof HTMLElement)) throw new Error('expected the switch in a settings row')
    await expect(within(row).getByRole('button', { name: 'Reset to default' })).toBeVisible()
  }
}

/** Ultralight renders in tiles, so Progressive rendering shows on and cannot be turned off. */
export const UltralightIncludesProgressiveRendering: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const progressive = canvas.getByRole('switch', { name: 'Progressive rendering' })
    await expect(progressive).toBeEnabled()
    await userEvent.click(canvas.getByRole('switch', { name: 'Ultralight mode' }))
    await expect(progressive).toBeChecked()
    await expect(progressive).toBeDisabled()
    await expect(canvas.getByText('Always on while Ultralight mode is on.')).toBeVisible()
  }
}
