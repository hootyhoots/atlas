import { app, BrowserWindow, ipcMain, shell, Menu, net } from 'electron'
import { join } from 'path'
import { TabManager } from './tabs'
import { streamChat } from './ai'
import { loadSettings, getSettings, saveSettings } from './settings'
import type { ChatMessage } from '../shared/types'

function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^[\w-]+\.[\w.]+/.test(trimmed) && !trimmed.includes(' ')) {
    return `https://${trimmed}`
  }
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
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

function createWindow() {
  const isMac = process.platform === 'darwin'

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
      await streamChat(messages, pageContent, apiKey || undefined, (chunk) => {
        event.sender.send('ai:chunk', chunk)
      })
      event.sender.send('ai:done')
    } catch (err) {
      event.sender.send('ai:error', err instanceof Error ? err.message : String(err))
    }
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

  tabs.create()
}

app.whenReady().then(() => {
  loadSettings()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
