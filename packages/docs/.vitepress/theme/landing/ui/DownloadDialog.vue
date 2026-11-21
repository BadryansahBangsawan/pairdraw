<script setup lang="ts">
import { uniqBy } from 'es-toolkit/array'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogRoot,
  DialogTitle
} from 'reka-ui'
import IconX from '~icons/lucide/x'

import { LINKS } from '../content/links'
import { useLandingMessages, useLocalePath } from '../content/messages'
import { fill } from '../content/messages/fill'
import { extension, PLATFORM_NAMES } from '../download/format'
import { filesFor, PLATFORMS, type Platform, type ReleaseFile } from '../download/releases'
import { data as releases } from '../download/releases.data'
import type { VisitorSystem } from '../download/visitor'

/** The installers of the latest release, a row per platform, with the visitor's first file lit. */
const open = defineModel<boolean>('open', { required: true })
const { system } = defineProps<{ system: VisitorSystem | null }>()

const messages = useLandingMessages()
const localePath = useLocalePath()
const release = releases.stable

/** One link per format, to the visitor's architecture where the browser said which it is. */
function formatsFor(platform: Platform): ReleaseFile[] {
  if (!release) return []
  const files = filesFor(release, platform)
  const arch = platform === system?.platform ? system.arch : null
  const preferred = arch ? files.filter((file) => file.arch === arch) : []
  return uniqBy([...preferred, ...files], (file) => file.format).toSorted(
    (a, b) => files.indexOf(a) - files.indexOf(b)
  )
}

function isSuggested(platform: Platform, index: number): boolean {
  return platform === system?.platform && index === 0
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogOverlay class="download-overlay" />
    <DialogContent class="download-dialog">
      <header>
        <div>
          <DialogTitle class="title">{{ messages.overlay.title }}</DialogTitle>
          <DialogDescription class="version">
            {{
              release
                ? fill(messages.overlay.version, { version: release.version })
                : messages.overlay.unavailable
            }}
          </DialogDescription>
        </div>
        <DialogClose class="close" :aria-label="messages.overlay.close">
          <IconX aria-hidden="true" />
        </DialogClose>
      </header>

      <ul v-if="release" class="platforms">
        <li v-for="platform in PLATFORMS" :key="platform">
          <div>
            <h3>{{ PLATFORM_NAMES[platform] }}</h3>
            <p>{{ messages.overlay.platforms[platform] }}</p>
          </div>
          <div class="formats">
            <a
              v-for="(file, index) in formatsFor(platform)"
              :key="file.name"
              :href="file.url"
              class="format"
              :data-suggested="isSuggested(platform, index) || undefined"
              >{{ extension(file.format) }}</a
            >
          </div>
        </li>
      </ul>
      <a v-else :href="LINKS.download" class="github">{{ messages.download.onGitHub }}</a>

      <p class="note">{{ messages.overlay.note }}</p>
      <a :href="localePath(LINKS.downloadPage)" class="all">{{ messages.overlay.allFiles }}</a>
    </DialogContent>
  </DialogRoot>
</template>

<style scoped>
.download-overlay {
  position: fixed;
  z-index: 100;
  inset: 0;
  background: rgb(21 22 26 / 0.32);
}

.download-dialog {
  position: fixed;
  z-index: 101;
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: min(520px, 100vw - 32px);
  max-height: calc(100dvh - 32px);
  overflow: auto;
  padding: 32px;
  border: 1px solid var(--lp-line);
  border-radius: 20px;
  background: var(--lp-surface);
  box-shadow: 0 24px 64px rgb(23 23 28 / 0.16);
  color: var(--lp-ink);
  transform: translate(-50%, -50%);
}

/* Opening grows the dialog out of the page; closing sends it back quicker than it came. */
.download-overlay[data-state='open'] {
  animation: download-fade-in 200ms ease-out;
}

.download-overlay[data-state='closed'] {
  animation: download-fade-out 150ms ease-in;
}

.download-dialog[data-state='open'] {
  animation: download-rise 260ms var(--lp-ease-out);
}

.download-dialog[data-state='closed'] {
  animation: download-sink 150ms ease-in;
}

@keyframes download-fade-in {
  from {
    opacity: 0;
  }
}

@keyframes download-fade-out {
  to {
    opacity: 0;
  }
}

@keyframes download-rise {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 12px)) scale(0.97);
  }
}

@keyframes download-sink {
  to {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 6px)) scale(0.98);
  }
}

@media (prefers-reduced-motion: reduce) {
  .download-overlay[data-state],
  .download-dialog[data-state] {
    animation: none;
  }
}

header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.title {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.version {
  margin-top: 6px;
  color: var(--lp-muted);
  font-size: 15px;
}

.close {
  display: grid;
  flex: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--lp-line);
  border-radius: 50%;
  background: none;
  cursor: pointer;
  transition:
    background-color 150ms,
    transform 150ms var(--lp-ease-out);
}

.close:hover {
  background: var(--lp-raised);
}

.close:active {
  transform: scale(0.92);
}

.close svg {
  width: 16px;
  height: 16px;
}

.platforms {
  margin: 0;
  padding: 0;
  list-style: none;
}

.platforms li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 18px 0;
  border-bottom: 1px solid var(--lp-line);
}

.platforms li:first-child {
  border-top: 1px solid var(--lp-line);
}

h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.platforms p {
  margin: 4px 0 0;
  color: var(--lp-muted);
  font-size: 14px;
}

.formats {
  display: flex;
  gap: 6px;
}

.format {
  padding: 6px 10px;
  border: 1px solid var(--lp-line);
  border-radius: 8px;
  background: var(--lp-raised);
  color: var(--lp-ink);
  font-family: var(--lp-mono);
  font-size: 12px;
  line-height: 16px;
  text-decoration: none;
  transition:
    background-color 150ms,
    border-color 150ms,
    transform 150ms var(--lp-ease-out);
}

.format:hover {
  border-color: var(--lp-ink);
}

.format:active {
  transform: scale(0.95);
}

.format[data-suggested] {
  border-color: var(--lp-human);
  background: var(--lp-human);
}

.note {
  margin: 0;
  color: var(--lp-muted);
  font-size: 13px;
  line-height: 20px;
}

.all,
.github {
  align-self: flex-start;
  color: var(--lp-ink);
  font-size: 14px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
