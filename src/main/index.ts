import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { TabManager } from './tabs'

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
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
