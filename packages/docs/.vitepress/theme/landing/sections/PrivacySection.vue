<script setup lang="ts">
import IconHardDrive from '~icons/lucide/hard-drive'
import IconKeyRound from '~icons/lucide/key-round'
import IconUsers from '~icons/lucide/users'

import { LINKS } from '../content/links'
import { useLandingMessages, useLocalePath } from '../content/messages'

/** What stays on the visitor's computer. A still frame: nothing here needs to move. */
const messages = useLandingMessages()
const localePath = useLocalePath()
const ICONS = [IconHardDrive, IconKeyRound, IconUsers]
</script>

<template>
  <section class="lp-section" aria-labelledby="privacy-title">
    <div class="lp-column">
      <span class="lp-frame-title">{{ messages.privacy.frame }}</span>
      <div class="frame">
        <div class="copy">
          <h2 id="privacy-title">{{ messages.privacy.title }}</h2>
          <p>{{ messages.privacy.lede }}</p>
          <a :href="localePath(LINKS.privacy, { translated: false })">{{
            messages.privacy.link
          }}</a>
        </div>
        <ul>
          <li v-for="(item, index) in messages.privacy.items" :key="item.title">
            <component :is="ICONS[index]" class="icon" aria-hidden="true" />
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.detail }}</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.frame {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 400px);
  gap: 64px;
  padding: clamp(32px, 5vw, 72px);
  background: var(--lp-ink);
  color: #fff;
}

.copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 24px;
}

h2 {
  font-size: clamp(44px, 6.1vw, 88px);
  font-weight: 800;
  letter-spacing: -0.034em;
  line-height: 0.98;
  text-wrap: balance;
}

.copy p {
  max-width: 480px;
  color: var(--lp-night-muted);
  font-size: 18px;
  line-height: 28px;
}

.copy a {
  color: #fff;
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: var(--lp-human);
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}

.copy a:focus-visible {
  outline-color: #fff;
}

li {
  display: flex;
  gap: 14px;
  padding: 20px 0;
  border-top: 1px solid var(--lp-night-line);
}

.icon {
  flex: none;
  width: 20px;
  height: 20px;
  margin-top: 2px;
  color: var(--lp-human);
}

h3 {
  font-size: 18px;
  font-weight: 700;
}

li p {
  margin-top: 6px;
  color: var(--lp-night-muted);
  font-size: 16px;
  line-height: 24px;
}

@media (max-width: 1023px) {
  .frame {
    grid-template-columns: minmax(0, 1fr);
    gap: 40px;
  }
}
</style>
