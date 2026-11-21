<script setup lang="ts">
import { useData, withBase } from 'vitepress'
import { computed } from 'vue'

import { LINKS } from '../content/links'
import { useLandingMessages, useLocalePath } from '../content/messages'

/** The page's last frame: where to go next, the licenses, and the other languages. */
const messages = useLandingMessages()
const localePath = useLocalePath()
const { site, localeIndex } = useData()

const columns = computed(() => {
  const m = messages.value.footer
  const english = { translated: false }
  return [
    {
      title: m.product,
      links: [
        { label: messages.value.nav.download, href: localePath(LINKS.downloadPage) },
        { label: m.roadmap, href: localePath(LINKS.roadmap, english) },
        { label: m.changelog, href: LINKS.changelog },
        { label: m.cloud, href: localePath(LINKS.cloud, english) }
      ]
    },
    {
      title: m.docs,
      links: [
        { label: m.gettingStarted, href: localePath(LINKS.docs) },
        { label: m.cli, href: localePath(LINKS.cli, english) },
        { label: m.mcp, href: localePath(LINKS.mcp, english) },
        { label: m.sdk, href: localePath(LINKS.sdk) }
      ]
    },
    {
      title: m.community,
      links: [
        { label: messages.value.nav.github, href: LINKS.github },
        { label: m.issues, href: LINKS.issues },
        { label: m.security, href: LINKS.security }
      ]
    },
    {
      title: m.legal,
      links: [
        { label: m.mit, href: LINKS.mitLicense },
        { label: m.apache, href: LINKS.apacheLicense },
        { label: m.privacy, href: localePath(LINKS.privacy, english) }
      ]
    }
  ]
})

/** Every language the site has, each linking to its own landing page. */
const languages = computed(() =>
  Object.entries(site.value.locales).map(([key, locale]) => ({
    key,
    label: locale.label ?? key,
    lang: locale.lang,
    href: withBase(key === 'root' ? '/' : `/${key}/`)
  }))
)
</script>

<template>
  <footer class="footer lp-column">
    <div class="top">
      <div class="brand">
        <span class="name">
          <img :src="withBase('/brand/mark.svg')" alt="" width="32" height="32" />
          Pairdraw
        </span>
        <p>{{ messages.footer.tagline }}</p>
      </div>
      <div class="columns">
        <div v-for="column in columns" :key="column.title">
          <h2>{{ column.title }}</h2>
          <ul>
            <li v-for="link in column.links" :key="link.href">
              <a :href="link.href">{{ link.label }}</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div class="bottom">
      <p>{{ messages.footer.license }}</p>
      <nav :aria-label="messages.footer.language" class="languages">
        <a
          v-for="language in languages"
          :key="language.key"
          :href="language.href"
          :hreflang="language.lang"
          :lang="language.lang"
          :aria-current="language.key === localeIndex ? 'page' : undefined"
          >{{ language.label }}</a
        >
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  display: flex;
  flex-direction: column;
  gap: 64px;
  padding: 120px 0 48px;
}

.top {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 48px;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 320px;
}

.name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
}

.brand p {
  color: var(--lp-muted);
  font-size: 16px;
  line-height: 24px;
}

.columns {
  display: flex;
  flex-wrap: wrap;
  gap: 40px 72px;
}

h2 {
  font-size: 15px;
  font-weight: 700;
}

ul {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.columns a {
  color: var(--lp-muted);
  font-size: 15px;
  transition: color 150ms;
}

.columns a:hover {
  color: var(--lp-ink);
}

.bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 24px;
  border-top: 1px solid var(--lp-line);
  color: var(--lp-muted);
  font-size: 14px;
}

.languages {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-family: var(--lp-mono);
  font-size: 13px;
}

.languages a:hover,
.languages a[aria-current] {
  color: var(--lp-ink);
}

.languages a[aria-current] {
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 600px) {
  .footer {
    padding-top: 80px;
  }

  .columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
