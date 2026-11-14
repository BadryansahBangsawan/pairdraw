<script setup lang="ts">
import { tv } from 'tailwind-variants'

import { useI18n } from '@pairdraw/vue/i18n'

import {
  setUsageStatsConsent,
  usageStatsConsent,
  type UsageStatsPromptSource
} from '@/app/telemetry'
import ExternalLink from '@/components/links/ExternalLink.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import { PRIVACY_URL } from '@/constants'
import theme from '@/theme/sharing/question'

const { source, headingId } = defineProps<{
  /** Where the question was asked, which the answer reports. */
  source: UsageStatsPromptSource
  headingId?: string
}>()
const { diagnostics } = useI18n()
const styles = tv(theme)()
</script>

<template>
  <section :class="styles.root()" data-test-id="usage-stats-question">
    <h3 :id="headingId" :class="styles.heading()">{{ diagnostics.sharingQuestionTitle }}</h3>
    <p :class="styles.text()">{{ diagnostics.sharingQuestionDescription }}</p>
    <ExternalLink :href="PRIVACY_URL" :ui="{ base: 'text-[11px]' }">{{
      diagnostics.sharingDetails
    }}</ExternalLink>
    <p v-if="usageStatsConsent !== 'unset'" :class="styles.answer()" role="status">
      {{
        usageStatsConsent === 'granted'
          ? diagnostics.sharingQuestionAccepted
          : diagnostics.sharingQuestionDeclined
      }}
    </p>
    <div v-else :class="styles.actions()">
      <AppButton variant="outline" @click="setUsageStatsConsent(false, source)">
        {{ diagnostics.sharingQuestionDecline }}
      </AppButton>
      <AppButton color="primary" variant="solid" @click="setUsageStatsConsent(true, source)">
        {{ diagnostics.sharingQuestionAccept }}
      </AppButton>
    </div>
  </section>
</template>
