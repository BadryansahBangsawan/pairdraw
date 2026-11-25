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
            <svg viewBox="0 0 260 84" fill="none">
              <g class="machine">
                <rect x="9" y="16" width="74" height="50" rx="3" fill="var(--lp-night-2)" />
                <rect
                  x="9.75"
                  y="16.75"
                  width="72.5"
                  height="48.5"
                  rx="2.25"
                  stroke="var(--lp-night-line)"
                  stroke-width="1.5"
                />
                <rect x="19" y="25" width="54" height="32" rx="1.5" fill="#fff" />
                <path d="M26 33h40M26 39h34M26 45h40" stroke="var(--lp-ink)" stroke-width="1.5" />
                <path d="M2 70h88" stroke="var(--lp-night-muted)" stroke-width="2" />
              </g>
              <g class="cloud">
                <path
                  d="M198 40c-3.4 0-6.2-2.6-6.2-5.9 0-3.2 2.7-5.8 6-5.9.8-6.3 6.4-11.2 13.1-11.2 6 0 11.2 3.8 12.7 9.2 7 .3 12.4 5.6 12.4 12.1 0 6.7-5.8 12.1-12.9 12.1h-25.1Z"
                  fill="var(--lp-night-3)"
                  stroke="var(--lp-night-line)"
                  stroke-width="1.5"
                />
                <path d="M199 31h20M205 36h14" stroke="var(--lp-night-muted)" stroke-width="1.5" />
              </g>
              <g class="wire-line">
                <path
                  class="strand"
                  d="M86 44h52"
                  stroke="var(--lp-agent)"
                  stroke-width="1.5"
                  stroke-dasharray="4 5"
                />
                <path
                  class="strand"
                  d="M138 44h44"
                  stroke="var(--lp-agent)"
                  stroke-width="1.5"
                  stroke-dasharray="4 5"
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
  width: min(260px, 100%);
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
      transform: translateX(10px);
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
