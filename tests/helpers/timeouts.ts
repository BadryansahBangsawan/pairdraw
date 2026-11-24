/**
 * The boot allowances the editor helpers wait with, and the budget a test or hook that boots the
 * editor gets. One constant, so a wait can never outlive the timeout that governs it.
 */

/** One wait: the canvas, the loading overlay, the loader, and the boot splash each get this. */
export const EDITOR_BOOT_WAIT_MS = 30_000

/**
 * Booting the editor: navigation, then three sequential boot waits, each allowed
 * `EDITOR_BOOT_WAIT_MS`, plus one second for the helper's own failure to surface. A test or hook that
 * boots the editor takes this, instead of the project's default work budget alone.
 */
export const EDITOR_SETUP_TIMEOUT_MS = EDITOR_BOOT_WAIT_MS * 4 + 1_000
