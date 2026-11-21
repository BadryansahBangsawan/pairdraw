<script setup lang="ts">
import { TooltipProvider } from 'reka-ui'
import { useData } from 'vitepress'
import { computed, watch } from 'vue'

import { AVAILABLE_LOCALES, setLocale, type Locale } from '@pairdraw/vue/i18n'

import type { ToolCallPart } from '@/app/ai/chat/tool-calls/display'
import ChatToolCallGroup from '@/components/chat/tool/ChatToolCallGroup.vue'

/**
 * The app's own tool call cards, as the chat shows an agent's turn, with the calls the AI tab's
 * scene makes. `finished` counts the calls that are done; the next one is still running. The
 * cards speak the page's language, as the app does when set to it.
 */
const { finished } = defineProps<{ finished: number }>()

const SETTINGS_JSX = `<Frame name="Settings" w={240} flex="col" gap={10} p={18} bg="#FFFFFF" rounded={16}>
  <Text size={17} weight={800}>Settings</Text>
  <Frame name="Budget alerts" flex="row" justify="between" />
  <Frame name="Weekly summary" flex="row" justify="between" />
  <Frame name="New sign-in" flex="row" justify="between" />
</Frame>`

/** The calls in order, each as it looks while it runs and once it is done. */
const CALLS: { running: Record<string, unknown>; done: Record<string, unknown> }[] = [
  {
    running: { type: 'tool-render', state: 'input-streaming', input: { jsx: SETTINGS_JSX } },
    done: {
      type: 'tool-render',
      state: 'output-available',
      input: { jsx: SETTINGS_JSX },
      output: { name: 'Settings', children: 24 }
    }
  },
  {
    running: { type: 'tool-set_layout', state: 'input-available', input: { name: 'Settings' } },
    done: {
      type: 'tool-set_layout',
      state: 'output-available',
      input: { name: 'Settings', gap: 12 },
      output: { name: 'Settings', gap: 12 }
    }
  },
  {
    running: {
      type: 'tool-create_component',
      state: 'input-available',
      input: { name: 'Toggle row' }
    },
    done: {
      type: 'tool-create_component',
      state: 'output-available',
      input: { name: 'Toggle row' },
      output: { name: 'Toggle row' }
    }
  }
]

function part(index: number, fields: Record<string, unknown>): ToolCallPart {
  // The scene's calls are plain records shaped as the chat stores them, as its stories write them.
  return { toolCallId: `landing-${index}`, ...fields } as ToolCallPart
}

const parts = computed(() =>
  CALLS.slice(0, Math.min(finished + 1, CALLS.length)).map((call, index) =>
    part(index, index < finished ? call.done : call.running)
  )
)

const { lang } = useData()
function isAppLocale(value: string): value is Locale {
  return (AVAILABLE_LOCALES as readonly string[]).includes(value)
}
watch(
  lang,
  (value) => {
    if (isAppLocale(value)) setLocale(value)
  },
  { immediate: true }
)
</script>

<template>
  <TooltipProvider :delay-duration="400">
    <div class="pairdraw-app tool-calls">
      <ChatToolCallGroup :parts="parts" />
    </div>
  </TooltipProvider>
</template>

<style scoped>
/* The cards use the app's font and size, as `body` sets them in `src/app.css`. */
.tool-calls {
  font-family:
    Inter,
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 13px;
  line-height: normal;
}
</style>
