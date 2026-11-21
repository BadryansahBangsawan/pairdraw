<script setup lang="ts">
import { useElementSize, useIntervalFn } from '@vueuse/core'
import { computed, onMounted, ref, shallowRef, useTemplateRef, watch, type Component } from 'vue'
import IconPi from '~icons/lucide/pi'
import IconTerminal from '~icons/lucide/terminal'
import IconClaude from '~icons/simple-icons/claude'
import IconGemini from '~icons/simple-icons/googlegemini'
import IconOpenAI from '~icons/simple-icons/openai'

import type { Vector } from '@pairdraw/scene-graph/primitives'

import { useLandingMessages } from '../content/messages'
import CopyCommand from '../download/CopyCommand.vue'
import CanvasCursor from '../ui/CanvasCursor.vue'
import { useSceneActivity } from '../ui/useSceneActivity'

/**
 * Five coding agents on one report. They take turns: one glides to a bar, outlines it, and
 * grows it, while the MCP server lights the tool the edit goes through.
 */
const messages = useLandingMessages()

interface Agent {
  name: string
  icon: Component
  /** Where the agent waits, as fractions of the canvas, from the design. */
  home: Vector
}

const AGENTS: Agent[] = [
  { name: 'Codex', icon: IconOpenAI, home: { x: 0.208, y: 0.268 } },
  { name: 'omp', icon: IconTerminal, home: { x: 0.717, y: 0.214 } },
  { name: 'Claude Code', icon: IconClaude, home: { x: 0.68, y: 0.536 } },
  { name: 'Gemini CLI', icon: IconGemini, home: { x: 0.25, y: 0.75 } },
  { name: 'Pi', icon: IconPi, home: { x: 0.533, y: 0.84 } }
]
const TOOLS = ['render', 'set_layout', 'export_image'] as const
/** Bar heights from the design, out of the chart's 160. */
const BARS = [52, 80, 64, 110, 92, 140]
const TURN_MS = 1500
const COMMAND = 'npx -p @pairdraw/mcp pairdraw-connect'

const canvas = useTemplateRef<HTMLElement>('canvas')
const { width, height } = useElementSize(canvas)
const { reduced, running } = useSceneActivity(canvas)

/** The turn being played; -1 until the canvas is first on screen. */
const turn = ref(reduced.value ? BARS.length - 1 : -1)
const { pause, resume } = useIntervalFn(() => turn.value++, TURN_MS, { immediate: false })
watch(running, (play) => (play ? resume() : pause()), { immediate: true })
// Visitors who asked for less motion see the last turn, as every other scene shows its end.
watch(
  reduced,
  (still) => {
    if (still) turn.value = Math.max(turn.value, BARS.length - 1)
  },
  { immediate: true }
)

const worker = computed(() => (turn.value < 0 ? -1 : turn.value % AGENTS.length))
const bar = computed(() => (turn.value < 0 ? -1 : turn.value % BARS.length))
const tool = computed(() => (turn.value < 0 ? -1 : turn.value % TOOLS.length))

/** The tops of the bars in the canvas, measured, so an agent points at the one it edits. */
const tops = shallowRef<Vector[]>([])
function measure(): void {
  const root = canvas.value
  if (!root) return
  const origin = root.getBoundingClientRect()
  tops.value = [...root.querySelectorAll<HTMLElement>('.bar')].map((element) => {
    const box = element.getBoundingClientRect()
    return { x: box.left - origin.left + box.width * 0.7, y: box.top - origin.top + 6 }
  })
}
onMounted(() => {
  measure()
  // The report's size changes when its typeface arrives.
  void document.fonts.ready.then(measure)
})
watch([width, height], measure)

function position(index: number): Vector {
  const target = index === worker.value ? tops.value[bar.value] : undefined
  if (target) return target
  const home = AGENTS[index]?.home ?? { x: 0, y: 0 }
  return { x: home.x * width.value, y: home.y * height.value }
}
</script>

<template>
  <section id="agents" class="lp-section" aria-labelledby="agents-title">
    <div class="lp-column">
      <div class="lp-intro">
        <h2 id="agents-title" class="lp-heading">{{ messages.agents.title }}</h2>
        <p class="lp-lede">{{ messages.agents.lede }}</p>
      </div>

      <span class="lp-frame-title frame-title">{{ messages.agents.frame }}</span>
      <div ref="canvas" class="canvas" :data-reduced="reduced || undefined" aria-hidden="true">
        <div class="report">
          <div class="report-head">
            <strong>{{ messages.agents.report }}</strong>
            <span>{{ messages.agents.month }}</span>
          </div>
          <div class="chart">
            <span
              v-for="(size, index) in BARS"
              :key="index"
              class="bar"
              :data-edited="index === bar || undefined"
              :style="{ height: `${size}px` }"
            />
          </div>
          <span class="line" />
          <span class="line short" />
        </div>

        <div
          v-for="(agent, index) in AGENTS"
          :key="agent.name"
          class="agent"
          :data-placed="width > 0 || undefined"
          :style="{
            transform: `translate(${position(index).x}px, ${position(index).y}px)`
          }"
        >
          <CanvasCursor :name="agent.name" actor="agent">
            <template #icon><component :is="agent.icon" /></template>
          </CanvasCursor>
        </div>

        <div class="server">
          <span class="dot" />
          <strong>{{ messages.agents.server }}</strong>
          <span class="tools">
            <span
              v-for="(name, index) in TOOLS"
              :key="name"
              :data-lit="index === tool || undefined"
              >{{ name }}</span
            >
          </span>
        </div>
      </div>

      <div class="connect">
        <span>{{ messages.agents.connect.before }}</span>
        <CopyCommand :command="COMMAND" />
        <span>{{ messages.agents.connect.after }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lp-intro {
  margin-bottom: 48px;
}

.canvas {
  position: relative;
  height: 560px;
  overflow: hidden;
  border: 1px solid var(--lp-line);
  background: var(--lp-surface);
}

.report {
  position: absolute;
  top: 110px;
  left: 50%;
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: min(440px, 100% - 40px);
  padding: 28px;
  border: 1.5px solid var(--lp-agent);
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 16px 40px rgb(21 22 26 / 0.08);
  transform: translateX(-50%);
}

.report-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.report-head strong {
  font-size: 24px;
  font-weight: 800;
}

.report-head span {
  color: var(--lp-muted);
  font-family: var(--lp-mono);
  font-size: 14px;
}

.chart {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  height: 160px;
}

.bar {
  flex: 1;
  border-radius: 6px;
  background: var(--lp-ink);
  outline: 1.5px solid transparent;
  outline-offset: 3px;
  transform-origin: 50% 100%;
  transition:
    transform 500ms var(--lp-ease-out),
    outline-color 200ms;
}

.bar:last-child {
  background: var(--lp-human);
}

/* The bar an agent edits, outlined in the agents' violet as it grows a little. */
.bar[data-edited] {
  outline-color: var(--lp-agent);
  transform: scaleY(1.06);
}

.line {
  height: 8px;
  border-radius: 4px;
  background: var(--lp-raised);
}

.line.short {
  width: 220px;
  max-width: 60%;
}

.agent {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  opacity: 0;
  transition:
    transform 900ms cubic-bezier(0.45, 0, 0.2, 1),
    opacity 300ms;
}

.agent[data-placed] {
  opacity: 1;
}

.server {
  position: absolute;
  bottom: 20px;
  left: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--lp-night);
  color: #fff;
  font-size: 15px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--lp-human);
}

.tools {
  display: flex;
  gap: 10px;
  color: var(--lp-night-muted);
  font-family: var(--lp-mono);
  font-size: 13px;
}

.tools span {
  transition: color 200ms;
}

.tools span[data-lit] {
  color: #fff;
}

.connect {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  color: var(--lp-muted);
  font-size: 16px;
}

@media (max-width: 767px) {
  .canvas {
    height: 480px;
  }

  .report {
    top: 80px;
    padding: 20px;
  }

  .chart {
    gap: 8px;
  }

  .server {
    left: 12px;
    right: 12px;
    flex-wrap: wrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .canvas * {
    transition: none !important;
  }
}
</style>
