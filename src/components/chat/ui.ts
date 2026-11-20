import { tv, type VariantProps } from 'tailwind-variants'

import agentTheme from '@/theme/chat/agent'
import compactionTheme from '@/theme/chat/compaction'
import explorePickerTheme from '@/theme/chat/explore-picker'
import inputTheme from '@/theme/chat/input'
import messageTheme from '@/theme/chat/message'
import profileTheme from '@/theme/chat/profile'
import reasoningTheme from '@/theme/chat/reasoning'
import referenceTheme from '@/theme/chat/reference'
import skillPickerTheme from '@/theme/chat/skill-picker'
import thinkingTheme from '@/theme/chat/thinking'
import transcriptTheme from '@/theme/chat/transcript'

export const chatAgentTheme = tv(agentTheme)
export const chatCompactionTheme = tv(compactionTheme)
export const chatExplorePickerTheme = tv(explorePickerTheme)
export const chatInputTheme = tv(inputTheme)
export const chatMessageTheme = tv(messageTheme)
export const chatProfileTheme = tv(profileTheme)
export const chatReasoningTheme = tv(reasoningTheme)
export const chatReferenceTheme = tv(referenceTheme)
export type ChatReferenceTone = NonNullable<VariantProps<typeof chatReferenceTheme>['tone']>
export const chatSkillPickerTheme = tv(skillPickerTheme)
export const chatThinkingTheme = tv(thinkingTheme)
export const chatTranscriptTheme = tv(transcriptTheme)
