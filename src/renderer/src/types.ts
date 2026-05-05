export type { TabState, ChatMessage } from '../../shared/types'
import type { TabState, ChatMessage } from '../../shared/types'

declare global {
  interface Window {
    browser: {
      ready: () => Promise<{ tabs: TabState[]; activeId: number | null }>
      tabs: {
        create: (url?: string) => Promise<number>
        close: (id: number) => Promise<void>
        switch: (id: number) => Promise<void>
        navigate: (url: string) => Promise<void>
        back: () => Promise<void>
        forward: () => Promise<void>
        reload: () => Promise<void>
        onStateChange: (
          cb: (tabs: TabState[], activeId: number | null) => void
        ) => () => void
      }
      ai: {
        chat: (messages: ChatMessage[], includePageContent: boolean) => Promise<void>
        onChunk: (cb: (text: string) => void) => () => void
        onDone: (cb: () => void) => () => void
        onError: (cb: (message: string) => void) => () => void
      }
      sidebar: {
        setWidth: (width: number) => Promise<void>
      }
      settings: {
        get: () => Promise<{ apiKey?: string; hasEnvKey: boolean }>
        save: (updates: { apiKey?: string }) => Promise<void>
      }
    }
  }
}
