import { tryOnScopeDispose } from '@vueuse/core'
import { computed, ref, watch, type Ref } from 'vue'

import { testMCPConnection, type MCPConnectionTestResult } from '../client/test'
import {
  mcpConnectionSignedIn,
  signInToMCPConnection,
  signOutOfMCPConnection,
  type MCPSignIn,
  type MCPSignInFailure
} from '../oauth/sign-in'
import type { MCPConnection } from '../types'

export type MCPSignInStatus = 'idle' | 'waiting' | MCPSignInFailure
export type MCPTestStatus = 'idle' | 'testing' | 'done'

const accessServices = {
  signIn: signInToMCPConnection,
  signOut: signOutOfMCPConnection,
  signedIn: mcpConnectionSignedIn,
  test: testMCPConnection
}

export type MCPAccessServices = typeof accessServices

/**
 * Signing in to a saved OAuth connection and testing a saved connection. Both act on the
 * connection as saved, so they wait while the editor has unsaved changes.
 */
export function useMCPConnectionAccess(
  saved: Readonly<Ref<MCPConnection | undefined>>,
  dirty: Readonly<Ref<boolean>>,
  overrides: Partial<MCPAccessServices> = {}
) {
  const services: MCPAccessServices = { ...accessServices, ...overrides }
  const signedIn = ref(false)
  const signInStatus = ref<MCPSignInStatus>('idle')
  const testStatus = ref<MCPTestStatus>('idle')
  const testResult = ref<MCPConnectionTestResult | null>(null)
  let attempt: { signIn: MCPSignIn; controller: AbortController } | null = null
  let loading = 0
  let testing = 0

  /** The saved remote connection that signs in with OAuth, when the editor shows it unchanged. */
  const oauthTarget = computed(() => {
    const connection = saved.value
    if (connection?.authentication.type !== 'oauth') return null
    return connection.transport.type === 'streamable-http'
      ? { id: connection.id, url: connection.transport.url }
      : null
  })
  const canSignIn = computed(() => oauthTarget.value !== null && !dirty.value)
  const canTest = computed(() => saved.value !== undefined && !dirty.value)

  /** Read through a call, since a later click may have replaced the attempt while this one ran. */
  function currentAttempt() {
    return attempt
  }

  function stopAttempt(): void {
    attempt?.controller.abort()
    attempt = null
  }

  watch(
    () => saved.value?.id,
    async (id) => {
      const request = ++loading
      testing++
      stopAttempt()
      signInStatus.value = 'idle'
      testStatus.value = 'idle'
      testResult.value = null
      signedIn.value = false
      if (!id || !oauthTarget.value) return
      const known = await services.signedIn(id).catch(() => false)
      if (request === loading) signedIn.value = known
    },
    { immediate: true }
  )

  tryOnScopeDispose(() => {
    loading++
    testing++
    stopAttempt()
  })

  /** Starts sign-in; called from the click, so the web app's popup is allowed to open. */
  async function signIn(): Promise<void> {
    const target = oauthTarget.value
    if (!target || !canSignIn.value) return
    stopAttempt()
    const controller = new AbortController()
    const signIn = services.signIn(target, controller.signal)
    attempt = { signIn, controller }
    signInStatus.value = 'waiting'
    const result = await signIn.result
    if (currentAttempt()?.signIn !== signIn) return
    attempt = null
    if (result.ok) {
      signedIn.value = true
      signInStatus.value = 'idle'
    } else {
      signInStatus.value = result.reason
    }
  }

  function reopen(): void {
    attempt?.signIn.reopen()
  }

  function cancel(): void {
    stopAttempt()
    signInStatus.value = 'cancelled'
  }

  async function signOut(): Promise<void> {
    const target = oauthTarget.value
    if (!target) return
    stopAttempt()
    await services.signOut(target.id)
    signedIn.value = false
    signInStatus.value = 'idle'
  }

  async function test(): Promise<void> {
    const connection = saved.value
    if (!connection || !canTest.value) return
    const request = ++testing
    testStatus.value = 'testing'
    testResult.value = null
    const result = await services.test(connection)
    if (request !== testing) return
    testResult.value = result
    testStatus.value = 'done'
    if (connection.authentication.type === 'oauth') signedIn.value = result.ok || signedIn.value
  }

  return {
    signedIn,
    signInStatus,
    canSignIn,
    canTest,
    testStatus,
    testResult,
    signIn,
    reopen,
    cancel,
    signOut,
    test
  }
}
