import { app, BrowserWindow, ipcMain, shell } from 'electron'
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

function createWindow() {
  const isMac = process.platform === 'darwin'

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    ...(isMac && { trafficLightPosition: { x: 16, y: 20 } }),
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    }
  })

  const tabs = new TabManager(win)

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
        } catch {
          // page may not support JS execution
        }
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
