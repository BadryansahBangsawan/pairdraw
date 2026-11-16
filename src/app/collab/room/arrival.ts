/** What opening a page does about the room its address names. */
export type RoomArrival =
  | { action: 'join'; roomId: string }
  | { action: 'unavailable' }
  | { action: 'none' }

/**
 * The room a `/rooms/<id>` address names, or `unavailable` where this build leaves live rooms out
 * (`COLLABORATION_INCLUDED`): the link then opens what any other address opens, and the page says
 * why instead of showing an address it knows nothing to do with.
 */
export function roomArrival(
  roomId: string | undefined,
  { included }: { included: boolean }
): RoomArrival {
  if (roomId === undefined) return { action: 'none' }
  return included ? { action: 'join', roomId } : { action: 'unavailable' }
}
