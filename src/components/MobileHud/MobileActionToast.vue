<script setup lang="ts">
import { tv } from 'tailwind-variants'

import { useMobileHudContext } from '@/components/MobileHud/context'
import indicatorsTheme from '@/theme/mobile/indicators'
import { feedbackTransition } from '@/theme/motion/styles'

const hud = useMobileHudContext()
const styles = tv(indicatorsTheme)()
</script>

<template>
  <Transition v-bind="feedbackTransition">
    <div v-if="hud.actionToast" :key="hud.actionToast" :class="styles.toast()">
      {{ hud.actionToast }}
    </div>
  </Transition>
</template>
