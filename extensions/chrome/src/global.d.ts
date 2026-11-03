/**
 * The parts of the Chrome extension API the capture extension calls, declared here because the
 * repository does not install `@types/chrome`. Signatures follow developer.chrome.com.
 */
declare namespace chrome {
  namespace runtime {
    interface MessageSender {
      id?: string
      tab?: tabs.Tab
    }
    const id: string
    function sendMessage(message: unknown): Promise<unknown>
    const onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: MessageSender,
          sendResponse: (response: unknown) => void
        ) => boolean | undefined
      ): void
    }
  }

  namespace tabs {
    interface Tab {
      id?: number
      url?: string
    }
    function query(queryInfo: { active: boolean; currentWindow: boolean }): Promise<Tab[]>
    function sendMessage(tabId: number, message: unknown): Promise<unknown>
  }

  namespace scripting {
    function executeScript(injection: {
      target: { tabId: number }
      files: string[]
    }): Promise<unknown[]>
  }

  namespace i18n {
    function getMessage(messageName: string, substitutions?: string | string[]): string
    function getUILanguage(): string
  }

  namespace permissions {
    interface Permissions {
      origins?: string[]
    }
    function contains(permissions: Permissions): Promise<boolean>
    function request(permissions: Permissions): Promise<boolean>
    function remove(permissions: Permissions): Promise<boolean>
  }
}
