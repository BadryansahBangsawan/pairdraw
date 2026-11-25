<script setup lang="ts">
import { withBase } from 'vitepress'
import IconDownload from '~icons/lucide/download'
import IconGithub from '~icons/simple-icons/github'

import { LINKS } from '../content/links'
import { useLandingMessages, useLocalePath } from '../content/messages'
import LandingButton from '../ui/LandingButton.vue'

/** The page's own toolbar, drawn as the editor's: it stays at the top while the page scrolls. */
const messages = useLandingMessages()
const localePath = useLocalePath()

const SECTIONS = ['how', 'features', 'agents', 'scripting', 'faq'] as const
const LABELS = {
  how: 'howItWorks',
  features: 'features',
  agents: 'agents',
  scripting: 'scripting',
  faq: 'faq'
} as const
</script>

<template>
  <header class="toolbar lp-column">
    <a href="#top" class="brand" :aria-label="messages.nav.home">
      <img :src="withBase('/brand/mark.svg')" alt="" width="32" height="32" />
      <span>Pairdraw</span>
    </a>
    <nav :aria-label="messages.nav.label" class="sections">
      <a v-for="id in SECTIONS" :key="id" :href="`#${id}`">{{ messages.nav[LABELS[id]] }}</a>
      <a :href="localePath(LINKS.docs)">{{ messages.nav.docs }}</a>
    </nav>
    <div class="actions">
      <LandingButton :href="LINKS.github" :icon="IconGithub" tone="line" class="github">
        {{ messages.nav.github }}
      </LandingButton>
      <LandingButton
        :href="localePath(LINKS.downloadPage)"
        :icon="IconDownload"
        tone="accent"
        download
      >
        {{ messages.nav.download }}
      </LandingButton>
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  position: sticky;
  z-index: 20;
  top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 60px;
  margin-top: 28px;
  padding: 0 14px;
  border: 1px solid var(--lp-line);
  border-radius: 14px;
  background: var(--lp-surface);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 4px;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.brand img {
  width: 32px;
  height: 32px;
}

.sections {
  display: flex;
  gap: 6px;
}

.sections a {
  padding: 8px 12px;
  border-radius: 8px;
  color: var(--lp-muted);
  font-size: 15px;
  font-weight: 500;
  transition:
    color 150ms,
    background-color 150ms;
}

.sections a:hover {
  background: var(--lp-raised);
  color: var(--lp-ink);
}

.actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 1060px) {
  .sections {
    display: none;
  }
}

@media (max-width: 480px) {
  .toolbar {
    top: 8px;
    margin-top: 12px;
    padding: 0 8px;
  }

  /* The GitHub button keeps its icon; its name stays for screen readers. */
  .github :deep(span) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .github {
    padding: 0 12px;
  }
}
</style>
