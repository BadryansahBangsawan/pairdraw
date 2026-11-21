<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { useLandingMessages } from '../content/messages'
import { useSceneActivity } from '../ui/useSceneActivity'

/** The CLI on the same documents: a session prints itself line by line when it comes into view. */
const messages = useLandingMessages()

/** A command typed at the prompt, or what the one before it printed. */
const SESSION: { command: boolean; text: string }[] = [
  { command: true, text: 'bun add -g @pairdraw/cli' },
  { command: true, text: 'pairdraw tree design.fig' },
  { command: false, text: '[0] [page] "Getting started" (0:46566)' },
  { command: true, text: 'pairdraw query design.fig "//FRAME[@width < 300]"' },
  { command: true, text: 'pairdraw export design.fig -f tailwind-jsx' },
  { command: true, text: 'pairdraw lint design.fig --preset strict' },
  { command: true, text: 'pairdraw tool call get_selection' }
]

const terminal = useTemplateRef<HTMLElement>('terminal')
const { seen, running } = useSceneActivity(terminal)
</script>

<template>
  <section id="scripting" class="lp-section" aria-labelledby="scripting-title">
    <div class="lp-column layout">
      <div class="copy">
        <h2 id="scripting-title" class="lp-heading">{{ messages.scripting.title }}</h2>
        <p class="lp-lede">{{ messages.scripting.lede }}</p>
        <dl>
          <div v-for="item in messages.scripting.items" :key="item.title">
            <dt>{{ item.title }}</dt>
            <dd>{{ item.detail }}</dd>
          </div>
        </dl>
      </div>
      <figure
        ref="terminal"
        class="terminal"
        :data-seen="seen || undefined"
        :data-running="running || undefined"
        :aria-label="messages.scripting.terminal"
      >
        <div class="bar" aria-hidden="true">
          <i /><i /><i />
          <span>~/designs</span>
        </div>
        <div class="session">
          <p
            v-for="(line, index) in SESSION"
            :key="index"
            class="line"
            :style="{ '--line': index }"
          >
            <span v-if="line.command" class="prompt">$ </span>
            <span :class="{ output: !line.command }">{{ line.text }}</span>
          </p>
          <p class="line" :style="{ '--line': SESSION.length }" aria-hidden="true">
            <span class="prompt">$ </span><span class="caret" />
          </p>
        </div>
      </figure>
    </div>
  </section>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
  align-items: start;
  gap: 64px;
}

.copy {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

dl > div {
  padding: 18px 0;
  border-top: 1px solid var(--lp-line);
}

dt {
  font-size: 18px;
  font-weight: 700;
}

dd {
  margin-top: 6px;
  color: var(--lp-muted);
  font-size: 16px;
  line-height: 24px;
}

.terminal {
  margin: 0;
  overflow: hidden;
  border-radius: 18px;
  background: var(--lp-night);
  box-shadow: 0 24px 60px rgb(21 22 26 / 0.19);
  color: #fff;
}

.bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 18px;
  border-bottom: 1px solid var(--lp-night-line);
}

.bar i {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #ff5f57;
}

.bar i:nth-child(2) {
  background: #febc2e;
}

.bar i:nth-child(3) {
  background: #28c840;
}

.bar span {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--lp-night-muted);
  font-family: var(--lp-mono);
  font-size: 13px;
}

.session {
  padding: 28px;
  overflow-x: auto;
  font-family: var(--lp-mono);
  font-size: 16px;
  line-height: 30px;
  white-space: pre;
}

.prompt {
  color: var(--lp-human);
}

.output {
  color: var(--lp-night-muted);
}

/* Each line arrives after the one before it, as a session prints. */
.line {
  opacity: 0;
  transform: translateY(6px);
}

.terminal[data-seen] .line {
  animation: terminal-line 300ms var(--lp-ease-out) forwards;
  animation-delay: calc(var(--line) * 220ms);
}

@keyframes terminal-line {
  to {
    opacity: 1;
    transform: none;
  }
}

.caret {
  display: inline-block;
  width: 10px;
  height: 20px;
  background: #fff;
  vertical-align: -4px;
  animation: terminal-caret 1s steps(1) infinite paused;
}

.terminal[data-running] .caret {
  animation-play-state: running;
}

@keyframes terminal-caret {
  50% {
    opacity: 0;
  }
}

@media (max-width: 1023px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 40px;
  }

  .session {
    padding: 20px;
    font-size: 13px;
    line-height: 26px;
  }
}

@media (prefers-reduced-motion: reduce), (scripting: none) {
  .line {
    opacity: 1;
    transform: none;
  }

  .terminal[data-seen] .line,
  .caret {
    animation: none;
  }
}
</style>
