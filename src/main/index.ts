import { app, BrowserWindow, ipcMain, shell, Menu, net } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { TabManager } from './tabs'
import { loadAllExtensions, installExtension, getInstalledExtensions, removeExtension } from './extensions'
import { streamChat } from './ai'
import { runAgent, stopAgent } from './agent'
import { loadSettings, getSettings, saveSettings } from './settings'
import { loadMemories, addMemory, getMemories, clearMemories } from './memories'
import { loadBookmarks, getBookmarks, addBookmark, removeBookmark, isBookmarked } from './bookmarks'
import { loadHistory, addHistoryEntry, getHistory, searchHistory, deleteHistoryEntry, clearHistory } from './history'
import type { ChatMessage } from '../shared/types'
import type { AgentEvent } from './agent'

function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^[\w-]+\.[\w.]+/.test(trimmed) && !trimmed.includes(' ')) {
    return `https://${trimmed}`
  }
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
}

function createPrivateWindow() {
  const isMac = process.platform === 'darwin'

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac && { trafficLightPosition: { x: 16, y: 20 } }),
    backgroundColor: '#1a0a2e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    }
  })

  const tabs = new TabManager(win, 'incognito')

  win.on('resize', () => tabs.updateActiveBounds())

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // After the renderer is ready, send private flag and init tabs
  win.webContents.once('did-finish-load', () => {
    win.webContents.send('window:isPrivate', true)
    tabs.create()
  })
}

function buildMenu(win: BrowserWindow, tabs: TabManager) {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => tabs.create(),
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => { if (tabs.activeTabId != null) tabs.close(tabs.activeTabId) },
        },
        { type: 'separator' },
        {
          label: 'Bookmark This Tab',
          accelerator: 'CmdOrCtrl+D',
          click: () => win.webContents.send('bookmark:toggle'),
        },
        { type: 'separator' },
        {
          label: 'New Private Window',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => createPrivateWindow(),
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
        { type: 'separator' as const },
        {
          label: 'Find in Page',
          accelerator: 'CmdOrCtrl+F',
          click: () => win.webContents.send('find:toggle'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload Page',
          accelerator: 'CmdOrCtrl+R',
          click: () => tabs.reload(),
        },
        {
          label: 'Focus Address Bar',
          accelerator: 'CmdOrCtrl+L',
          click: () => win.webContents.send('browser:focus-address-bar'),
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => tabs.zoomIn(),
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => tabs.zoomOut(),
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => tabs.resetZoom(),
        },
        { type: 'separator' },
        {
          label: 'Search Tabs',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => win.webContents.send('tabs:search-toggle'),
        },
        { type: 'separator' },
        {
          label: 'Reader Mode',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: async () => {
            const wc = tabs.getActiveWebContents()
            if (!wc) return
            const isReader: boolean = await wc.executeJavaScript('!!document.__readerActive').catch(() => false)
            if (isReader) { wc.reload(); return }
            wc.executeJavaScript(`
              (async () => {
                if (!window.Readability) {
                  await new Promise((res, rej) => {
                    const s = document.createElement('script')
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Readability/0.5.0/Readability.min.js'
                    s.onload = res; s.onerror = rej
                    document.head.appendChild(s)
                  })
                }
                const doc = document.cloneNode(true)
                const article = new window.Readability(doc).parse()
                if (!article) return
                document.body.innerHTML = '<div style="max-width:720px;margin:40px auto;font-family:-apple-system,sans-serif;font-size:18px;line-height:1.7;color:#1a1a1a;padding:0 20px"><h1 style=\\"font-size:2em;margin-bottom:8px\\">' + article.title + '</h1><div style=\\"color:#888;margin-bottom:32px\\">' + (article.byline||'') + '</div>' + article.content + '</div>'
                document.body.style.background = '#fafafa'
                document.__readerActive = true
              })()
            `).catch(() => {})
          },
        },
        {
          label: 'Downloads',
          accelerator: 'CmdOrCtrl+J',
          click: () => win.webContents.send('downloads:toggle'),
        },
        { type: 'separator' },
        { role: 'toggleDevTools' as const },
      ],
    },
    {
      label: 'History',
      submenu: [
        {
          label: 'Back',
          accelerator: isMac ? 'Cmd+[' : 'Alt+Left',
          click: () => tabs.back(),
        },
        {
          label: 'Forward',
          accelerator: isMac ? 'Cmd+]' : 'Alt+Right',
          click: () => tabs.forward(),
        },
        { type: 'separator' },
        {
          label: 'Reopen Last Closed Tab',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => tabs.reopenLastClosed(),
        },
      ],
    },
    {
      label: 'Tab',
      submenu: [
        {
          label: 'Previous Tab',
          accelerator: isMac ? 'Cmd+Shift+[' : 'Ctrl+Shift+Tab',
          click: () => tabs.switchRelative(-1),
        },
        {
          label: 'Next Tab',
          accelerator: isMac ? 'Cmd+Shift+]' : 'Ctrl+Tab',
          click: () => tabs.switchRelative(1),
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
  if (!isMac) win.setMenuBarVisibility(false)
}

const BLOCK_LIST = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'ads.yahoo.com', 'adsystem.amazon.com', 'facebook.com/tr',
  'connect.facebook.net', 'analytics.google.com', 'google-analytics.com',
  'googletagmanager.com', 'hotjar.com', 'mixpanel.com', 'segment.com',
  'scorecardresearch.com', 'quantserve.com', 'adnxs.com', 'rubiconproject.com',
  'openx.net', 'pubmatic.com', 'criteo.com', 'outbrain.com', 'taboola.com',
  'amazon-adsystem.com', 'moatads.com', 'advertising.com', 'casalemedia.com',
]

function createWindow() {
  const isMac = process.platform === 'darwin'

  // Session restore
  const sessionFile = join(app.getPath('userData'), 'atlas-session.json')
  let restoredUrls: string[] = []
  try {
    if (existsSync(sessionFile)) {
      const sessionData = JSON.parse(readFileSync(sessionFile, 'utf-8'))
      restoredUrls = sessionData
        .map((s: { url: string }) => s.url)
        .filter((u: string) => u && u.startsWith('http'))
    }
  } catch {}

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac && { trafficLightPosition: { x: 16, y: 20 } }),
    backgroundColor: '#161618',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    }
  })

  // Windows window control IPC
  if (!isMac) {
    ipcMain.handle('window:isMaximized', () => win.isMaximized())
    ipcMain.on('window:minimize', () => win.minimize())
    ipcMain.on('window:maximize', () => { win.isMaximized() ? win.unmaximize() : win.maximize() })
    ipcMain.on('window:close', () => win.close())
    win.on('maximize', () => win.webContents.send('window:maximized', true))
    win.on('unmaximize', () => win.webContents.send('window:maximized', false))
  }

  const tabs = new TabManager(win)

  buildMenu(win, tabs)

  ipcMain.handle('browser:ready', () => {
    tabs.setRendererReady()
    return tabs.getInitialState()
  })

  ipcMain.handle('tabs:create', (_, url?: string) => tabs.create(url))
  ipcMain.handle('tabs:close', (_, id: number) => tabs.close(id))
  ipcMain.handle('tabs:switch', (_, id: number) => tabs.switchTo(id))
  ipcMain.handle('tabs:navigate', (_, raw: string) => tabs.navigate(normalizeUrl(raw)))
  ipcMain.handle('tabs:back', () => tabs.back())
  ipcMain.handle('tabs:forward', () => tabs.forward())
  ipcMain.handle('tabs:reload', () => tabs.reload())
  ipcMain.handle('tabs:setAiVisible', (_, id: number, visible: boolean) => tabs.setAiVisible(id, visible))
  ipcMain.handle('tabs:rename', (_, id: number, title: string | undefined) => tabs.renameTab(id, title))
  ipcMain.handle('tabs:getAll', () => tabs.getAllStates())
  ipcMain.handle('memories:get', () => getMemories())
  ipcMain.handle('memories:clear', () => clearMemories())

  ipcMain.handle('sidebar:setWidth', (_, width: number) => tabs.setSidebarWidth(width))
  ipcMain.handle('view:setExtraTop', (_, height: number) => tabs.setExtraTop(height))

  ipcMain.handle('view:zoom-in', () => tabs.zoomIn())
  ipcMain.handle('view:zoom-out', () => tabs.zoomOut())
  ipcMain.handle('view:zoom-reset', () => tabs.resetZoom())

  ipcMain.handle('find:search', (_, text: string, forward: boolean) => tabs.findInPage(text, forward))
  ipcMain.handle('find:stop', () => tabs.stopFindInPage())

  ipcMain.handle('suggest:query', async (_, query: string) => {
    if (!query.trim()) return []
    try {
      const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`
      const resp = await net.fetch(url)
      const data = await resp.json() as [string, string[]]
      return (data[1] ?? []).slice(0, 6)
    } catch {
      return []
    }
  })

  ipcMain.handle('settings:get', () => ({
    ...getSettings(),
    hasEnvKey: !!process.env['ANTHROPIC_API_KEY'],
  }))

  ipcMain.handle('settings:save', (_, updates: { apiKey?: string }) => saveSettings(updates))

  tabs.setPageLoadCallback(async (id, url, title, favicon, wc) => {
    addHistoryEntry(url, title, favicon)
    if (tabs.getAiVisible(id)) {
      try {
        const snippet: string = await wc.executeJavaScript('document.body?.innerText?.slice(0,400)??""')
        addMemory(url, title, snippet)
      } catch {}
    }
  })

  ipcMain.handle('ai:chat', async (event, messages: ChatMessage[], includePageContent: boolean) => {
    let pageContent: string | null = null
    if (includePageContent) {
      const wc = tabs.getActiveWebContents()
      if (wc) {
        try {
          pageContent = await wc.executeJavaScript('document.body.innerText.slice(0, 10000)')
        } catch {}
      }
    }
    const { apiKey } = getSettings()
    try {
      await streamChat(messages, pageContent, apiKey || undefined, getMemories(), (chunk) => {
        event.sender.send('ai:chunk', chunk)
      })
      event.sender.send('ai:done')
    } catch (err) {
      event.sender.send('ai:error', err instanceof Error ? err.message : String(err))
    }
  })

  ipcMain.handle('agent:run', async (event, task: string) => {
    const wc = tabs.getActiveWebContents()
    if (!wc) {
      event.sender.send('agent:event', { type: 'error', message: 'No active tab' } satisfies AgentEvent)
      return
    }
    const { apiKey } = getSettings()
    runAgent(task, wc, (url) => tabs.navigate(normalizeUrl(url)), apiKey || undefined, (evt: AgentEvent) => {
      event.sender.send('agent:event', evt)
    })
  })

  ipcMain.handle('agent:stop', () => stopAgent())

  // Bookmarks IPC
  ipcMain.handle('bookmarks:get', () => getBookmarks())
  ipcMain.handle('bookmarks:add', (_, title: string, url: string, favicon?: string, folderId?: string) =>
    addBookmark({ title, url, favicon, folderId }))
  ipcMain.handle('bookmarks:remove', (_, id: string) => removeBookmark(id))
  ipcMain.handle('bookmarks:isBookmarked', (_, url: string) => isBookmarked(url))

  // History IPC
  ipcMain.handle('history:get', () => getHistory())
  ipcMain.handle('history:search', (_, q: string) => searchHistory(q))
  ipcMain.handle('history:delete', (_, visitedAt: number) => deleteHistoryEntry(visitedAt))
  ipcMain.handle('history:clear', () => clearHistory())

  // Downloads IPC
  ipcMain.handle('downloads:open', (_, savePath: string) => shell.openPath(savePath))
  ipcMain.handle('downloads:showInFolder', (_, savePath: string) => shell.showItemInFolder(savePath))

  // Tab operations IPC
  ipcMain.handle('tabs:pin', (_, id: number, pinned: boolean) => tabs.pinTab(id, pinned))
  ipcMain.handle('tabs:lock', (_, id: number, locked: boolean) => tabs.lockTab(id, locked))
  ipcMain.handle('tabs:mute', (_, id: number, muted: boolean) => tabs.muteTab(id, muted))
  ipcMain.handle('tabs:duplicate', (_, id: number) => tabs.duplicateTab(id))
  ipcMain.handle('tabs:closeToRight', (_, id: number) => tabs.closeToRight(id))
  ipcMain.handle('tabs:closeOthers', (_, id: number) => tabs.closeOthers(id))
  ipcMain.handle('tabs:reopenLast', () => tabs.reopenLastClosed())
  ipcMain.handle('tabs:getRecentlyClosed', () => tabs.getRecentlyClosed())

  // Tab context menu
  ipcMain.handle('tabs:showContextMenu', (_, id: number) => {
    const allStates = tabs.getAllStates()
    const tab = allStates.find(t => t.id === id)
    if (!tab) return
    const menu = Menu.buildFromTemplate([
      {
        label: tab.pinned ? 'Unpin Tab' : 'Pin Tab',
        click: () => tabs.pinTab(id, !tab.pinned),
      },
      {
        label: tab.locked ? 'Unlock Tab' : 'Lock Tab',
        click: () => tabs.lockTab(id, !tab.locked),
      },
      {
        label: tab.muted ? 'Unmute Tab' : 'Mute Tab',
        click: () => tabs.muteTab(id, !tab.muted),
      },
      { type: 'separator' },
      {
        label: 'Duplicate Tab',
        click: () => tabs.duplicateTab(id),
      },
      {
        label: 'Close Tabs to the Right',
        click: () => tabs.closeToRight(id),
      },
      {
        label: 'Close Other Tabs',
        click: () => tabs.closeOthers(id),
      },
      { type: 'separator' },
      {
        label: 'Rename Tab',
        click: () => win.webContents.send('tab:startRename', id),
      },
    ])
    menu.popup({ window: win })
  })

  // Reader mode IPC
  ipcMain.handle('reader:toggle', async () => {
    const wc = tabs.getActiveWebContents()
    if (!wc) return
    const isReader: boolean = await wc.executeJavaScript('!!document.__readerActive').catch(() => false)
    if (isReader) {
      wc.reload()
      return
    }
    await wc.executeJavaScript(`
      (async () => {
        if (!window.Readability) {
          await new Promise((res, rej) => {
            const s = document.createElement('script')
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Readability/0.5.0/Readability.min.js'
            s.onload = res; s.onerror = rej
            document.head.appendChild(s)
          })
        }
        const doc = document.cloneNode(true)
        const article = new window.Readability(doc).parse()
        if (!article) return
        document.body.innerHTML = '<div style="max-width:720px;margin:40px auto;font-family:-apple-system,sans-serif;font-size:18px;line-height:1.7;color:#1a1a1a;padding:0 20px"><h1 style=\\"font-size:2em;margin-bottom:8px\\">' + article.title + '</h1><div style=\\"color:#888;margin-bottom:32px\\">' + (article.byline||'') + '</div>' + article.content + '</div>'
        document.body.style.background = '#fafafa'
        document.__readerActive = true
      })()
    `).catch(() => {})
  })

  // Bookmark bar visibility
  ipcMain.handle('bookmarkBar:setVisible', (_, visible: boolean) => tabs.setBookmarkBarVisible(visible))

  // Extensions IPC
  ipcMain.handle('extensions:list', () => getInstalledExtensions())
  ipcMain.handle('extensions:install', async (event) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender)
    if (!senderWin) return null
    return installExtension(senderWin)
  })
  ipcMain.handle('extensions:remove', (_, id: string) => removeExtension(id))

  // Setup ad blocker
  win.webContents.session.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    const settings = getSettings()
    if (settings.adBlockEnabled === false) {
      callback({ cancel: false })
      return
    }
    const url = details.url
    const blocked = BLOCK_LIST.some(domain => url.includes(domain))
    callback({ cancel: blocked })
  })

  // Setup download manager
  win.webContents.session.on('will-download', (_event, item) => {
    const id = `dl_${Date.now()}`
    const dl = {
      id,
      filename: item.getFilename(),
      url: item.getURL(),
      totalBytes: item.getTotalBytes(),
      receivedBytes: 0,
      state: 'progressing' as const,
      savePath: '',
    }
    win.webContents.send('download:start', dl)

    item.on('updated', (__, state) => {
      win.webContents.send('download:progress', {
        id,
        state,
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
      })
    })

    item.once('done', (__, state) => {
      win.webContents.send('download:done', { id, state, savePath: item.getSavePath() })
    })
  })

  // Session save on quit
  app.on('before-quit', () => {
    const allTabs = tabs.getAllStates()
    const sessionData = allTabs.map(t => ({ url: t.url, pinned: t.pinned }))
    try { writeFileSync(sessionFile, JSON.stringify(sessionData), 'utf-8') } catch {}
  })

  win.on('resize', () => tabs.updateActiveBounds())

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Restore session or create default tab
  if (restoredUrls.length > 0) {
    restoredUrls.forEach(url => tabs.create(url))
  } else {
    tabs.create()
  }
}

app.whenReady().then(async () => {
  loadSettings()
  loadMemories()
  loadBookmarks()
  loadHistory()
  await loadAllExtensions()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
