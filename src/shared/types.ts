export interface TabState {
  id: number
  title: string
  url: string
  favicon: string
  isLoading: boolean
  canGoBack: boolean
  canGoForward: boolean
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
