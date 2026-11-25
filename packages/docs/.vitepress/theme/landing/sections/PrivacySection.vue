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
      <div class="frame" data-draw>
        <div class="copy">
          <h2 id="privacy-title">{{ messages.privacy.title }}</h2>
          <p>{{ messages.privacy.lede }}</p>
          <figure class="wire" aria-hidden="true">
            <svg viewBox="0 0 300 100" fill="none">
              <g class="machine">
                <rect x="8" y="14" width="100" height="68" rx="4" fill="var(--lp-night-2)" />
                <rect
                  x="9"
                  y="15"
                  width="98"
                  height="66"
                  rx="3"
                  stroke="var(--lp-night-muted)"
                  stroke-width="2"
                />
                <rect x="20" y="24" width="76" height="48" rx="2" fill="#fff" />
                <path d="M29 35h58M29 45h48M29 55h58" stroke="var(--lp-ink)" stroke-width="2" />
                <path d="M0 88h116" stroke="var(--lp-night-muted)" stroke-width="3" />
              </g>
              <g class="cloud">
                <path
                  d="M225 58c-4.4 0-8-3.4-8-7.6 0-4.1 3.5-7.4 7.7-7.6 1-8.1 8.2-14.4 16.8-14.4 7.7 0 14.3 4.9 16.3 11.8 9 .4 16 7.2 16 15.5 0 8.6-7.4 15.5-16.5 15.5H225Z"
                  fill="#3f404b"
                  stroke="var(--lp-night-muted)"
                  stroke-width="2"
                />
                <path d="M226 41h26M233 47h18" stroke="var(--lp-night-muted)" stroke-width="2" />
              </g>
              <g class="wire-line">
                <path
                  class="strand"
                  d="M110 58h38"
                  stroke="var(--lp-agent)"
                  stroke-width="2.5"
                  stroke-dasharray="6 6"
                />
                <path
                  class="strand"
                  d="M154 55h60"
                  stroke="var(--lp-agent)"
                  stroke-width="2.5"
                  stroke-dasharray="6 6"
                />
              </g>
            </svg>
          </figure>
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

/* The document stays on the machine; the line to the cloud breaks as the frame is seen. */
.wire {
  width: min(300px, 100%);
}

.wire svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .wire {
      view-timeline-name: --lp-wire;
      view-timeline-axis: block;
    }

    .strand {
      animation-name: lp-wire-break;
      animation-fill-mode: both;
      animation-timing-function: var(--lp-ease-out);
      animation-timeline: --lp-wire;
      animation-range: entry 10% cover 35%;
    }

    .strand + .strand {
      animation-delay: var(--lp-stagger);
    }
  }

  @keyframes lp-wire-break {
    from {
      opacity: 1;
      transform: translateX(0);
    }

    to {
      opacity: 0;
      transform: translateX(12px);
    }
  }
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
