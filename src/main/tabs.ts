import { WebContentsView, BrowserWindow } from 'electron'
import type { TabState } from '../shared/types'

export type { TabState }
export const CHROME_HEIGHT = 82

interface Tab {
  view: WebContentsView
  state: TabState
}

export class TabManager {
  private tabs = new Map<number, Tab>()
  private activeId: number | null = null
  private nextId = 1
  private win: BrowserWindow
  private rendererReady = false
  private sidebarWidth = 0
  private extraTop = 0
  private partition?: string
  private onPageLoadCb?: (id: number, url: string, title: string, wc: Electron.WebContents) => void

  constructor(win: BrowserWindow, partition?: string) {
    this.win = win
    this.partition = partition
  }

  setPageLoadCallback(cb: (id: number, url: string, title: string, wc: Electron.WebContents) => void) {
    this.onPageLoadCb = cb
  }

  get activeTabId(): number | null {
    return this.activeId
  }

  setRendererReady() {
    this.rendererReady = true
    this.pushState()
  }

  create(url = 'https://www.google.com'): number {
    const id = this.nextId++
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        ...(this.partition ? { partition: this.partition } : {}),
      }
    })

    const state: TabState = {
      id,
      title: 'New Tab',
      url,
      favicon: '',
      isLoading: true,
      canGoBack: false,
      canGoForward: false,
      aiVisible: true,
      customTitle: undefined,
    }

    this.win.contentView.addChildView(view)
    this.tabs.set(id, { view, state })

    const wc = view.webContents

    wc.on('page-title-updated', (_, title) => {
      state.title = title
      this.pushState()
    })

    wc.on('page-favicon-updated', (_, favicons) => {
      state.favicon = favicons[0] ?? ''
      this.pushState()
    })

    wc.on('did-navigate', (_, navUrl) => {
      state.url = navUrl
      state.canGoBack = wc.canGoBack()
      state.canGoForward = wc.canGoForward()
      this.pushState()
    })

    wc.on('did-navigate-in-page', (_, navUrl) => {
      state.url = navUrl
      state.canGoBack = wc.canGoBack()
      state.canGoForward = wc.canGoForward()
      this.pushState()
    })

    wc.on('did-start-loading', () => {
      state.isLoading = true
      this.pushState()
    })

    wc.on('did-stop-loading', () => {
      state.isLoading = false
      state.canGoBack = wc.canGoBack()
      state.canGoForward = wc.canGoForward()
      this.pushState()
      this.onPageLoadCb?.(id, state.url, state.title, wc)
    })

    wc.on('found-in-page', (_, result) => {
      this.win.webContents.send('find:result', {
        active: result.activeMatchOrdinal,
        total: result.matches,
      })
    })

    view.setVisible(false)
    wc.loadURL(url)
    this.switchTo(id)
    return id
  }

  close(id: number) {
    const tab = this.tabs.get(id)
    if (!tab) return

    this.win.contentView.removeChildView(tab.view)
    tab.view.webContents.close()
    this.tabs.delete(id)

    if (this.activeId === id) {
      const remaining = [...this.tabs.keys()]
      if (remaining.length > 0) {
        this.switchTo(remaining[remaining.length - 1])
      } else {
        this.activeId = null
        this.create()
      }
    }

    this.pushState()
  }

  switchTo(id: number) {
    this.activeId = id

    for (const [tabId, { view }] of this.tabs) {
      if (tabId === id) {
        view.setVisible(true)
        this.updateBounds(view)
      } else {
        view.setVisible(false)
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
      }
    }

    this.pushState()
  }

  switchRelative(delta: number) {
    const ids = [...this.tabs.keys()]
    const idx = ids.indexOf(this.activeId ?? -1)
    if (idx === -1 || ids.length < 2) return
    this.switchTo(ids[(idx + delta + ids.length) % ids.length])
  }

  navigate(url: string) {
    const tab = this.activeTab
    if (tab) tab.view.webContents.loadURL(url)
  }

  back() {
    const wc = this.activeTab?.view.webContents
    if (wc?.canGoBack()) wc.goBack()
  }

  forward() {
    const wc = this.activeTab?.view.webContents
    if (wc?.canGoForward()) wc.goForward()
  }

  reload() {
    this.activeTab?.view.webContents.reload()
  }

  zoomIn() {
    const wc = this.activeTab?.view.webContents
    if (wc) wc.setZoomLevel(Math.min(wc.getZoomLevel() + 0.5, 5))
  }

  zoomOut() {
    const wc = this.activeTab?.view.webContents
    if (wc) wc.setZoomLevel(Math.max(wc.getZoomLevel() - 0.5, -5))
  }

  resetZoom() {
    this.activeTab?.view.webContents.setZoomLevel(0)
  }

  findInPage(text: string, forward = true) {
    const wc = this.activeTab?.view.webContents
    if (wc && text) wc.findInPage(text, { forward, findNext: true })
  }

  stopFindInPage() {
    this.activeTab?.view.webContents.stopFindInPage('clearSelection')
  }

  updateActiveBounds() {
    const tab = this.activeTab
    if (tab) this.updateBounds(tab.view)
  }

  setSidebarWidth(width: number) {
    this.sidebarWidth = width
    this.updateActiveBounds()
  }

  setExtraTop(height: number) {
    this.extraTop = height
    this.updateActiveBounds()
  }

  getActiveWebContents(): Electron.WebContents | null {
    return this.activeTab?.view.webContents ?? null
  }

  private get activeTab(): Tab | undefined {
    return this.activeId != null ? this.tabs.get(this.activeId) : undefined
  }

  private updateBounds(view: WebContentsView) {
    const { width, height } = this.win.getContentBounds()
    const top = CHROME_HEIGHT + this.extraTop
    view.setBounds({
      x: 0,
      y: top,
      width: Math.max(0, width - this.sidebarWidth),
      height: Math.max(0, height - top),
    })
  }

  private pushState() {
    if (!this.rendererReady) return
    const tabs = [...this.tabs.values()].map(t => t.state)
    this.win.webContents.send('tabs:state', tabs, this.activeId)
  }

  setAiVisible(id: number, visible: boolean) {
    const tab = this.tabs.get(id)
    if (!tab) return
    tab.state.aiVisible = visible
    this.pushState()
  }

  getAiVisible(id: number): boolean {
    return this.tabs.get(id)?.state.aiVisible ?? true
  }

  renameTab(id: number, title: string | undefined) {
    const tab = this.tabs.get(id)
    if (!tab) return
    tab.state.customTitle = title
    this.pushState()
  }

  getAllStates(): { id: number; title: string; url: string; favicon: string; customTitle?: string }[] {
    return [...this.tabs.values()].map(t => ({
      id: t.state.id,
      title: t.state.title,
      url: t.state.url,
      favicon: t.state.favicon,
      customTitle: t.state.customTitle,
    }))
  }

  getInitialState() {
    return {
      tabs: [...this.tabs.values()].map(t => t.state),
      activeId: this.activeId,
    }
  }
}
