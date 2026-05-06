export type { TabState, ChatMessage } from '../../shared/types'
import type { TabState, ChatMessage } from '../../shared/types'

export type AgentEvent =
  | { type: 'text'; text: string }
  | { type: 'toolCall'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'toolResult'; id: string; name: string; ok: boolean; text?: string; imageData?: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

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
        onStateChange: (cb: (tabs: TabState[], activeId: number | null) => void) => () => void
        setAiVisible: (id: number, visible: boolean) => Promise<void>
        rename: (id: number, title: string | undefined) => Promise<void>
        getAll: () => Promise<TabState[]>
        onSearchToggle: (cb: () => void) => () => void
      }
      view: {
        setExtraTop: (height: number) => Promise<void>
        zoomIn: () => Promise<void>
        zoomOut: () => Promise<void>
        zoomReset: () => Promise<void>
      }
      find: {
        search: (text: string, forward: boolean) => Promise<void>
        stop: () => Promise<void>
        onResult: (cb: (result: { active: number; total: number }) => void) => () => void
      }
      suggest: {
        query: (text: string) => Promise<string[]>
      }
      onFocusAddressBar: (cb: () => void) => () => void
      onFindToggle: (cb: () => void) => () => void
      ai: {
        chat: (messages: ChatMessage[], includePageContent: boolean) => Promise<void>
        onChunk: (cb: (text: string) => void) => () => void
        onDone: (cb: () => void) => () => void
        onError: (cb: (message: string) => void) => () => void
      }
      agent: {
        run: (task: string) => Promise<void>
        stop: () => Promise<void>
        onEvent: (cb: (event: AgentEvent) => void) => () => void
      }
      sidebar: {
        setWidth: (width: number) => Promise<void>
      }
      settings: {
        get: () => Promise<{ apiKey?: string; hasEnvKey: boolean }>
        save: (updates: { apiKey?: string }) => Promise<void>
      }
      memories: {
        get: () => Promise<Array<{url: string; title: string; snippet: string; timestamp: number}>>
        clear: () => Promise<void>
      }
    }
  }
}
