import { WebContentsView, BrowserWindow } from 'electron'
import type { TabState } from '../shared/types'

export type { TabState }
export let CHROME_HEIGHT = 82

interface Tab {
  view: WebContentsView
  state: TabState
}

interface ClosedTab {
  url: string
  title: string
  favicon: string
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
  private bookmarkBarVisible = false
  private onPageLoadCb?: (id: number, url: string, title: string, favicon: string, wc: Electron.WebContents) => void
  private recentlyClosed: ClosedTab[] = []

  constructor(win: BrowserWindow, partition?: string) {
    this.win = win
    this.partition = partition
  }

  setPageLoadCallback(cb: (id: number, url: string, title: string, favicon: string, wc: Electron.WebContents) => void) {
    this.onPageLoadCb = cb
  }

  get activeTabId(): number | null {
    return this.activeId
  }

  setRendererReady() {
    this.rendererReady = true
    this.pushState()
  }

  create(url?: string): number {
    const id = this.nextId++
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        ...(this.partition ? { partition: this.partition } : {}),
      }
    })

    const isNewTab = !url
    const loadUrl = url ?? 'about:blank'

    const state: TabState = {
      id,
      title: 'New Tab',
      url: loadUrl,
      favicon: '',
      isLoading: !isNewTab,
      canGoBack: false,
      canGoForward: false,
      aiVisible: true,
      customTitle: undefined,
      pinned: false,
      locked: false,
      muted: false,
      audioPlaying: false,
      isNewTab,
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
      if (navUrl !== 'about:blank') state.isNewTab = false
      state.canGoBack = wc.canGoBack()
      state.canGoForward = wc.canGoForward()
      this.pushState()
    })

    wc.on('did-navigate-in-page', (_, navUrl) => {
      state.url = navUrl
      if (navUrl !== 'about:blank') state.isNewTab = false
      state.canGoBack = wc.canGoBack()
      state.canGoForward = wc.canGoForward()
      this.pushState()
    })

    wc.on('did-start-loading', () => {
      if (!state.isNewTab) state.isLoading = true
      this.pushState()
    })

    wc.on('did-stop-loading', () => {
      state.isLoading = false
      state.canGoBack = wc.canGoBack()
      state.canGoForward = wc.canGoForward()
      this.pushState()
      this.onPageLoadCb?.(id, state.url, state.title, state.favicon, wc)
    })

    wc.on('found-in-page', (_, result) => {
      this.win.webContents.send('find:result', {
        active: result.activeMatchOrdinal,
        total: result.matches,
      })
    })

    // Audio state detection
    try {
      (wc as Electron.WebContents & { on(event: 'audio-state-changed', listener: (event: Electron.Event, audible: boolean) => void): this }).on('audio-state-changed' as 'did-start-loading', () => {
        state.audioPlaying = wc.isCurrentlyAudible()
        this.pushState()
      })
    } catch {}

    view.setVisible(false)
    if (!isNewTab) wc.loadURL(loadUrl)
    this.switchTo(id)
    return id
  }

  close(id: number) {
    const tab = this.tabs.get(id)
    if (!tab) return

    // If locked, don't close
    if (tab.state.locked) return

    // Record in recently closed
    this.recentlyClosed.push({
      url: tab.state.url,
      title: tab.state.customTitle ?? tab.state.title,
      favicon: tab.state.favicon,
    })
    if (this.recentlyClosed.length > 20) this.recentlyClosed.shift()

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

    for (const [tabId, { view, state }] of this.tabs) {
      if (tabId === id) {
        if (state.isNewTab) {
          view.setVisible(false)
          view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
        } else {
          view.setVisible(true)
          this.updateBounds(view)
        }
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
    if (!tab) return
    tab.state.isNewTab = false
    tab.view.webContents.loadURL(url)
    tab.view.setVisible(true)
    this.updateBounds(tab.view)
    this.pushState()
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

  setBookmarkBarVisible(visible: boolean) {
    this.bookmarkBarVisible = visible
    this.updateActiveBounds()
  }

  getActiveWebContents(): Electron.WebContents | null {
    return this.activeTab?.view.webContents ?? null
  }

  pinTab(id: number, pinned: boolean) {
    const tab = this.tabs.get(id)
    if (!tab) return
    tab.state.pinned = pinned
    this.pushState()
  }

  lockTab(id: number, locked: boolean) {
    const tab = this.tabs.get(id)
    if (!tab) return
    tab.state.locked = locked
    this.pushState()
  }

  muteTab(id: number, muted: boolean) {
    const tab = this.tabs.get(id)
    if (!tab) return
    tab.state.muted = muted
    tab.view.webContents.setAudioMuted(muted)
    this.pushState()
  }

  duplicateTab(id: number) {
    const tab = this.tabs.get(id)
    if (!tab) return
    this.create(tab.state.url)
  }

  closeToRight(id: number) {
    const ids = [...this.tabs.keys()]
    const idx = ids.indexOf(id)
    if (idx === -1) return
    const toClose = ids.slice(idx + 1)
    for (const cid of toClose) {
      const tab = this.tabs.get(cid)
      if (tab && !tab.state.locked) this.close(cid)
    }
  }

  closeOthers(id: number) {
    const ids = [...this.tabs.keys()]
    for (const cid of ids) {
      if (cid !== id) {
        const tab = this.tabs.get(cid)
        if (tab && !tab.state.locked) this.close(cid)
      }
    }
  }

  getRecentlyClosed(): ClosedTab[] {
    return [...this.recentlyClosed].reverse()
  }

  reopenLastClosed() {
    const last = this.recentlyClosed.pop()
    if (last && last.url.startsWith('http')) {
      this.create(last.url)
    }
  }

  private get activeTab(): Tab | undefined {
    return this.activeId != null ? this.tabs.get(this.activeId) : undefined
  }

  private updateBounds(view: WebContentsView) {
    const { width, height } = this.win.getContentBounds()
    const bookmarkBarH = this.bookmarkBarVisible ? 32 : 0
    const top = CHROME_HEIGHT + bookmarkBarH + this.extraTop
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

  getAllStates(): { id: number; title: string; url: string; favicon: string; customTitle?: string; pinned?: boolean }[] {
    return [...this.tabs.values()].map(t => ({
      id: t.state.id,
      title: t.state.title,
      url: t.state.url,
      favicon: t.state.favicon,
      customTitle: t.state.customTitle,
      pinned: t.state.pinned,
    }))
  }

  getInitialState() {
    return {
      tabs: [...this.tabs.values()].map(t => t.state),
      activeId: this.activeId,
    }
  }
}
