<script setup lang="ts">
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger
} from 'reka-ui'
import { computed } from 'vue'
import IconPlus from '~icons/lucide/plus'

import { LINKS } from '../content/links'
import { useLandingMessages, useLocalePath } from '../content/messages'

/** Questions that open in place; the answer's height grows open rather than jumping. */
const messages = useLandingMessages()
const localePath = useLocalePath()

/** The lede with its two links where the catalog puts `{docs}` and `{github}`. */
const lede = computed(() => {
  const links: Record<string, { text: string; href: string }> = {
    '{docs}': { text: messages.value.faq.docs, href: localePath(LINKS.docs) },
    '{github}': { text: messages.value.faq.github, href: LINKS.issues }
  }
  return messages.value.faq.lede
    .split(/(\{docs\}|\{github\})/)
    .map((part) => links[part] ?? { text: part, href: null })
})
</script>

<template>
  <section id="faq" class="lp-section" aria-labelledby="faq-title">
    <div class="lp-column layout">
      <div class="intro">
        <h2 id="faq-title" class="lp-heading">{{ messages.faq.title }}</h2>
        <p class="lp-lede">
          <template v-for="(part, index) in lede" :key="index">
            <a v-if="part.href" :href="part.href">{{ part.text }}</a>
            <template v-else>{{ part.text }}</template>
          </template>
        </p>
      </div>
      <AccordionRoot type="multiple" class="questions" data-draw :default-value="['0']">
        <AccordionItem
          v-for="(item, index) in messages.faq.items"
          :key="index"
          :value="String(index)"
          class="item"
        >
          <AccordionHeader as="h3" class="header">
            <AccordionTrigger class="trigger">
              {{ item.question }}
              <span class="plus" aria-hidden="true"><IconPlus /></span>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent class="content">
            <p>{{ item.answer }}</p>
          </AccordionContent>
        </AccordionItem>
      </AccordionRoot>
    </div>
  </section>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 360px) minmax(0, 760px);
  justify-content: space-between;
  gap: 48px;
}

.intro {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.intro a {
  color: var(--lp-ink);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.questions {
  border-bottom: 1px solid var(--lp-line);
}

.item {
  border-top: 1px solid var(--lp-line);
}

.header {
  margin: 0;
}

.trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  width: 100%;
  padding: 26px 0;
  border: 0;
  background: none;
  color: var(--lp-ink);
  cursor: pointer;
  font-size: clamp(19px, 1.7vw, 24px);
  font-weight: 700;
  letter-spacing: -0.012em;
  text-align: left;
}

.plus {
  display: grid;
  flex: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1.5px solid var(--lp-ink);
  border-radius: 50%;
  transition:
    transform 300ms var(--lp-ease-out),
    background-color 200ms,
    color 200ms;
}

.plus svg {
  width: 18px;
  height: 18px;
}

.trigger:hover .plus {
  background: var(--lp-ink);
  color: #fff;
}

/* The plus turns into a cross: the same control closes what it opened. */
.trigger[data-state='open'] .plus {
  transform: rotate(45deg);
}

.content {
  overflow: hidden;
}

.content[data-state='open'] {
  animation: faq-open 320ms var(--lp-ease-out);
}

.content[data-state='closed'] {
  animation: faq-close 220ms ease-in;
}

@keyframes faq-open {
  from {
    height: 0;
    opacity: 0;
  }

  to {
    height: var(--reka-accordion-content-height);
    opacity: 1;
  }
}

@keyframes faq-close {
  from {
    height: var(--reka-accordion-content-height);
    opacity: 1;
  }

  to {
    height: 0;
    opacity: 0;
  }
}

.content p {
  padding: 0 96px 28px 0;
  color: var(--lp-muted);
  font-size: 18px;
  line-height: 28px;
}

@media (max-width: 1023px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .content p {
    padding-right: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .content[data-state],
  .plus {
    animation: none;
    transition: none;
  }
}
</style>
