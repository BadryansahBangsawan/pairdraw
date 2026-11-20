import { formatStorageBytes } from '@/app/storage/format-bytes'
import { progressPercent } from '@/components/ui/feedback/progress'

import type { UpdaterMessages } from './messages'

export interface DownloadProgress {
  downloaded: number
  total?: number
}

export function downloadProgressLabel(
  messages: UpdaterMessages,
  { downloaded, total }: DownloadProgress,
  locale: string
): string {
  if (!total) {
    return messages.downloadProgressUnknown({ downloaded: formatStorageBytes(downloaded, locale) })
  }
  return messages.downloadProgress({
    percent: progressPercent({ value: downloaded, max: total }) ?? 0,
    downloaded: formatStorageBytes(downloaded, locale),
    total: formatStorageBytes(total, locale)
  })
}
