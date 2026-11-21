import { ref } from 'vue'

/** Whether the Replace fonts dialog is open. */
export const replaceFontsDialogOpen = ref(false)

export function openReplaceFontsDialog(): void {
  replaceFontsDialogOpen.value = true
}
