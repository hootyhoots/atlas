import { contextBridge, ipcRenderer } from 'electron'
import type { TabState, ChatMessage } from '../shared/types'

export type TabsStateCallback = (tabs: TabState[], activeId: number | null) => void

contextBridge.exposeInMainWorld('browser', {
  ready: (): Promise<{ tabs: TabState[]; activeId: number | null }> =>
    ipcRenderer.invoke('browser:ready'),

  tabs: {
    create: (url?: string): Promise<number> => ipcRenderer.invoke('tabs:create', url),
    close: (id: number): Promise<void> => ipcRenderer.invoke('tabs:close', id),
    switch: (id: number): Promise<void> => ipcRenderer.invoke('tabs:switch', id),
    navigate: (url: string): Promise<void> => ipcRenderer.invoke('tabs:navigate', url),
    back: (): Promise<void> => ipcRenderer.invoke('tabs:back'),
    forward: (): Promise<void> => ipcRenderer.invoke('tabs:forward'),
    reload: (): Promise<void> => ipcRenderer.invoke('tabs:reload'),

    onStateChange: (cb: TabsStateCallback): (() => void) => {
      const listener = (_event: unknown, tabs: TabState[], activeId: number | null) =>
        cb(tabs, activeId)
      ipcRenderer.on('tabs:state', listener as Parameters<typeof ipcRenderer.on>[1])
      return () =>
        ipcRenderer.removeListener('tabs:state', listener as Parameters<typeof ipcRenderer.on>[1])
    },
  },

  ai: {
    chat: (messages: ChatMessage[], includePageContent: boolean): Promise<void> =>
      ipcRenderer.invoke('ai:chat', messages, includePageContent),

    onChunk: (cb: (text: string) => void): (() => void) => {
      const listener = (_event: unknown, text: string) => cb(text)
      ipcRenderer.on('ai:chunk', listener as Parameters<typeof ipcRenderer.on>[1])
      return () =>
        ipcRenderer.removeListener('ai:chunk', listener as Parameters<typeof ipcRenderer.on>[1])
    },

    onDone: (cb: () => void): (() => void) => {
      const listener = () => cb()
      ipcRenderer.on('ai:done', listener as Parameters<typeof ipcRenderer.on>[1])
      return () =>
        ipcRenderer.removeListener('ai:done', listener as Parameters<typeof ipcRenderer.on>[1])
    },

    onError: (cb: (message: string) => void): (() => void) => {
      const listener = (_event: unknown, message: string) => cb(message)
      ipcRenderer.on('ai:error', listener as Parameters<typeof ipcRenderer.on>[1])
      return () =>
        ipcRenderer.removeListener('ai:error', listener as Parameters<typeof ipcRenderer.on>[1])
    },
  },

  sidebar: {
    setWidth: (width: number): Promise<void> => ipcRenderer.invoke('sidebar:setWidth', width),
  },

  settings: {
    get: (): Promise<{ apiKey?: string; hasEnvKey: boolean }> =>
      ipcRenderer.invoke('settings:get'),
    save: (updates: { apiKey?: string }): Promise<void> =>
      ipcRenderer.invoke('settings:save', updates),
  },
})
