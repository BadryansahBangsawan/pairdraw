<script setup lang="ts">
import { computed } from 'vue'

import { isCloudBinding } from '@/app/cloud/integration'
import { useEditorStore } from '@/app/editor/active-store'
import { CloudShareButton } from '@/components/cloud/integration'
import CollabAvatarStack from '@/components/collab-panel/CollabAvatarStack.vue'
import CollabSharePopover from '@/components/collab-panel/CollabSharePopover.vue'
import { provideCollabPanel } from '@/components/collab-panel/context'
import VoiceCallControl from '@/components/voice-call/VoiceCallControl.vue'

/**
 * Who is in the document, its call, and Share, which comes last. The slot goes between them, so
 * the top bar can put the document's other controls before Share.
 */
const collab = provideCollabPanel()
const store = useEditorStore()
// Cloud documents share through their server; everything else through a peer-to-peer room.
const cloud = computed(() => isCloudBinding(store.getStorageBinding()))
</script>

<template>
  <div class="flex items-center gap-1.5">
    <CollabAvatarStack />
    <VoiceCallControl v-if="collab.state.inRoom" :people="collab.callRows" />
    <slot />
    <CloudShareButton v-if="cloud" />
    <CollabSharePopover v-else />
  </div>
</template>
