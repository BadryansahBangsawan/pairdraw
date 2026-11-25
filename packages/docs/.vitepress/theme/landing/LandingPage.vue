<script setup lang="ts">
import { provideLandingMessages, type LandingMessages } from './content/messages'
import { useVisitorSystem } from './download/visitor'
import AgentsSection from './sections/AgentsSection.vue'
import ClosingSection from './sections/ClosingSection.vue'
import FaqSection from './sections/FaqSection.vue'
import FeaturesSection from './sections/FeaturesSection.vue'
import HeroSection from './sections/HeroSection.vue'
import HowItWorksSection from './sections/HowItWorksSection.vue'
import PrivacySection from './sections/PrivacySection.vue'
import ScriptingSection from './sections/ScriptingSection.vue'
import SiteFooter from './sections/SiteFooter.vue'
import SiteToolbar from './sections/SiteToolbar.vue'
import { provideDownloadDialog } from './ui/download-dialog'
import DownloadDialog from './ui/DownloadDialog.vue'
import { useDrawOnce } from './ui/useDrawOnce'

import '@fontsource-variable/bricolage-grotesque/opsz.css'
import '@fontsource-variable/geist-mono/wght.css'
import './landing.css'

/**
 * The landing page, drawn as frames on Pairdraw's own canvas. Its toolbar stands in for the docs
 * navigation, which the locale's `index.md` turns off.
 */
const { messages } = defineProps<{ messages: LandingMessages }>()
provideLandingMessages(messages)
const downloads = provideDownloadDialog()
const system = useVisitorSystem()

useDrawOnce()
</script>

<template>
  <div class="landing-home">
    <SiteToolbar />
    <main>
      <HeroSection :system="system" />
      <HowItWorksSection />
      <FeaturesSection />
      <AgentsSection />
      <ScriptingSection />
      <PrivacySection />
      <FaqSection />
      <ClosingSection :system="system" />
    </main>
    <SiteFooter />
    <DownloadDialog v-model:open="downloads" :system="system" />
  </div>
</template>
