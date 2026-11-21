import type { InjectionKey, Ref } from 'vue'

import type { TokenDriftKind } from '@pairdraw/core/io/formats/design-tokens'
import { useI18n } from '@pairdraw/vue/i18n'

/**
 * How each variable differs from the linked stylesheet, by variable id: what the rows of the
 * variables table mark. Without a link, or where nothing differs, the map is empty.
 */
export const TOKEN_DRIFT: InjectionKey<Readonly<Ref<ReadonlyMap<string, TokenDriftKind>>>> =
  Symbol('token-drift')

/** What each kind of drift is called, in the table's marks and the review alike. */
export function useDriftLabels(): (kind: TokenDriftKind) => string {
  const { variables } = useI18n()
  return (kind) =>
    ({
      code: variables.value.syncChangedInCode,
      canvas: variables.value.syncChangedOnCanvas,
      conflict: variables.value.syncChangedInBoth,
      added: variables.value.syncNewInCode,
      missing: variables.value.syncNoLongerInCode,
      deleted: variables.value.syncDeletedOnCanvas
    })[kind]
}
