<script setup lang="ts">
import { tv } from 'tailwind-variants'

import { useMobileHudContext } from '@/components/MobileHud/context'
import indicatorsTheme from '@/theme/mobile/indicators'
import { feedbackTransition } from '@/theme/motion/styles'

const hud = useMobileHudContext()
const styles = tv(indicatorsTheme)()
</script>

<template>
  <div :class="styles.toolBadge()">
    <Transition mode="out-in" v-bind="feedbackTransition">
      <component
        :is="hud.activeToolIcon"
        :key="hud.store.state.activeTool"
        :class="styles.toolIcon()"
      />
    </Transition>
  </div>
</template>
