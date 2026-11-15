<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

import type { Color } from '@pairdraw/scene-graph/primitives'

import { loadMarkdownContent } from '@/components/markdown/lazy'
import PersonAvatar from '@/components/presence/PersonAvatar.vue'

import { useCommentAuthor } from './author'
import CommentTime from './CommentTime.vue'
import { comments } from './ui'

const MarkdownContent = defineAsyncComponent(loadMarkdownContent)

/** One message of a thread: who wrote it, when, and what. */
const { author, color, at, text } = defineProps<{
  author: string
  color?: Color
  at: string
  text: string
}>()

defineSlots<{ actions?(): unknown }>()

const who = useCommentAuthor()
const ui = comments()
</script>

<template>
  <article data-slot="comment-message" :class="ui.message()">
    <PersonAvatar :name="who.name(author)" :color="who.color(color)" />
    <div :class="ui.messageMeta()">
      <span :class="ui.messageAuthor()">{{ who.name(author) }}</span>
      <CommentTime :at="at" :class="ui.messageTime()" />
      <span v-if="$slots.actions" :class="ui.messageActions()"><slot name="actions" /></span>
    </div>
    <MarkdownContent :content="text" :class="ui.messageText()" />
  </article>
</template>
