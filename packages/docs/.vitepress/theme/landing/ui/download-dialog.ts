import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'

const DOWNLOAD_DIALOG: InjectionKey<Ref<boolean>> = Symbol('download-dialog')

/** One download dialog for the page; each download button opens it. */
export function provideDownloadDialog(): Ref<boolean> {
  const open = ref(false)
  provide(DOWNLOAD_DIALOG, open)
  return open
}

/** Opens the page's download dialog. Without one, the button keeps its link to the page. */
export function useDownloadDialog(): { open: () => boolean } {
  const state = inject(DOWNLOAD_DIALOG, null)
  return {
    open() {
      if (!state) return false
      state.value = true
      return true
    }
  }
}
