import { tauriFetch } from '@/app/tauri/http'

import {
  startSignIn,
  type SignIn,
  type SignInCallback,
  type SignInFailure
} from '../sign-in/attempt'
import { loopbackRedirect } from '../sign-in/loopback'
import type { ChatGPTCredential } from './credential'
import { chatGPTAuthorizationURL, exchangeChatGPTCode } from './oauth'

export type ChatGPTSignInFailure = SignInFailure | 'port-in-use'
export type ChatGPTSignIn = SignIn<ChatGPTCredential, 'port-in-use'>

/** Takes port 1455, the one redirect OpenAI registers for the Codex client. */
async function loopbackCallback(
  state: string
): Promise<SignInCallback | { failure: 'port-in-use' }> {
  const loopback = await loopbackRedirect('chatgpt', 'ChatGPT', state)
  return loopback === 'port-in-use' ? { failure: 'port-in-use' } : loopback.callback
}

/** Signs in to ChatGPT in the system browser; the browser app cannot receive the redirect. */
export function signInWithChatGPT(signal: AbortSignal): ChatGPTSignIn {
  return startSignIn({
    signal,
    callback: loopbackCallback,
    authorizationURL: chatGPTAuthorizationURL,
    exchange: (code, verifier) => exchangeChatGPTCode(code, verifier, tauriFetch)
  })
}
