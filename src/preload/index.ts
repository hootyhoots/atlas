import { contextBridge, ipcRenderer } from 'electron'
import type { TabState } from '../shared/types'

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
})
