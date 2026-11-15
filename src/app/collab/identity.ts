import { createGlobalState, useLocalStorage } from '@vueuse/core'
import { computed } from 'vue'

import type { Color } from '@pairdraw/scene-graph/primitives'
import { randomIndex } from '@pairdraw/scene-graph/random'

import { generateGuestName } from '@/app/collab/guest-name'
import { migrateRenamedSettingKey, type RenamedSettingKey } from '@/app/settings/renamed-keys'
import { PEER_COLORS } from '@/constants'

const COLLAB_NAME_STORAGE_KEY = 'pairdraw:collab-name'

/** Pairdraw 0.16 stored the name under the key it inherited from OpenPencil. */
export const COLLAB_NAME_KEY_RENAME: RenamedSettingKey = {
  from: 'op-collab-name',
  to: COLLAB_NAME_STORAGE_KEY,
  read: (stored) => stored.trim() || null
}

/**
 * Who this person is in every room: one name for the whole app, kept across sessions, and one
 * color for this session. Until they set a name they join as a generated one, such as
 * "Teal Fox", so a room opens without asking first.
 */
export const useCollabIdentity = createGlobalState(() => {
  migrateRenamedSettingKey(COLLAB_NAME_KEY_RENAME)
  const storedName = useLocalStorage(COLLAB_NAME_STORAGE_KEY, '')
  const guestName = generateGuestName()
  const color: Color = PEER_COLORS[randomIndex(PEER_COLORS.length)] ?? PEER_COLORS[0]
  const name = computed(() => storedName.value.trim() || guestName)
  const hasChosenName = computed(() => storedName.value.trim().length > 0)

  function setName(next: string) {
    storedName.value = next.trim()
  }

  return { name, color, hasChosenName, setName }
})
