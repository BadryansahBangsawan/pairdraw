import type { PairdrawWindowAPI } from './app/browser/bridge'

export {}

declare global {
  interface FilePickerAcceptType {
    description: string
    accept: Record<string, string[]>
  }

  interface FilePickerOptions {
    multiple?: boolean
    types?: FilePickerAcceptType[]
    suggestedName?: string
  }

  interface DataTransferItem {
    /** File System Access drag support; Chromium only. */
    getAsFileSystemHandle?(): Promise<FileSystemHandle | null>
  }

  interface Window {
    pairdraw?: PairdrawWindowAPI
    showOpenFilePicker?(options?: FilePickerOptions): Promise<FileSystemFileHandle[]>
    showSaveFilePicker?(options?: FilePickerOptions): Promise<FileSystemFileHandle>
    mockWindowOpen?(url: string): void
  }
}
