export interface TabState {
  id: number
  title: string
  url: string
  favicon: string
  isLoading: boolean
  canGoBack: boolean
  canGoForward: boolean
}

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
    }
  }
}
