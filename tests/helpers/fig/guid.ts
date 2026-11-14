import type { GUID } from '@pairdraw/kiwi/fig'

export function guid(localID: number, sessionID = 1): GUID {
  return { sessionID, localID }
}
