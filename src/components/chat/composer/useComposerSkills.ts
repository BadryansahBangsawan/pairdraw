import { computed } from 'vue'

import { useAIChat } from '@/app/ai/chat/use'
import { runnableSkills } from '@/app/ai/skills/invoke'
import { enabledSkills, refreshSkills } from '@/app/ai/skills/library'

/**
 * What the composer's skill menu offers: the skills the user can run by name, as `/` does. An
 * ACP agent runs its own skills and commands, so the menu is not offered to one.
 */
export function useComposerSkills() {
  const { providerID } = useAIChat()
  const offered = computed(() => !providerID.value.startsWith('acp:'))
  const skills = computed(() => runnableSkills(enabledSkills.value))
  return { offered, skills, refresh: () => void refreshSkills() }
}
