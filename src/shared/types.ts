export interface TabState {
  id: number
  title: string
  url: string
  favicon: string
  isLoading: boolean
  canGoBack: boolean
  canGoForward: boolean
  aiVisible: boolean
  customTitle?: string
  pinned?: boolean
  locked?: boolean
  muted?: boolean
  audioPlaying?: boolean
  isNewTab?: boolean
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
