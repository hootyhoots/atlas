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
    setAiVisible: (id: number, visible: boolean): Promise<void> => ipcRenderer.invoke('tabs:setAiVisible', id, visible),
    rename: (id: number, title: string | undefined): Promise<void> => ipcRenderer.invoke('tabs:rename', id, title),
    getAll: (): Promise<TabState[]> => ipcRenderer.invoke('tabs:getAll'),
    onSearchToggle: (cb: () => void): (() => void) => on('tabs:search-toggle', () => cb()),
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

  agent: {
    run: (task: string): Promise<void> => ipcRenderer.invoke('agent:run', task),
    stop: (): Promise<void> => ipcRenderer.invoke('agent:stop'),
    onEvent: (cb: (event: unknown) => void): (() => void) =>
      on('agent:event', (evt) => cb(evt)),
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

  memories: {
    get: (): Promise<Array<{url: string; title: string; snippet: string; timestamp: number}>> =>
      ipcRenderer.invoke('memories:get'),
    clear: (): Promise<void> => ipcRenderer.invoke('memories:clear'),
  },

  bookmarks: {
    get: (): Promise<{ bookmarks: Array<{id: string; title: string; url: string; favicon?: string; folderId?: string; createdAt: number}>; folders: Array<{id: string; name: string; parentId?: string}> }> =>
      ipcRenderer.invoke('bookmarks:get'),
    add: (title: string, url: string, favicon?: string, folderId?: string): Promise<{id: string; title: string; url: string; favicon?: string; folderId?: string; createdAt: number}> =>
      ipcRenderer.invoke('bookmarks:add', title, url, favicon, folderId),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('bookmarks:remove', id),
    isBookmarked: (url: string): Promise<boolean> => ipcRenderer.invoke('bookmarks:isBookmarked', url),
    onToggle: (cb: () => void): (() => void) => on('bookmark:toggle', () => cb()),
  },

  history: {
    get: (): Promise<Array<{url: string; title: string; favicon?: string; visitedAt: number}>> =>
      ipcRenderer.invoke('history:get'),
    search: (q: string): Promise<Array<{url: string; title: string; favicon?: string; visitedAt: number}>> =>
      ipcRenderer.invoke('history:search', q),
    delete: (visitedAt: number): Promise<void> => ipcRenderer.invoke('history:delete', visitedAt),
    clear: (): Promise<void> => ipcRenderer.invoke('history:clear'),
  },

  downloads: {
    open: (savePath: string): Promise<void> => ipcRenderer.invoke('downloads:open', savePath),
    showInFolder: (savePath: string): Promise<void> => ipcRenderer.invoke('downloads:showInFolder', savePath),
    onStart: (cb: (dl: {id: string; filename: string; url: string; totalBytes: number; receivedBytes: number; state: string; savePath: string}) => void): (() => void) =>
      on('download:start', (dl) => cb(dl as {id: string; filename: string; url: string; totalBytes: number; receivedBytes: number; state: string; savePath: string})),
    onProgress: (cb: (info: {id: string; state: string; receivedBytes: number; totalBytes: number}) => void): (() => void) =>
      on('download:progress', (info) => cb(info as {id: string; state: string; receivedBytes: number; totalBytes: number})),
    onDone: (cb: (info: {id: string; state: string; savePath: string}) => void): (() => void) =>
      on('download:done', (info) => cb(info as {id: string; state: string; savePath: string})),
    onToggle: (cb: () => void): (() => void) => on('downloads:toggle', () => cb()),
  },

  tabs_extra: {
    pin: (id: number, pinned: boolean): Promise<void> => ipcRenderer.invoke('tabs:pin', id, pinned),
    lock: (id: number, locked: boolean): Promise<void> => ipcRenderer.invoke('tabs:lock', id, locked),
    mute: (id: number, muted: boolean): Promise<void> => ipcRenderer.invoke('tabs:mute', id, muted),
    duplicate: (id: number): Promise<void> => ipcRenderer.invoke('tabs:duplicate', id),
    closeToRight: (id: number): Promise<void> => ipcRenderer.invoke('tabs:closeToRight', id),
    closeOthers: (id: number): Promise<void> => ipcRenderer.invoke('tabs:closeOthers', id),
    reopenLast: (): Promise<void> => ipcRenderer.invoke('tabs:reopenLast'),
    getRecentlyClosed: (): Promise<Array<{url: string; title: string; favicon: string}>> =>
      ipcRenderer.invoke('tabs:getRecentlyClosed'),
    showContextMenu: (id: number): Promise<void> => ipcRenderer.invoke('tabs:showContextMenu', id),
    onStartRename: (cb: (id: number) => void): (() => void) =>
      on('tab:startRename', (id) => cb(id as number)),
  },

  reader: {
    toggle: (): Promise<void> => ipcRenderer.invoke('reader:toggle'),
  },

  bookmarkBar: {
    setVisible: (visible: boolean): Promise<void> => ipcRenderer.invoke('bookmarkBar:setVisible', visible),
  },
})
