import { contextBridge, ipcRenderer } from 'electron'
import type { TabState, ChatMessage } from '../shared/types'

export type TabsStateCallback = (tabs: TabState[], activeId: number | null) => void

function on(channel: string, cb: (...args: unknown[]) => void): () => void {
  const listener = (_event: unknown, ...args: unknown[]) => cb(...args)
  ipcRenderer.on(channel, listener as Parameters<typeof ipcRenderer.on>[1])
  return () => ipcRenderer.removeListener(channel, listener as Parameters<typeof ipcRenderer.on>[1])
}

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
    onStateChange: (cb: TabsStateCallback): (() => void) =>
      on('tabs:state', (tabs, activeId) => cb(tabs as TabState[], activeId as number | null)),
  },

  view: {
    setExtraTop: (height: number): Promise<void> => ipcRenderer.invoke('view:setExtraTop', height),
    zoomIn: (): Promise<void> => ipcRenderer.invoke('view:zoom-in'),
    zoomOut: (): Promise<void> => ipcRenderer.invoke('view:zoom-out'),
    zoomReset: (): Promise<void> => ipcRenderer.invoke('view:zoom-reset'),
  },

  find: {
    search: (text: string, forward: boolean): Promise<void> =>
      ipcRenderer.invoke('find:search', text, forward),
    stop: (): Promise<void> => ipcRenderer.invoke('find:stop'),
    onResult: (cb: (result: { active: number; total: number }) => void): (() => void) =>
      on('find:result', (result) => cb(result as { active: number; total: number })),
  },

  suggest: {
    query: (text: string): Promise<string[]> => ipcRenderer.invoke('suggest:query', text),
  },

  onFocusAddressBar: (cb: () => void): (() => void) =>
    on('browser:focus-address-bar', () => cb()),

  onFindToggle: (cb: () => void): (() => void) =>
    on('find:toggle', () => cb()),

  ai: {
    chat: (messages: ChatMessage[], includePageContent: boolean): Promise<void> =>
      ipcRenderer.invoke('ai:chat', messages, includePageContent),
    onChunk: (cb: (text: string) => void): (() => void) =>
      on('ai:chunk', (text) => cb(text as string)),
    onDone: (cb: () => void): (() => void) =>
      on('ai:done', () => cb()),
    onError: (cb: (message: string) => void): (() => void) =>
      on('ai:error', (msg) => cb(msg as string)),
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
